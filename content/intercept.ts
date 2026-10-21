import {
  RE_INTERCEPT,
  filterListResponse,
  transformBrowseResponse,
  transformGetWatchResponse,
  transformPlayerResponse,
  transformReelResponse,
  transformSearchResponse,
} from '@/lib/intercept'

const adsBlocked = () => window.NouTube?.getSettings?.()?.blockAds !== false

/**
 * The ids of the videos a parent has approved, or undefined when the app is
 * not in the restricted mode. When it is a set, every response is filtered
 * down to it before the page renders it.
 */
const approvedVideoIds = (): Set<string> | undefined => {
  if (window.NouTube?.getSettings?.()?.kidsMode === false) {
    return undefined
  }
  const content = window.NouTube?.getApprovedContent?.()
  if (!content) {
    return new Set<string>()
  }
  const ids = new Set<string>()
  for (const record of content.records || []) {
    if (record?.approvalStatus === 'approved' && typeof record.videoId === 'string') {
      ids.add(record.videoId)
    }
  }
  return ids
}

export function intercept() {
  // Intercept initial page data (server-rendered in script tags)
  let initialData = (window as any).ytInitialData
  Object.defineProperty(window, 'ytInitialData', {
    get() {
      return initialData
    },
    set(value) {
      try {
        const blocklist = window.NouTube?.getBlocklist?.()
        filterListResponse(value, blocklist, { blockAds: adsBlocked(), approvedVideoIds: approvedVideoIds() })
      } catch (error) {
        console.error('NouScript initialData:', error)
      }
      initialData = value
    },
    configurable: true,
  })

  // The first batch of the Shorts feed is server-rendered too, as a JSON string
  // the page parses itself.
  let initialReelSequence = (window as any).ytInitialReelWatchSequenceResponse
  Object.defineProperty(window, 'ytInitialReelWatchSequenceResponse', {
    get() {
      return initialReelSequence
    },
    set(value) {
      try {
        const blocklist = window.NouTube?.getBlocklist?.()
        const options = { blockAds: adsBlocked(), approvedVideoIds: approvedVideoIds() }
        if (typeof value === 'string') {
          value = transformReelResponse(value, blocklist, options)
        } else {
          filterListResponse(value, blocklist, options)
        }
      } catch (error) {
        console.error('NouScript initialReelSequence:', error)
      }
      initialReelSequence = value
    },
    configurable: true,
  })

  const winFetch = fetch
  // ts-ignore rather than ts-expect-error: react-native's global fetch typing
  // makes this assignment an error in the app's program but not in the
  // extension's, where an unused expect-error would itself fail the build.
  // @ts-ignore
  window.fetch = async (...args) => {
    const request = args[0]
    const url = request instanceof Request ? request.url : request.toString()
    let res = await winFetch(...args)
    const match = new URL(url).pathname.match(RE_INTERCEPT)
    const blocklist = window.NouTube?.getBlocklist?.()
    const settings = window.NouTube?.getSettings?.()
    const options = {
      showOriginalVideoTitle: Boolean(settings?.showOriginalVideoTitle),
      blockAds: settings?.blockAds !== false,
      approvedVideoIds: approvedVideoIds(),
    }
    if (res.status > 200 || !match) {
      return res
    }

    const text = await res.text()
    const responseInit = {
      status: res.status,
      headers: res.headers,
    }
    try {
      const fn =
        {
          browse: (text: string, blocklist?: any) => transformBrowseResponse(text, blocklist, options),
          get_watch: (text: string, blocklist?: any) => transformGetWatchResponse(text, blocklist, options),
          next: (text: string, blocklist?: any) => transformBrowseResponse(text, blocklist, options),
          reel: (text: string, blocklist?: any) => transformReelResponse(text, blocklist, options),
          search: (text: string, _blocklist?: any) =>
            transformSearchResponse(text, blocklist, {
              hideShorts: window.NouTube.shortsHidden,
              ...options,
            }),
        }[match[1]] || ((text: string, blocklist?: any) => transformPlayerResponse(text, blocklist, options))
      return new Response(fn(text, blocklist), responseInit)
    } catch (error) {
      console.error('NouScript:', error)
    }
    return new Response(text, responseInit)
  }

  // https://stackoverflow.com/a/78369686
  const xhrOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    url = url.toString()
    this.addEventListener('readystatechange', function () {
      if (this.readyState !== 4) {
        return
      }

      const match = new URL(url, location.origin).pathname.match(RE_INTERCEPT)
      if (!match) {
        return
      }

      const blocklist = window.NouTube?.getBlocklist?.()
      const settings = window.NouTube?.getSettings?.()
      const options = {
        showOriginalVideoTitle: Boolean(settings?.showOriginalVideoTitle),
        blockAds: settings?.blockAds !== false,
        approvedVideoIds: approvedVideoIds(),
      }
      try {
        const fn =
          {
            browse: (text: string, blocklist?: any) => transformBrowseResponse(text, blocklist, options),
            get_watch: (text: string, blocklist?: any) => transformGetWatchResponse(text, blocklist, options),
            next: (text: string, blocklist?: any) => transformBrowseResponse(text, blocklist, options),
            reel: (text: string, blocklist?: any) => transformReelResponse(text, blocklist, options),
            search: (text: string, _blocklist?: any) =>
              transformSearchResponse(text, blocklist, {
                hideShorts: window.NouTube.shortsHidden,
                ...options,
              }),
          }[match[1]] || ((text: string, blocklist?: any) => transformPlayerResponse(text, blocklist, options))
        const text = fn(this.responseText, blocklist)
        Object.defineProperty(this, 'response', { writable: true })
        Object.defineProperty(this, 'responseText', { writable: true })
        // @ts-expect-error xx
        this.response = this.responseText = text
      } catch (error) {
        console.error('NouScript:', error)
      }
    })
    return xhrOpen.apply(this, [method, url])
  }
}
