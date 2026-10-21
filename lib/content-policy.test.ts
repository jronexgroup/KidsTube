import { describe, expect, it } from 'bun:test'
import {
  CONTENT_CATEGORIES,
  CONTENT_SCHEMA_VERSION,
  createContentPolicy,
  evaluateUrlWithOptions,
  extractChannelId,
  extractVideoId,
  getContentGroup,
  getCategoryOrder,
  isShortsUrl,
  isValidVideoId,
  normalizeApprovedContent,
  normalizeChannelValue,
  normalizeContentRecord,
  type ApprovedContentSnapshot,
  type ContentRecord,
} from './content-policy'

const APPROVED_ID = 'dQw4w9WgXcQ'
const OTHER_ID = 'aaaaaaaaaaa'

const record = (overrides: Partial<ContentRecord> = {}): ContentRecord => ({
  id: 'r1',
  videoId: APPROVED_ID,
  title: 'Approved video',
  language: 'bn',
  category: 'bengali_alphabet',
  approvalStatus: 'approved',
  approvalScope: 'video',
  addedAt: 1,
  ...overrides,
})

const snapshot = (records: ContentRecord[]): ApprovedContentSnapshot => ({
  schemaVersion: CONTENT_SCHEMA_VERSION,
  records,
})

describe('content-policy: video ids', () => {
  it('accepts only well formed ids', () => {
    expect(isValidVideoId(APPROVED_ID)).toBe(true)
    expect(isValidVideoId('short')).toBe(false)
    expect(isValidVideoId('way_too_long_video_id')).toBe(false)
    expect(isValidVideoId('has space!')).toBe(false)
    expect(isValidVideoId(undefined)).toBe(false)
    expect(isValidVideoId(12345)).toBe(false)
  })

  it('extracts the id from every url shape youtube hands out', () => {
    expect(extractVideoId(`https://m.youtube.com/watch?v=${APPROVED_ID}`)).toBe(APPROVED_ID)
    expect(extractVideoId(`https://www.youtube.com/watch?v=${APPROVED_ID}&t=30`)).toBe(APPROVED_ID)
    expect(extractVideoId(`https://youtu.be/${APPROVED_ID}?si=abc`)).toBe(APPROVED_ID)
    expect(extractVideoId(`https://m.youtube.com/shorts/${APPROVED_ID}`)).toBe(APPROVED_ID)
    expect(extractVideoId(`https://www.youtube.com/embed/${APPROVED_ID}`)).toBe(APPROVED_ID)
    expect(extractVideoId(`https://www.youtube.com/live/${APPROVED_ID}`)).toBe(APPROVED_ID)
    expect(extractVideoId(`https://www.youtube.com/v/${APPROVED_ID}`)).toBe(APPROVED_ID)
  })

  it('extracts nothing from urls that name no video', () => {
    expect(extractVideoId('https://m.youtube.com/')).toBe('')
    expect(extractVideoId('https://m.youtube.com/feed/subscriptions')).toBe('')
    expect(extractVideoId('https://example.com/watch?v=' + APPROVED_ID)).toBe('')
    expect(extractVideoId('not a url')).toBe('')
    expect(extractVideoId('')).toBe('')
    expect(extractVideoId(`https://m.youtube.com/watch?v=short`)).toBe('')
  })

  it('recognises shorts urls', () => {
    expect(isShortsUrl(`https://m.youtube.com/shorts/${APPROVED_ID}`)).toBe(true)
    expect(isShortsUrl(`https://www.youtube.com/watch?v=${APPROVED_ID}&feature=shorts`)).toBe(true)
    expect(isShortsUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}`)).toBe(false)
    expect(isShortsUrl('https://example.com/shorts/abc')).toBe(false)
  })

  it('extracts channel ids and normalises channel references', () => {
    expect(extractChannelId('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv')).toBe(
      'UCabcdefghijklmnopqrstuv',
    )
    expect(extractChannelId('https://www.youtube.com/@SomeChannel')).toBe('')
    expect(normalizeChannelValue('https://www.youtube.com/@SomeChannel')).toBe('somechannel')
    expect(normalizeChannelValue(' @SomeChannel ')).toBe('somechannel')
    expect(normalizeChannelValue('https://www.youtube.com/channel/UC12345')).toBe('uc12345')
  })
})

describe('content-policy: url decisions', () => {
  const policy = createContentPolicy(snapshot([record()]))

  it('allows an approved video', () => {
    const decision = policy.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}`)
    expect(decision.allowed).toBe(true)
    expect(decision.videoId).toBe(APPROVED_ID)
  })

  it('allows an approved video with a resume position', () => {
    expect(policy.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}&t=42s`).allowed).toBe(true)
  })

  it('denies a video that is not approved', () => {
    const decision = policy.evaluateUrl(`https://m.youtube.com/watch?v=${OTHER_ID}`)
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('unapproved_video')
  })

  it('denies a pending or rejected video', () => {
    const pending = createContentPolicy(snapshot([record({ approvalStatus: 'pending' })]))
    expect(pending.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}`).allowed).toBe(false)

    const rejected = createContentPolicy(snapshot([record({ approvalStatus: 'rejected' })]))
    expect(rejected.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}`).allowed).toBe(false)
  })

  it('denies a malformed video id', () => {
    const decision = policy.evaluateUrl('https://m.youtube.com/watch?v=short')
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('malformed_video_id')
  })

  it('denies shorts by url and by route', () => {
    expect(policy.evaluateUrl(`https://m.youtube.com/shorts/${APPROVED_ID}`).reason).toBe('shorts')
    expect(policy.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}&feature=shorts`).reason).toBe('shorts')
  })

  it('denies search', () => {
    expect(policy.evaluateUrl('https://m.youtube.com/search?q=cartoon').reason).toBe('search')
    expect(policy.evaluateUrl('https://m.youtube.com/results?search_query=cartoon').reason).toBe('search')
  })

  it('denies the discovery surfaces', () => {
    expect(policy.evaluateUrl('https://m.youtube.com/').reason).toBe('discovery')
    expect(policy.evaluateUrl('https://m.youtube.com/feed/subscriptions').reason).toBe('discovery')
    expect(policy.evaluateUrl('https://m.youtube.com/feed/trending').reason).toBe('discovery')
    expect(policy.evaluateUrl('https://m.youtube.com/explore').reason).toBe('discovery')
    expect(policy.evaluateUrl('https://music.youtube.com/').reason).toBe('discovery')
  })

  it('denies channel browsing', () => {
    expect(policy.evaluateUrl('https://www.youtube.com/@SomeChannel').reason).toBe('channel')
    expect(policy.evaluateUrl('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv').reason).toBe('channel')
    expect(policy.evaluateUrl('https://www.youtube.com/c/SomeChannel').reason).toBe('channel')
  })

  it('denies playlists, live and external links', () => {
    expect(policy.evaluateUrl('https://m.youtube.com/playlist?list=PL123').reason).toBe('playlist')
    expect(policy.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}&list=PL123`).reason).toBe('playlist')
    expect(policy.evaluateUrl(`https://m.youtube.com/live/${APPROVED_ID}`).reason).toBe('live')
    expect(policy.evaluateUrl('https://example.com/').reason).toBe('external_host')
    expect(policy.evaluateUrl('https://google.com/search?q=x').reason).toBe('external_host')
  })

  it('denies unknown routes rather than guessing', () => {
    expect(policy.evaluateUrl('https://m.youtube.com/redirect?q=https://example.com').reason).toBe('unknown_route')
    expect(policy.evaluateUrl('https://m.youtube.com/clip/abc').reason).toBe('unknown_route')
    expect(policy.evaluateUrl('https://m.youtube.com/attribution_link?u=/watch').reason).toBe('unknown_route')
    expect(policy.evaluateUrl('not a url').reason).toBe('unknown_route')
    expect(policy.evaluateUrl('').reason).toBe('empty_url')
  })

  it('stands aside entirely when kids mode is off', () => {
    const decision = evaluateUrlWithOptions(snapshot([record()]), 'https://m.youtube.com/', { kidsMode: false })
    expect(decision.allowed).toBe(true)
  })

  it('lets a parent preview a candidate that is not approved yet', () => {
    const decision = evaluateUrlWithOptions(
      snapshot([record({ approvalStatus: 'pending' })]),
      `https://m.youtube.com/watch?v=${APPROVED_ID}`,
      { previewVideoIds: new Set([APPROVED_ID]) },
    )
    expect(decision.allowed).toBe(true)
  })

  it('does not let a preview reach any other video', () => {
    const decision = evaluateUrlWithOptions(
      snapshot([record({ approvalStatus: 'pending' })]),
      `https://m.youtube.com/watch?v=${OTHER_ID}`,
      { previewVideoIds: new Set([APPROVED_ID]) },
    )
    expect(decision.allowed).toBe(false)
  })

  it('does not let a preview through on a route that is never allowed', () => {
    const decision = evaluateUrlWithOptions(snapshot([record()]), 'https://m.youtube.com/search?q=x', {
      previewVideoIds: new Set([APPROVED_ID]),
    })
    expect(decision.allowed).toBe(false)
  })

  it('denies everything when the library is empty', () => {
    const empty = createContentPolicy(snapshot([]))
    expect(empty.approvedVideoIds.size).toBe(0)
    expect(empty.evaluateUrl(`https://m.youtube.com/watch?v=${APPROVED_ID}`).allowed).toBe(false)
  })
})

describe('content-policy: records', () => {
  it('drops records that cannot be trusted', () => {
    expect(normalizeContentRecord({ videoId: 'short', category: 'bengali_alphabet' })).toBeNull()
    expect(normalizeContentRecord({ videoId: APPROVED_ID })).toBeNull()
    expect(normalizeContentRecord(null)).toBeNull()
    expect(normalizeContentRecord('nope')).toBeNull()
  })

  it('falls back to safe values for missing fields', () => {
    const normalized = normalizeContentRecord({ videoId: APPROVED_ID, category: 'bengali_alphabet' })
    expect(normalized?.approvalStatus).toBe('pending')
    expect(normalized?.approvalScope).toBe('video')
    expect(normalized?.language).toBe('mixed')
    expect(normalized?.title).toBe('')
  })

  it('keeps only valid records and drops duplicate videos', () => {
    const result = normalizeApprovedContent({
      records: [
        { videoId: APPROVED_ID, category: 'bengali_alphabet', approvalStatus: 'approved' },
        { videoId: APPROVED_ID, category: 'bengali_rhymes', approvalStatus: 'approved' },
        { videoId: 'bad', category: 'bengali_alphabet' },
        { videoId: OTHER_ID, category: 'english_alphabet' },
      ],
    })
    expect(result.records).toHaveLength(2)
    expect(result.schemaVersion).toBe(CONTENT_SCHEMA_VERSION)
  })

  it('survives a completely broken snapshot', () => {
    expect(normalizeApprovedContent(undefined).records).toHaveLength(0)
    expect(normalizeApprovedContent({ records: 'nope' }).records).toHaveLength(0)
    expect(normalizeApprovedContent({ records: [null, 3, 'x'] }).records).toHaveLength(0)
  })
})

describe('content-policy: categories', () => {
  it('puts the bengali categories first', () => {
    const firstFour = CONTENT_CATEGORIES.slice(0, 4)
    expect(firstFour.every((category) => getContentGroup(category) === 'bengali')).toBe(true)
  })

  it('groups the categories the way the child home shows them', () => {
    expect(getContentGroup('bengali_alphabet')).toBe('bengali')
    expect(getContentGroup('english_phonics')).toBe('english')
    expect(getContentGroup('shapes_colours')).toBe('general')
    expect(getContentGroup('islamic_quran')).toBe('islamic')
  })

  it('keeps the category order stable', () => {
    expect(getCategoryOrder('bengali_alphabet')).toBeLessThan(getCategoryOrder('english_alphabet'))
    expect(getCategoryOrder('english_alphabet')).toBeLessThan(getCategoryOrder('shapes_colours'))
    expect(getCategoryOrder('shapes_colours')).toBeLessThan(getCategoryOrder('islamic_quran'))
  })
})
