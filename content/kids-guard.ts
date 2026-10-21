import { createContentPolicy, type ApprovedContentSnapshot, type ContentPolicy } from '../lib/content-policy'
import { emit } from './utils'

/**
 * The page level guard.
 *
 * The response filter removes unapproved videos before they render and the
 * native view refuses to load a disallowed url, but the page itself can still
 * try to go somewhere: a link in a description, the player's own next button,
 * a push into the history. This layer refuses those attempts.
 *
 * It is the third of three independent layers, so a change in YouTube's markup
 * that defeats one of them does not open the door on its own.
 */

const emptySnapshot = (): ApprovedContentSnapshot => ({ schemaVersion: 1, records: [] })

let policy: ContentPolicy = createContentPolicy(emptySnapshot())

/** Whether the page is in the restricted KidsTube mode. */
export function isKidsMode(): boolean {
  return window.NouTube?.getSettings?.()?.kidsMode !== false
}

function getPolicy(): ContentPolicy {
  const snapshot = window.NouTube?.getApprovedContent?.() || emptySnapshot()
  const built = createContentPolicy(snapshot)
  // Rebuilding on every call would be wasteful, but the library changes only
  // when a parent approves something, so the set is kept and rebuilt then.
  if (built.approvedVideoIds.size !== policy.approvedVideoIds.size) {
    policy = built
  }
  return policy
}

export function refreshApprovedContent() {
  policy = createContentPolicy(window.NouTube?.getApprovedContent?.() || emptySnapshot())
}

/**
 * Whether the page may go to this url. Anything that is not an approved
 * video is refused.
 */
export function isAllowedUrl(url: string): boolean {
  if (!isKidsMode()) {
    return true
  }
  return getPolicy().evaluateUrl(url).allowed
}

const reportBlocked = (url: string, reason: string) => {
  emit('kids-blocked', { url, reason })
}

/* The panels of the watch page that lead out of the approved library. The
 * response filter already empties them, but the page renders some of them
 * from its own state, so they are taken out of the DOM as well. */
const WATCH_PANEL_SELECTORS = [
  // The "up next" and the related videos.
  'ytd-watch-next-secondary-results-renderer',
  'ytd-item-section-renderer[target-id="related"]',
  'ytd-item-section-renderer[target-id="watch-next-secondary-results"]',
  '#related',
  '#items.ytd-watch-next-secondary-results-renderer',
  // The comments.
  'ytd-item-section-renderer[target-id="comments-section"]',
  '#comments',
  'ytd-comments',
  // The end screen that offers the next video.
  'yt-endscreen-content',
  '.ytp-endscreen-content',
  // The autoplay switch.
  '.ytp-autonav-toggle-button',
  'ytm-autonav-toggle-button',
]

const PANEL_STYLE_ID = '_nou_kids_panels_css'

function ensurePanelStyle() {
  if (document.getElementById(PANEL_STYLE_ID)) {
    return
  }
  const style = document.createElement('style')
  style.id = PANEL_STYLE_ID
  style.textContent = `${WATCH_PANEL_SELECTORS.join(',\n')}{display:none!important;}`
  ;(document.head || document.documentElement).appendChild(style)
}

function removePanels(root: ParentNode = document) {
  for (const selector of WATCH_PANEL_SELECTORS) {
    root.querySelectorAll?.(selector).forEach((node) => node.remove())
  }
}

/**
 * Refuses a navigation to a url the policy does not allow.
 * Returns true when the navigation may go ahead.
 */
function allowNavigation(url: string, source: string): boolean {
  if (!isKidsMode()) {
    return true
  }
  const resolved = resolveUrl(url)
  if (!resolved) {
    reportBlocked(url, 'unknown_route')
    return false
  }
  const decision = getPolicy().evaluateUrl(resolved)
  if (decision.allowed) {
    return true
  }
  reportBlocked(resolved, decision.reason)
  return false
}

function resolveUrl(url: unknown): string {
  if (typeof url !== 'string' || !url) {
    return ''
  }
  try {
    return new URL(url, location.href).href
  } catch {
    return ''
  }
}

/**
 * Keeps the page from growing a history it can walk back into. In kids mode
 * a push becomes a replace, so the back button leaves the video instead of
 * stepping back to whatever was on screen before it.
 */
function installHistoryGuard() {
  const root = window as Window & typeof globalThis & { __noutubeKidsHistoryInit?: boolean }
  if (root.__noutubeKidsHistoryInit) {
    return
  }
  root.__noutubeKidsHistoryInit = true

  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = function (this: History, ...args: any[]) {
    if (!allowNavigation(args[2], 'pushState')) {
      return
    }
    if (!isKidsMode()) {
      return originalPushState.apply(this, args as any)
    }
    // No new history entry: the child cannot walk back into a page that is
    // not an approved video.
    return originalReplaceState.apply(this, args as any)
  } as any

  history.replaceState = function (this: History, ...args: any[]) {
    if (!allowNavigation(args[2], 'replaceState')) {
      return
    }
    return originalReplaceState.apply(this, args as any)
  } as any

  window.addEventListener('popstate', () => {
    if (!isKidsMode()) {
      return
    }
    if (!isAllowedUrl(location.href)) {
      // The entry we came back to is not allowed, so there is nowhere safe to
      // go but the video itself.
      const allowed = getPolicy().approvedVideoIds
      const current = new URL(location.href).searchParams.get('v')
      if (current && allowed.has(current)) {
        return
      }
      reportBlocked(location.href, 'back')
    }
  })
}

/** Refuses a tap on a link that leads out of the approved library. */
function installClickGuard() {
  document.addEventListener(
    'click',
    (event) => {
      if (!isKidsMode()) {
        return
      }
      const target = event.target as Element | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link) {
        return
      }
      const href = link.getAttribute('href') || ''
      // A fragment on the same page is not a navigation.
      if (!href || href.startsWith('#')) {
        return
      }
      const resolved = resolveUrl(href)
      if (!resolved || resolved.startsWith('javascript:')) {
        return
      }
      if (isAllowedUrl(resolved)) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      reportBlocked(resolved, 'link')
    },
    true,
  )
}

/** Refuses a new window that would open something else. */
function installWindowOpenGuard() {
  const originalOpen = window.open
  window.open = function (url?: string | URL, ...rest: any[]) {
    if (isKidsMode()) {
      const resolved = resolveUrl(url?.toString() ?? '')
      if (!resolved || !isAllowedUrl(resolved)) {
        reportBlocked(resolved, 'window.open')
        return null
      }
    }
    return originalOpen.call(window, url as any, ...(rest as any[]))
  } as typeof window.open
}

/** Refuses the search box and any other form that would browse. */
function installFormGuard() {
  document.addEventListener(
    'submit',
    (event) => {
      if (!isKidsMode()) {
        return
      }
      const form = event.target as HTMLFormElement | null
      const action = resolveUrl(form?.getAttribute('action') || '')
      if (!action || !isAllowedUrl(action)) {
        event.preventDefault()
        event.stopPropagation()
        reportBlocked(action, 'form')
      }
    },
    true,
  )
}

/**
 * Stops the player from rolling straight into the next video. YouTube plays
 * the next one by itself, and the next one is not approved.
 */
function installAutoplayGuard() {
  const root = window as Window & typeof globalThis & { __noutubeKidsAutoplayInit?: boolean }
  if (root.__noutubeKidsAutoplayInit) {
    return
  }
  root.__noutubeKidsAutoplayInit = true

  const stopAutoplay = () => {
    if (!isKidsMode()) {
      return
    }
    const player = document.getElementById('movie_player') as any
    if (!player) {
      return
    }
    // The player's own switch, when the page has one.
    try {
      player.setAutoplay?.('off')
    } catch {}
    const config = (window as any).ytplayer?.config
    if (config) {
      config.args = { ...(config.args || {}), autoplay: '0' }
    }
  }

  const player = document.getElementById('movie_player')
  player?.addEventListener?.('ended', () => {
    if (!isKidsMode()) {
      return
    }
    // The end of an approved video is the end of the session for it, so the
    // player is stopped rather than carried into the next one.
    const media = document.getElementById('movie_player') as any
    media?.pauseVideo?.()
  })

  stopAutoplay()
  document.addEventListener('yt-navigate-finish', stopAutoplay)
  window.addEventListener('load', stopAutoplay)
}

/** Takes the panels that lead out of the library out of the page. */
function installWatchCleanup() {
  const root = window as Window & typeof globalThis & { __noutubeKidsCleanupInit?: boolean }
  if (root.__noutubeKidsCleanupInit) {
    return
  }
  root.__noutubeKidsCleanupInit = true

  ensurePanelStyle()
  removePanels()

  const observer = new MutationObserver(() => {
    if (!isKidsMode()) {
      return
    }
    removePanels()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}

export function installKidsGuard() {
  if (!isKidsMode()) {
    return
  }
  refreshApprovedContent()
  installHistoryGuard()
  installClickGuard()
  installWindowOpenGuard()
  installFormGuard()
  installAutoplayGuard()
  installWatchCleanup()
}
