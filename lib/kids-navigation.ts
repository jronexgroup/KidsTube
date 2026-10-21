import { createContentPolicy, type ContentPolicy, type PolicyDecision } from './content-policy'
import { getApprovedContentSnapshot } from '@/states/approved-content'
import { settings$ } from '@/states/settings'
import { isParentUnlocked } from '@/states/parent-gate'

/**
 * The one place in the app that decides whether a url may be opened.
 *
 * Every route into the player goes through here: the child tapping a video,
 * a shared link, a deep link, the queue, a bookmark, the player's own next
 * button. A route that is not checked here is a route that was forgotten.
 */

/**
 * The video the parent asked to look at. It is the one thing that may be
 * watched without being approved, and only while the parent gate is open.
 */
let previewVideoId = ''

/** Asks for a candidate to be watchable once, for the parent to review it. */
export const requestPreview = (videoId: string) => {
  previewVideoId = videoId
}

/** Gives the preview up again. */
export const clearPreview = () => {
  previewVideoId = ''
}

export const getPreviewVideoId = () => previewVideoId

/** Whether the app is in the restricted KidsTube mode. */
export const isKidsMode = (): boolean => settings$.kidsMode.get() !== false

export const getKidsPolicy = (): ContentPolicy => createContentPolicy(getApprovedContentSnapshot())

/**
 * The ids that may be watched even though they are not approved. There is
 * only ever one, and only while a parent is looking at the screen.
 */
const getPreviewIds = (): Set<string> | undefined => {
  if (!previewVideoId || !isParentUnlocked()) {
    return undefined
  }
  return new Set([previewVideoId])
}

/** Decides a url against the policy. */
export const evaluateKidsUrl = (url: string): PolicyDecision => {
  if (!isKidsMode()) {
    return { allowed: true, reason: 'kids_mode_off' }
  }
  return getKidsPolicy().evaluateUrl(url, { previewVideoIds: getPreviewIds() })
}

/** Whether the url may be opened at all. */
export const isUrlAllowed = (url: string): boolean => evaluateKidsUrl(url).allowed

/** The watch url of an approved video. */
export const getWatchUrl = (videoId: string) => `https://m.youtube.com/watch?v=${videoId}`
