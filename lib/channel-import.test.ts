import { describe, expect, it } from 'bun:test'
import { parseChannelFeed } from './channel-import'

/**
 * A trimmed copy of a real channel feed, so the shape the parser has to read
 * is the shape YouTube actually sends.
 */
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <yt:channelId>UCWyfOC7fLxYch3IkQ58fMrA</yt:channelId>
  <title>Jugnu Kids - Bangla Nursery Rhymes &amp; Baby Songs</title>
  <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCWyfOC7fLxYch3IkQ58fMrA"/>
  <entry>
    <id>yt:video:_Gvfay-qbT4</id>
    <yt:videoId>_Gvfay-qbT4</yt:videoId>
    <yt:channelId>UCWyfOC7fLxYch3IkQ58fMrA</yt:channelId>
    <title>Aye ajagar | oi ojogor asche tere | অ&#39;য় অজগর আসছে তেড়ে</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=_Gvfay-qbT4"/>
    <published>2019-04-21T20:00:02-07:00</published>
    <media:group>
      <media:title>Aye ajagar | oi ojogor asche tere</media:title>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:5Owojhm3jRA</id>
    <yt:videoId>5Owojhm3jRA</yt:videoId>
    <yt:channelId>UCWyfOC7fLxYch3IkQ58fMrA</yt:channelId>
    <title>Aye bristi jhepe | আয় বৃষ্টি ছেপে | Bristi Pore Tapur Tupur</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=5Owojhm3jRA"/>
    <published>2024-01-01T10:00:00-07:00</published>
  </entry>
</feed>`

describe('channel import', () => {
  it('reads the videos out of a channel feed', () => {
    const videos = parseChannelFeed(FEED)
    expect(videos).toHaveLength(2)
    expect(videos[0].videoId).toBe('_Gvfay-qbT4')
    expect(videos[0].title).toContain('Aye ajagar')
    expect(videos[1].videoId).toBe('5Owojhm3jRA')
  })

  it('yields nothing for a feed it cannot read', () => {
    expect(parseChannelFeed('')).toEqual([])
    expect(parseChannelFeed('not xml at all')).toEqual([])
    expect(parseChannelFeed('<feed><entry><title>x</title></entry></feed>')).toEqual([])
  })

  it('skips an entry that names no video', () => {
    const feed = FEED.replace(
      '<link rel="alternate" href="https://www.youtube.com/watch?v=5Owojhm3jRA"/>',
      '<link rel="alternate" href="https://www.youtube.com/playlist?list=PL123"/>',
    )
    expect(parseChannelFeed(feed)).toHaveLength(1)
  })
})
