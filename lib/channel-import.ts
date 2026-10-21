import { XMLParser } from 'fast-xml-parser'
import { extractVideoId, isValidVideoId } from './content-policy'
import { fetchYouTubeChannelMetadata } from './youtube-channel'
import { mainClient } from './main-client'

/**
 * Pulling a channel's recent videos in, so a parent can review them one by
 * one.
 *
 * A channel is never approved as a whole: its videos arrive as candidates,
 * each one pending, so a later upload cannot slip in on the strength of an
 * old decision.
 */

export interface ChannelVideoCandidate {
  videoId: string
  title: string
}

export interface ChannelCandidateResult {
  channelId: string
  name: string
  videos: ChannelVideoCandidate[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

/**
 * Reads the video ids and titles out of a channel feed. A feed that cannot be
 * read yields nothing rather than something half understood.
 */
export function parseChannelFeed(xml: string): ChannelVideoCandidate[] {
  if (!xml) {
    return []
  }
  let data: any
  try {
    data = parser.parse(xml)
  } catch {
    return []
  }

  const entries = data?.feed?.entry
  if (!entries) {
    return []
  }

  const list = Array.isArray(entries) ? entries : [entries]
  const videos: ChannelVideoCandidate[] = []
  const seen = new Set<string>()

  for (const entry of list) {
    const href = entry?.link?.href || entry?.link || ''
    const videoId = extractVideoId(typeof href === 'string' ? href : '')
    if (!isValidVideoId(videoId) || seen.has(videoId)) {
      continue
    }
    seen.add(videoId)
    const title = typeof entry?.title === 'string' ? entry.title : entry?.title?.['#text'] || ''
    videos.push({ videoId, title })
  }

  return videos
}

/**
 * Fetches the channel's recent videos. The feed goes through the app's own
 * client so that the configured proxy is honoured.
 */
export async function fetchChannelCandidates(url: string): Promise<ChannelCandidateResult> {
  const metadata = await fetchYouTubeChannelMetadata(url)
  const channelId = metadata.id || ''
  const name = metadata.title || ''

  if (!channelId) {
    return { channelId, name, videos: [] }
  }

  const response = await mainClient.fetchFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)
  if (!response.ok || !response.body) {
    return { channelId, name, videos: [] }
  }

  return { channelId, name, videos: parseChannelFeed(response.body) }
}
