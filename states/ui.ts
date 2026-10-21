import { event, observable } from '@legendapp/state'
import type { Folder } from './folders'
import type { Bookmark } from './bookmarks'
import { unnormalizeUrl } from '@/lib/url'
import { isAndroid, isWeb } from '@/lib/utils'
import { settings$ } from './settings'
import { mainClient } from '@/lib/main-client'
import { tabs$ } from './tabs'
import { evaluateKidsUrl, isKidsMode } from '@/lib/kids-navigation'

interface Store {
  url: string
  pageUrl: string

  // Split watch view (Android, opt-in): /watch runs in a second webview that
  // sits on top of the browsing one, so leaving a video keeps the feed exactly
  // where it was and playback survives the trip (see lib/split-view.ts).
  //
  // playerMode is how that second webview is presented: covering the app,
  // shrunk into the corner as the mini player, or out of the way entirely. It
  // is the same live page in all three, so switching never reloads anything.
  playerUrl: string
  playerMode: 'full' | 'mini' | 'hidden'
  browsePageUrl: string
  playerPageUrl: string

  // header
  headerHeight: number
  headerShown: boolean

  // Android Picture-in-Picture: the app chrome steps aside while the system
  // pins the window to the video (see lib/picture-in-picture.ts).
  pictureInPicture: boolean

  // desktop mode: whether Android runs us on a desktop-class screen, plus the
  // manual desktop-site choice made while it lasts. Both are session state --
  // leaving desktop mode clears the override and the persisted settings apply
  // again.
  systemDesktopMode: boolean
  desktopModeOverride: boolean | undefined

  // modals
  bookmarkModalBookmark: Bookmark | undefined
  bookmarkModalMode: 'default' | 'feed'
  moveBookmarkModalBookmark: Bookmark | undefined
  embedVideoId: string
  feedModalOpen: boolean
  folderModalFolder: Folder | undefined
  historyModalOpen: boolean
  libraryModalOpen: boolean
  libraryModalTab: string
  queueModalOpen: boolean
  settingsModalOpen: boolean
  sleepTimerModalOpen: boolean
  playbackSpeedModalOpen: boolean
  playbackQualityModalOpen: boolean
  urlModalOpen: boolean
  urlModalUrl: string
  cookieModalOpen: boolean
  // Session only: the sign-in banner comes back on the next launch.
  googleLoginNoticeDismissed: boolean
  userAgentModalOpen: boolean
  toolsModalOpen: boolean
  toolsModalUrl: string
  shareModalUrls: { pageUrl: string; videoUrl: string } | null

  translation: {
    id: string
    text: string
    targetLanguage: string
    x: number
    y: number
  } | null

  // KidsTube: whether the curated library is on screen over the webview, and
  // the last url the policy refused, so the app can say why.
  kidsHomeVisible: boolean
  blockedUrl: string
  blockedReason: string

  // The parent area: the gate in front of it and the area itself.
  parentGateOpen: boolean
  parentLibraryOpen: boolean

  // webview
  webview: any
}

export const ui$ = observable<Store>({
  url: '',
  pageUrl: '',

  playerUrl: '',
  playerMode: 'hidden',
  browsePageUrl: '',
  playerPageUrl: '',

  // header
  headerHeight: 0,
  headerShown: true,

  pictureInPicture: false,

  systemDesktopMode: false,
  desktopModeOverride: undefined,

  // modals
  bookmarkModalBookmark: undefined,
  bookmarkModalMode: 'default',
  moveBookmarkModalBookmark: undefined,
  embedVideoId: '',
  feedModalOpen: false,
  folderModalFolder: undefined,
  historyModalOpen: false,
  libraryModalOpen: false,
  libraryModalTab: '',
  queueModalOpen: false,
  settingsModalOpen: false,
  sleepTimerModalOpen: false,
  playbackSpeedModalOpen: false,
  playbackQualityModalOpen: false,
  urlModalOpen: false,
  urlModalUrl: '',
  cookieModalOpen: false,
  googleLoginNoticeDismissed: false,
  userAgentModalOpen: false,
  toolsModalOpen: false,
  toolsModalUrl: '',
  shareModalUrls: null,

  translation: null,

  // KidsTube
  kidsHomeVisible: true,
  blockedUrl: '',
  blockedReason: '',

  // The parent area
  parentGateOpen: false,
  parentLibraryOpen: false,

  // webview
  webview: undefined,
})

/**
 * Records that the policy refused a url and sends the child back to the
 * library. Nothing outside the approved list is ever loaded.
 */
export function blockUrl(url: string, reason: string) {
  ui$.blockedUrl.set(url)
  ui$.blockedReason.set(reason)
  if (isKidsMode()) {
    ui$.kidsHomeVisible.set(true)
  }
}

export function updateUrl(url: string) {
  // The policy is checked before anything else, so no route can reach the
  // webview without passing it.
  if (!isKidsMode()) {
    // The unrestricted mode keeps the old behaviour.
  } else {
    const decision = evaluateKidsUrl(url)
    if (!decision.allowed) {
      blockUrl(url, decision.reason)
      return
    }
  }

  if (isWeb) {
    const webview = ui$.webview.get()
    webview?.executeJavaScript?.('NouTube.pause()')
    tabs$.updateTabUrl(unnormalizeUrl(url))
    return
  }

  const webview = ui$.webview.get()
  // In the split watch view the player is its own webview, so a page opened
  // here never replaces what is playing -- pausing it would be a surprise.
  if (!(isAndroid && settings$.miniPlayer.get())) {
    // workaround for beforeunload https://github.com/electron/electron/issues/43314#issuecomment-2399072938
    webview?.executeJavaScript('NouTube.pause()')
  }
  ui$.url.set('')
  ui$.url.set(unnormalizeUrl(url))
}

export const onClearData$ = event()

onClearData$.on(async () => {
  const webview = ui$.webview.get()
  if (!webview) {
    return
  }
  if (isWeb) {
    mainClient.clearData()
    webview.executeJavaScript('document.location.reload()')
  } else {
    webview.clearData()
  }
})
