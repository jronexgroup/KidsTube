import { describe, expect, it } from 'bun:test'
import { filterListResponse, transformGetWatchResponse } from './intercept'

/**
 * The allowlist filter, checked against the shape YouTube really sends.
 *
 * The fixtures below are trimmed from real InnerTube responses, because the
 * places a video can hide in are not the ones a hand written example would
 * think of. The autoplay set in particular is the one that matters most: it
 * is not a list item, so a filter that only looks at list items lets it
 * through, and it is exactly what the player rolls into when a video ends.
 */

const APPROVED = 'dQw4w9WgXcQ'
const UNAPPROVED = 'aaaaaaaaaaa'
const approved = new Set([APPROVED])

const filter = (data: any) => {
  const copy = JSON.parse(JSON.stringify(data))
  filterListResponse(copy, undefined, { blockAds: true, approvedVideoIds: approved })
  return copy
}

const collectIds = (node: any, out: Set<string> = new Set()): Set<string> => {
  if (!node || typeof node !== 'object') {
    return out
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectIds(item, out))
    return out
  }
  const id = node.videoId || node.contentId
  if (typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)) {
    out.add(id)
  }
  for (const key of Object.keys(node)) {
    collectIds(node[key], out)
  }
  return out
}

describe('kids filter: the up next list', () => {
  const upNext = {
    contents: {
      twoColumnWatchNextResults: {
        results: {
          results: {
            contents: [
              {
                compactVideoRenderer: {
                  videoId: UNAPPROVED,
                  title: { simpleText: 'A video nobody approved' },
                },
              },
              {
                compactVideoRenderer: {
                  videoId: APPROVED,
                  title: { simpleText: 'The approved video' },
                },
              },
            ],
          },
        },
      },
    },
  }

  it('drops the videos that are not approved', () => {
    const result = filter(upNext)
    const ids = collectIds(result)
    expect(ids.has(UNAPPROVED)).toBe(false)
    expect(ids.has(APPROVED)).toBe(true)
  })
})

describe('kids filter: the autoplay set', () => {
  // The shape a real "next" response has. The autoplay set names the video
  // the player is going to roll into, and it is not a list item.
  const withAutoplay = {
    contents: {
      twoColumnWatchNextResults: {
        autoplay: {
          autoplay: {
            sets: [
              {
                autoplayVideo: {
                  watchEndpoint: { videoId: UNAPPROVED, viewCountText: { simpleText: '1' } },
                },
              },
            ],
          },
        },
        results: { results: { contents: [] } },
      },
    },
  }

  it('takes the autoplay set out of the response', () => {
    const result = filter(withAutoplay)
    expect(JSON.stringify(result)).not.toContain('autoplayVideo')
    expect(collectIds(result).has(UNAPPROVED)).toBe(false)
  })

  it('takes the prefetch hints out of the response', () => {
    const withPrefetch = {
      responseContext: {
        webResponseContextExtensionData: {
          webPrefetchData: {
            navigationEndpoints: [{ watchEndpoint: { videoId: UNAPPROVED } }],
          },
        },
      },
    }
    const result = filter(withPrefetch)
    expect(JSON.stringify(result)).not.toContain('webPrefetchData')
    expect(collectIds(result).has(UNAPPROVED)).toBe(false)
  })
})

describe('kids filter: what is left over', () => {
  it('takes a bare endpoint naming an unapproved video away', () => {
    const response = {
      something: {
        watchEndpoint: { videoId: UNAPPROVED, playerParams: 'x' },
      },
    }
    const result = filter(response)
    expect(result.something.watchEndpoint).toBeUndefined()
  })

  it('keeps a bare endpoint naming an approved video', () => {
    const response = {
      something: {
        watchEndpoint: { videoId: APPROVED, playerParams: 'x' },
      },
    }
    const result = filter(response)
    expect(result.something.watchEndpoint.videoId).toBe(APPROVED)
  })

  it('takes an unapproved id out of a framework update', () => {
    const response = {
      frameworkUpdates: {
        entityBatchUpdate: {
          mutations: [{ payload: { videoId: UNAPPROVED, title: 'x' } }],
        },
      },
    }
    const result = filter(response)
    expect(result.frameworkUpdates.entityBatchUpdate.mutations[0].payload.videoId).toBeUndefined()
  })
})

describe('kids filter: the surfaces that lead nowhere', () => {
  it('drops the playlists, the channels and the Shorts shelves', () => {
    const response = {
      items: [
        { playlistRenderer: { playlistId: 'PL1' } },
        { channelRenderer: { channelId: 'UC1' } },
        { gridShelfViewModel: { title: 'Shorts' } },
        { liveChatRenderer: { continuation: 'x' } },
        { videoRenderer: { videoId: APPROVED } },
      ],
    }
    const result = filter(response)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].videoRenderer.videoId).toBe(APPROVED)
  })

  it('drops a Short even when it is in the approved list', () => {
    const result = filter({ items: [{ reelItemRenderer: { videoId: APPROVED } }] })
    expect(result.items).toHaveLength(0)
  })
})

describe('kids filter: the watch response', () => {
  it('filters the up next list of the watch response too', () => {
    const response = [
      {
        playerResponse: {
          videoDetails: { videoId: APPROVED, title: 'The approved video' },
        },
        contents: {
          twoColumnWatchNextResults: {
            results: {
              results: {
                contents: [{ compactVideoRenderer: { videoId: UNAPPROVED } }],
              },
            },
          },
        },
      },
    ]
    const result = JSON.parse(transformGetWatchResponse(JSON.stringify(response), undefined, { approvedVideoIds: approved }))
    const ids = collectIds(result)
    expect(ids.has(UNAPPROVED)).toBe(false)
    expect(ids.has(APPROVED)).toBe(true)
  })
})

describe('kids filter: when it is off', () => {
  it('leaves the response alone without an allowlist', () => {
    const response = { items: [{ videoRenderer: { videoId: UNAPPROVED } }] }
    const copy = JSON.parse(JSON.stringify(response))
    filterListResponse(copy, undefined, { blockAds: true })
    expect(copy.items).toHaveLength(1)
  })
})
