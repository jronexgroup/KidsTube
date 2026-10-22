import {
  blocklistChannelsMatch,
  blocklistTextMatches,
  blocklistTextsMatch,
  normalizeBlocklist,
  type BlocklistSnapshot,
} from './blocklist'

const keys = ['adBreakHeartbeatParams', 'adPlacements', 'adSlots', 'playerAds']

export const RE_INTERCEPT = new RegExp('^/youtubei/v1/(browse|get_watch|next|player|reel|search)')

interface TransformOptions {
  hideShorts?: boolean
  showOriginalVideoTitle?: boolean
  // Ad blocking is a separate choice from background playback: a user can keep
  // the intercept running and still let ads through to support creators.
  blockAds?: boolean
  /**
   * The ids of the videos a parent has approved. When this is a set, the
   * response is filtered down to it: every video that is not in the set is
   * removed before the page ever renders it.
   */
  approvedVideoIds?: Set<string>
}

const blocksAds = (options: TransformOptions) => options.blockAds !== false

/** Whether the allowlist filter is in force. */
const filtersByAllowlist = (options: TransformOptions) =>
  options.approvedVideoIds instanceof Set

export function transformGetWatchResponse(
  text: string,
  blocklist?: BlocklistSnapshot,
  options: TransformOptions = {},
) {
  const data = JSON.parse(text)
  if (blocksAds(options)) {
    stripAdKeys(data[0].playerResponse)
  }
  applyPlayerResponseOriginalTitle(data[0].playerResponse, options)
  rewriteOriginalTitles(data, options)
  // The watch response carries the "up next" list and the channel panel, so
  // it has to be filtered as well.
  filterListResponse(data, blocklist, options)
  return JSON.stringify(data)
}

function stripAdKeys(data: any) {
  keys.forEach((key) => delete data[key])
  return data
}

export function transformPlayerResponse(text: string, _blocklist?: BlocklistSnapshot, options: TransformOptions = {}) {
  const data = JSON.parse(text)
  if (blocksAds(options)) {
    stripAdKeys(data)
  }
  applyPlayerResponseOriginalTitle(data, options)
  rewriteOriginalTitles(data, options)
  return JSON.stringify(data)
}

export function transformSearchResponse(text: string, blocklist?: BlocklistSnapshot, options: TransformOptions = {}) {
  const data = JSON.parse(text) as SearchResponse
  const hideShorts = options.hideShorts !== false
  rewriteOriginalTitles(data, options)
  const sectionListRenderer =
    // mobile
    data.contents?.sectionListRenderer ||
    // desktop
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents.sectionListRenderer
  const itemSectionRenderer =
    sectionListRenderer?.contents[0].itemSectionRenderer ||
    data.onResponseReceivedCommands?.[0].appendContinuationItemsAction?.continuationItems?.[0].itemSectionRenderer

  if (itemSectionRenderer) {
    itemSectionRenderer.contents = itemSectionRenderer.contents
      .map((x) => transformSectionListItem(x, blocklist, hideShorts))
      .filter(Boolean) as any
  }
  filterListResponse(data, blocklist, options)
  return JSON.stringify(data)
}

export function transformBrowseResponse(
  text: string,
  blocklist?: BlocklistSnapshot,
  options: TransformOptions = {},
) {
  const data = JSON.parse(text)
  rewriteOriginalTitles(data, options)
  filterListResponse(data, blocklist, options)
  return JSON.stringify(data)
}

// The Shorts feed: reel/reel_watch_sequence lists the upcoming shorts (ads are
// entries of their own), reel/reel_item_watch describes a single one.
export function transformReelResponse(text: string, blocklist?: BlocklistSnapshot, options: TransformOptions = {}) {
  const data = JSON.parse(text)
  if (blocksAds(options) && data?.playerResponse && typeof data.playerResponse === 'object') {
    stripAdKeys(data.playerResponse)
  }
  rewriteOriginalTitles(data, options)
  filterListResponse(data, blocklist, options)
  return JSON.stringify(data)
}

function transformSectionListItem(item: SectionListItem, blocklist: BlocklistSnapshot | undefined, hideShorts: boolean) {
  const { videoWithContextRenderer, gridShelfViewModel } = item
  if (
    hideShorts &&
    (gridShelfViewModel ||
      videoWithContextRenderer?.navigationEndpoint.commandMetadata.webCommandMetadata.url.startsWith('/shorts'))
  ) {
    return undefined
  }
  if (itemMatchesBlocklist(item, blocklist)) {
    return undefined
  }
  return item
}

export function filterListResponse(
  data: any,
  blocklist?: BlocklistSnapshot,
  options: TransformOptions = {},
  isRoot = true,
) {
  if (!data || typeof data !== 'object') {
    return
  }

  const dropAds = blocksAds(options)
  const allowlist = filtersByAllowlist(options) ? options.approvedVideoIds! : undefined
  for (const key of Object.keys(data)) {
    const value = data[key]
    if (Array.isArray(value)) {
      data[key] = value.filter(
        (item) =>
          !(dropAds && isAdItem(item)) &&
          !itemMatchesBlocklist(item, blocklist) &&
          !itemFailsAllowlist(item, allowlist),
      )
      data[key].forEach((item: any) => filterListResponse(item, blocklist, options, false))
    } else if (value && typeof value === 'object') {
      filterListResponse(value, blocklist, options, false)
    }
  }

  // What the list filter cannot see: the video the player is about to roll
  // into, the video the page is about to fetch, and any leftover mention of a
  // video nobody approved.
  //
  // It runs once, on the whole response, rather than on every level of the
  // walk: a scrub that ran bottom up would take the id out of an endpoint
  // before the level above could take the endpoint itself away.
  if (allowlist && isRoot) {
    scrubKidsData(data, allowlist)
  }
}

/**
 * Renderers that lead somewhere the child is not allowed to go. They carry no
 * video of their own, so the allowlist cannot rule them out on the video id
 * alone.
 */
const DISALLOWED_RENDERER_KEYS = [
  // A shelf of Shorts, which is what the mobile site uses for a shelf of
  // anything that is mixed between videos and Shorts.
  'gridShelfViewModel',
  // Playlists and radio mixes are lists of videos that are not approved.
  'playlistRenderer',
  'compactPlaylistRenderer',
  'gridPlaylistRenderer',
  'radioRenderer',
  // Channel links lead to a page full of uploads that were never reviewed.
  'channelRenderer',
  'gridChannelRenderer',
  'compactChannelRenderer',
  'newChannelRenderer',
  // Live chat is not a place for a child to be.
  'liveChatRenderer',
  'liveChatContinuation',
  // A Short is never allowed, even in the unlikely case that its id somehow
  // ends up in the allowlist.
  'reelItemRenderer',
]

/**
 * The parts of a response that name the video the player is going to play
 * next, or that the page is about to fetch.
 *
 * These are not list items, so the allowlist filter never sees them, but they
 * are the most direct route to an unapproved video: the autoplay set is
 * exactly what the player rolls into when the current video ends, and the
 * prefetch data is what the page pulls in behind the child's back. They are
 * taken out of the response whole.
 */
const AUTOPLAY_KEYS = [
  'autoplay',
  'autoplayVideo',
  'autoplaySet',
  'autoplayEndpoint',
  'autoplaySwitchButtonRenderer',
  'endscreen',
  'endscreenRenderer',
  'webPrefetchData',
  'prefetchData',
  'playerAutoplay',
]

/**
 * Takes the player's own choice of what to play next out of the response, and
 * takes out any leftover mention of a video nobody approved.
 *
 * The list items are handled by the allowlist filter, which drops them whole.
 * This handles what is left: a bare endpoint, a prefetch hint, an id in a
 * framework update. A response that mentions an unapproved video gives it up
 * either way.
 */
function scrubKidsData(node: any, approved: Set<string>): void {
  if (!node || typeof node !== 'object') {
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      scrubKidsData(item, approved)
    }
    return
  }

  for (const key of Object.keys(node)) {
    if (AUTOPLAY_KEYS.includes(key)) {
      delete node[key]
      continue
    }
    const value = node[key]
    if (!value || typeof value !== 'object') {
      continue
    }

    // A bare endpoint naming a video nobody approved.
    for (const endpointKey of ['watchEndpoint', 'reelWatchEndpoint']) {
      const endpoint = value[endpointKey]
      if (endpoint && typeof endpoint === 'object' && typeof endpoint.videoId === 'string') {
        if (!approved.has(endpoint.videoId)) {
          delete value[endpointKey]
        }
      }
    }

    // A leftover id on something that is not a list item.
    for (const idKey of ['videoId', 'contentId']) {
      const id = value[idKey]
      if (typeof id === 'string' && !approved.has(id)) {
        delete value[idKey]
      }
    }

    scrubKidsData(value, approved)
  }
}

/**
 * Whether a list item has to go because the allowlist does not cover it.
 *
 * An item that carries no video of its own is left alone: the allowlist is
 * about videos, and the renderers that lead nowhere watchable are dropped by
 * their own keys.
 */
function itemFailsAllowlist(item: any, approved?: Set<string>): boolean {
  if (!approved) {
    return false
  }
  if (!item || typeof item !== 'object') {
    return false
  }

  if (DISALLOWED_RENDERER_KEYS.some((key) => item[key])) {
    return true
  }

  const ids = getDirectRenderers(item)
    .map((renderer) => extractRendererVideoId(renderer))
    .filter((id): id is string => Boolean(id))

  // Nothing that names a video: not a video item, so not this filter's job.
  if (!ids.length) {
    return false
  }

  return ids.some((id) => !approved.has(id))
}

/**
 * The video id a renderer points at. YouTube moves this around between the
 * desktop and the mobile site, and between the older and the newer renderers,
 * so every place it is known to live is tried.
 */
function extractRendererVideoId(renderer: any): string {
  if (!renderer || typeof renderer !== 'object') {
    return ''
  }

  const candidates = [
    renderer.videoId,
    renderer.contentId,
    renderer.navigationEndpoint?.watchEndpoint?.videoId,
    renderer.navigationEndpoint?.reelWatchEndpoint?.videoId,
    renderer.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId,
    renderer.onTap?.innertubeCommand?.watchEndpoint?.videoId,
    renderer.rendererContext?.commandContext?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId,
    renderer.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId,
    renderer.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url,
  ]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate) {
      continue
    }
    if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) {
      return candidate
    }
    // A url such as /watch?v=<id> or /shorts/<id>.
    const match = candidate.match(/[?&]v=([A-Za-z0-9_-]{11})/) || candidate.match(/\/(?:shorts|v|embed|live)\/([A-Za-z0-9_-]{11})/)
    if (match) {
      return match[1]
    }
  }

  return ''
}

// Renderers that carry an ad/promo instead of real content. Dropping the whole
// list item (rather than hiding it with css) also removes the grid cell, which
// is what leaves a blank tile in the home feed.
const AD_RENDERER_KEYS = [
  'adSlotRenderer',
  'adsEngagementPanelRenderer',
  'bannerPromoRenderer',
  'brandVideoShelfRenderer',
  'brandVideoSingletonRenderer',
  'carouselAdRenderer',
  'compactPromotedItemRenderer',
  'compactPromotedVideoRenderer',
  'displayAdRenderer',
  'inFeedAdLayoutRenderer',
  'mealbarPromoRenderer',
  'primetimePromoRenderer',
  'promotedSparklesTextSearchRenderer',
  'promotedSparklesWebRenderer',
  'promotedVideoRenderer',
  'searchPyvRenderer',
  'statementBannerRenderer',
]

function isAdItem(item: any): boolean {
  if (!item || typeof item !== 'object') {
    return false
  }

  // An ad in the Shorts feed is a regular reel entry flagged as an ad.
  if (item.command?.reelWatchEndpoint?.adClientParams?.isAd) {
    return true
  }

  // Wrappers keep the ad one level down, e.g. richItemRenderer.content.adSlotRenderer.
  const candidates = [
    item,
    item.richItemRenderer?.content,
    item.richSectionRenderer?.content,
    item.itemSectionRenderer?.contents?.length === 1 ? item.itemSectionRenderer.contents[0] : undefined,
  ].filter(Boolean)

  return candidates.some((candidate) => AD_RENDERER_KEYS.some((key) => candidate[key]))
}

function itemMatchesBlocklist(item: any, blocklist?: BlocklistSnapshot) {
  const normalized = normalizeBlocklist(blocklist)
  if (!normalized.channels.length && !normalized.keywords.length) {
    return false
  }

  return getDirectRenderers(item).some((renderer) => rendererMatchesBlocklist(renderer, normalized))
}

function getDirectRenderers(item: any): any[] {
  if (!item || typeof item !== 'object') {
    return []
  }

  const renderers = [
    item.videoRenderer,
    item.compactVideoRenderer,
    item.gridVideoRenderer,
    item.videoWithContextRenderer,
    item.reelItemRenderer,
    item.lockupViewModel,
    item.richItemRenderer?.content?.videoRenderer,
    item.richItemRenderer?.content?.lockupViewModel,
  ].filter(Boolean)

  return renderers.length ? renderers : []
}

function rendererMatchesBlocklist(renderer: any, blocklist: BlocklistSnapshot) {
  const titleTexts = extractTitleTexts(renderer)
  const channelTexts = extractChannelTexts(renderer)

  return (
    blocklistTextsMatch(titleTexts, blocklist.keywords) ||
    blocklistChannelsMatch(channelTexts, blocklist.channels)
  )
}

function extractTitleTexts(renderer: any): string[] {
  return [
    textFromNode(renderer?.title),
    textFromNode(renderer?.headline),
    renderer?.metadata?.lockupMetadataViewModel?.title?.content,
  ].filter(Boolean)
}

function findBrowseEndpoints(
  node: any,
  results: { ids: Set<string>; urls: Set<string>; names: Set<string> } = {
    ids: new Set(),
    urls: new Set(),
    names: new Set(),
  },
) {
  if (!node || typeof node !== 'object') {
    return results
  }

  if (node.browseEndpoint) {
    const { browseId, canonicalBaseUrl } = node.browseEndpoint
    if (typeof browseId === 'string' && browseId) {
      results.ids.add(browseId)
    }
    if (typeof canonicalBaseUrl === 'string' && canonicalBaseUrl) {
      results.urls.add(canonicalBaseUrl)
    }
  }

  if (typeof node.text === 'string' && node.text && node.navigationEndpoint?.browseEndpoint) {
    results.names.add(node.text)
  }

  for (const key of Object.keys(node)) {
    findBrowseEndpoints(node[key], results)
  }

  return results
}

function extractChannelTexts(renderer: any): string[] {
  const endpoints = findBrowseEndpoints(renderer)
  const texts = [
    ...endpoints.names,
    ...endpoints.urls,
    ...endpoints.ids,
  ]

  if (texts.length === 0) {
    return [
      textFromNode(renderer?.ownerText),
      textFromNode(renderer?.shortBylineText),
      textFromNode(renderer?.longBylineText),
      textFromNode(renderer?.owner?.videoOwnerRenderer?.title),
      renderer?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
      renderer?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
      renderer?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
      renderer?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
      renderer?.metadata?.lockupMetadataViewModel?.metadata?.content,
      renderer?.contentMetadata?.runs?.map((run: any) => run?.text).join(' '),
    ].filter(Boolean)
  }

  return texts
}

function textFromNode(node: any): string {
  if (!node) {
    return ''
  }
  if (typeof node === 'string') {
    return node
  }
  if (typeof node.simpleText === 'string') {
    return node.simpleText
  }
  if (typeof node.content === 'string') {
    return node.content
  }
  if (Array.isArray(node.runs)) {
    return node.runs.map((run: any) => run?.text || '').join('')
  }
  return ''
}

function applyPlayerResponseOriginalTitle(data: any, options: TransformOptions) {
  if (!options.showOriginalVideoTitle) {
    return
  }

  const originalTitle = textFromNode(data?.videoDetails?.title)
  if (!originalTitle) {
    return
  }

  setTextNode(data?.microformat?.playerMicroformatRenderer?.title, originalTitle)
  setTextNode(data?.videoDetails?.title, originalTitle)
}

function rewriteOriginalTitles(data: any, options: TransformOptions) {
  if (!options.showOriginalVideoTitle || !data || typeof data !== 'object') {
    return
  }

  walk(data, (node) => {
    for (const renderer of getDirectRenderers(node)) {
      rewriteRendererTitle(renderer)
    }
    rewriteRendererTitle(node)
  })
}

function walk(node: any, visit: (node: any) => void) {
  if (!node || typeof node !== 'object') {
    return
  }

  visit(node)
  if (Array.isArray(node)) {
    node.forEach((item) => walk(item, visit))
    return
  }

  for (const key of Object.keys(node)) {
    walk(node[key], visit)
  }
}

function rewriteRendererTitle(renderer: any) {
  if (!renderer || typeof renderer !== 'object') {
    return
  }

  const originalTitle = getOriginalTitle(renderer)
  if (!originalTitle) {
    return
  }

  setTextNode(renderer.title, originalTitle)
  setTextNode(renderer.headline, originalTitle)
  setTextNode(renderer.metadata?.lockupMetadataViewModel?.title, originalTitle)
}

function getOriginalTitle(renderer: any): string {
  return [
    renderer.originalTitle,
    renderer.untranslatedTitle,
    renderer.untranslatedVideoTitle,
    renderer.title?.originalTitle,
    renderer.title?.untranslatedTitle,
    renderer.headline?.originalTitle,
    renderer.metadata?.lockupMetadataViewModel?.originalTitle,
    renderer.metadata?.lockupMetadataViewModel?.title?.originalTitle,
  ]
    .map(textFromNode)
    .find(Boolean) || ''
}

function setTextNode(node: any, text: string) {
  if (!node || typeof node !== 'object') {
    return
  }

  if (typeof node.simpleText === 'string') {
    node.simpleText = text
  }
  if (typeof node.content === 'string') {
    node.content = text
  }
  if (Array.isArray(node.runs) && node.runs.length) {
    node.runs.forEach((run: any, index: number) => {
      if (run && typeof run === 'object' && typeof run.text === 'string') {
        run.text = index === 0 ? text : ''
      }
    })
  }
}

interface SearchResponse {
  // 1st page
  contents?: {
    twoColumnSearchResultsRenderer?: {
      primaryContents: {
        sectionListRenderer?: {
          contents: SectionList[]
        }
      }
    }
    sectionListRenderer?: {
      contents: SectionList[]
    }
  }
  // 2nd page
  onResponseReceivedCommands?: {
    appendContinuationItemsAction?: {
      continuationItems?: SectionList[]
    }
  }[]
}

interface SectionList {
  itemSectionRenderer?: {
    contents: SectionListItem[]
  }
}

interface SectionListItem {
  videoWithContextRenderer?: {
    navigationEndpoint: {
      commandMetadata: {
        webCommandMetadata: {
          url: string
        }
      }
    }
  }
  gridShelfViewModel?: any
}
