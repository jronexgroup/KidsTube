/**
 * KidsTube content policy.
 *
 * This module is the single place that decides whether a child may see
 * something. It is deliberately free of any React Native or browser API so
 * that the same rules can be applied by the app, by the injected page script
 * and by the unit tests.
 *
 * The rule the whole product rests on: deny by default. A video is watchable
 * only when a parent has approved that exact video id. Everything else --
 * unknown ids, unknown routes, Shorts, search, feeds, channel pages, external
 * links -- is refused, and an unrecognised route is refused rather than
 * guessed at.
 */

/** Bumped when the shape of a content record changes. */
export const CONTENT_SCHEMA_VERSION = 1

export type ContentCategory =
  | 'bengali_alphabet'
  | 'bengali_reading'
  | 'bengali_rhymes'
  | 'bengali_numbers'
  | 'english_alphabet'
  | 'english_phonics'
  | 'english_rhymes'
  | 'english_counting'
  | 'shapes_colours'
  | 'animals_nature'
  | 'everyday_knowledge'
  | 'habits_safety'
  | 'islamic_quran'
  | 'islamic_duas'
  | 'islamic_stories'
  | 'islamic_adab'
  | 'islamic_nasheeds'

export type ContentGroup = 'bengali' | 'english' | 'general' | 'islamic'

export type ContentLanguage = 'bn' | 'en' | 'ar' | 'mixed'

export type ApprovalStatus = 'approved' | 'pending' | 'rejected'

/**
 * `video` means the parent looked at this one video. `channel` means the
 * parent approved the channel as a whole; the videos it covers were still
 * imported one by one, so a later upload is not approved until it is added.
 */
export type ApprovalScope = 'video' | 'channel'

export interface ContentRecord {
  id: string
  videoId: string
  title: string
  channelId?: string
  channelName?: string
  /** The @handle of the channel, for the parent's reference. */
  channelHandle?: string
  language: ContentLanguage
  category: ContentCategory
  ageBand?: string
  learningGoals?: string[]
  approvalStatus: ApprovalStatus
  approvalScope: ApprovalScope
  reviewedByRole?: 'parent' | 'curator'
  reviewedAt?: string
  reviewNotes?: string
  source?: string
  addedAt: number
}

export interface ApprovedContentSnapshot {
  schemaVersion: number
  records: ContentRecord[]
}

/**
 * A channel the parent has not decided about yet. It is not watchable: the
 * videos of an approved channel are still imported one by one, so a later
 * upload never sneaks in on the strength of an old decision.
 */
export interface ChannelCandidate {
  id: string
  /** The @handle or the bare name of the channel. */
  handle: string
  url: string
  name: string
  language: ContentLanguage
  category: ContentCategory
  notes?: string
  addedAt: number
  /** Set once the channel's recent videos have been pulled in as candidates. */
  importedAt?: number
}

/** The whole local library: the watchable records plus the channel candidates. */
export interface ContentLibrary extends ApprovedContentSnapshot {
  channels: ChannelCandidate[]
}

/**
 * The order the child sees the categories in. Bengali comes first because it
 * is the primary learning track, English second, then the general learning
 * topics, then the Islamic ones.
 */
export const CONTENT_CATEGORIES: readonly ContentCategory[] = [
  'bengali_alphabet',
  'bengali_reading',
  'bengali_rhymes',
  'bengali_numbers',
  'english_alphabet',
  'english_phonics',
  'english_rhymes',
  'english_counting',
  'shapes_colours',
  'animals_nature',
  'everyday_knowledge',
  'habits_safety',
  'islamic_quran',
  'islamic_duas',
  'islamic_stories',
  'islamic_adab',
  'islamic_nasheeds',
]

const CATEGORY_GROUP: Record<ContentCategory, ContentGroup> = {
  bengali_alphabet: 'bengali',
  bengali_reading: 'bengali',
  bengali_rhymes: 'bengali',
  bengali_numbers: 'bengali',
  english_alphabet: 'english',
  english_phonics: 'english',
  english_rhymes: 'english',
  english_counting: 'english',
  shapes_colours: 'general',
  animals_nature: 'general',
  everyday_knowledge: 'general',
  habits_safety: 'general',
  islamic_quran: 'islamic',
  islamic_duas: 'islamic',
  islamic_stories: 'islamic',
  islamic_adab: 'islamic',
  islamic_nasheeds: 'islamic',
}

export const isContentCategory = (value: unknown): value is ContentCategory =>
  typeof value === 'string' && (CONTENT_CATEGORIES as readonly string[]).includes(value)

export const getContentGroup = (category: ContentCategory): ContentGroup => CATEGORY_GROUP[category] ?? 'general'

export const getCategoryOrder = (category: ContentCategory): number => {
  const index = CONTENT_CATEGORIES.indexOf(category)
  return index === -1 ? CONTENT_CATEGORIES.length : index
}

/** A YouTube video id is 11 characters of url-safe base64. */
export const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export const isValidVideoId = (value: unknown): value is string =>
  typeof value === 'string' && VIDEO_ID_PATTERN.test(value)

const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]

const isYouTubeHost = (host: string) => {
  const normalized = host.toLowerCase()
  return YOUTUBE_HOSTS.includes(normalized) || normalized.endsWith('.youtube.com')
}

/**
 * Pulls the video id out of any of the url shapes YouTube hands out.
 * Returns '' when the url does not name a video at all.
 */
export function extractVideoId(url: string): string {
  if (!url) {
    return ''
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return ''
  }
  if (!isYouTubeHost(parsed.host)) {
    return ''
  }

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (parsed.host.endsWith('youtu.be')) {
    const candidate = segments[0] ?? ''
    return isValidVideoId(candidate) ? candidate : ''
  }

  const videoParam = parsed.searchParams.get('v')
  if (isValidVideoId(videoParam)) {
    return videoParam
  }

  // /shorts/<id>, /embed/<id>, /live/<id> and /v/<id> all name a video too.
  if (segments.length >= 2) {
    const [kind, candidate] = segments
    if (kind === 'shorts' || kind === 'embed' || kind === 'live' || kind === 'v') {
      return isValidVideoId(candidate) ? candidate : ''
    }
  }

  return ''
}

export const isShortsUrl = (url: string): boolean => {
  if (!url) {
    return false
  }
  try {
    const parsed = new URL(url)
    if (!isYouTubeHost(parsed.host)) {
      return false
    }
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments[0] === 'shorts') {
      return true
    }
    // The desktop site serves a Short under /watch?v=<id> as well, so the
    // shorts flag in the query is the only tell there.
    return parsed.searchParams.get('feature') === 'shorts' || parsed.searchParams.has('shorts')
  } catch {
    return false
  }
}

/** Pulls the channel id out of a channel url, when it carries one. */
export function extractChannelId(url: string): string {
  if (!url) {
    return ''
  }
  try {
    const parsed = new URL(url)
    if (!isYouTubeHost(parsed.host)) {
      return ''
    }
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments[0] === 'channel' && segments[1]) {
      return segments[1]
    }
    const param = parsed.searchParams.get('channel')
    return param || ''
  } catch {
    return ''
  }
}

/** Normalises a channel reference to the bare id or handle, without the url. */
export function normalizeChannelValue(value: string): string {
  if (!value) {
    return ''
  }
  return value
    .trim()
    .replace(/^https?:\/\/(www\.|m\.)?youtube\.com\//i, '')
    .replace(/^\/+/, '')
    .replace(/^(c|channel|user)\//i, '')
    .replace(/^\/+/, '')
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

export type PolicyDenialReason =
  | 'kids_mode_off'
  | 'external_host'
  | 'shorts'
  | 'search'
  | 'discovery'
  | 'channel'
  | 'playlist'
  | 'live'
  | 'live_chat'
  | 'comments'
  | 'malformed_video_id'
  | 'unapproved_video'
  | 'unknown_route'
  | 'empty_url'

export interface PolicyDecision {
  allowed: boolean
  reason: PolicyDenialReason | 'allowed'
  /** The video id the url names, when it names one. */
  videoId?: string
}

const allow = (videoId?: string): PolicyDecision => ({ allowed: true, reason: 'allowed', videoId })
const deny = (reason: PolicyDenialReason, videoId?: string): PolicyDecision => ({
  allowed: false,
  reason,
  videoId,
})

export interface PolicyOptions {
  /** When false the policy stands aside entirely and lets everything through. */
  kidsMode?: boolean
  /**
   * The ids a parent is allowed to watch while previewing a candidate that is
   * not approved yet. Only ever set for the one video the parent asked to
   * look at, and only while the parent gate is open.
   */
  previewVideoIds?: Set<string>
}

export interface ContentPolicy {
  /** The ids of the videos a parent has approved. */
  approvedVideoIds: Set<string>
  /** Every record, whatever its approval status. */
  records: ContentRecord[]
  isVideoApproved(videoId: string): boolean
  evaluateUrl(url: string, options?: PolicyOptions): PolicyDecision
}

/**
 * Builds the policy from the approved-content snapshot.
 *
 * Malformed records are dropped by `normalizeApprovedContent` before they get
 * here, so anything left in the set is a record that passed validation.
 */
export function createContentPolicy(snapshot?: ApprovedContentSnapshot): ContentPolicy {
  const records = snapshot?.records ?? []
  const approvedVideoIds = new Set<string>()
  for (const record of records) {
    if (record.approvalStatus === 'approved' && isValidVideoId(record.videoId)) {
      approvedVideoIds.add(record.videoId)
    }
  }

  const isVideoApproved = (videoId: string) =>
    isValidVideoId(videoId) && approvedVideoIds.has(videoId)

  const evaluateUrl = (url: string, options: PolicyOptions = {}): PolicyDecision => {
    if (options.kidsMode === false) {
      return allow(extractVideoId(url))
    }
    if (!url) {
      return deny('empty_url')
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return deny('unknown_route')
    }

    if (!isYouTubeHost(parsed.host)) {
      return deny('external_host')
    }

    const segments = parsed.pathname.split('/').filter(Boolean)
    const first = segments[0] ?? ''

    if (first === 'shorts' || isShortsUrl(url)) {
      return deny('shorts')
    }

    if (first === 'watch') {
      const videoId = parsed.searchParams.get('v') ?? ''
      if (!isValidVideoId(videoId)) {
        return deny('malformed_video_id')
      }
      // A playlist context would pull unapproved videos into the page.
      if (parsed.searchParams.has('list')) {
        return deny('playlist')
      }
      if (options.previewVideoIds?.has(videoId)) {
        return allow(videoId)
      }
      return isVideoApproved(videoId) ? allow(videoId) : deny('unapproved_video', videoId)
    }

    if (first === 'embed' || first === 'v') {
      const videoId = segments[1] ?? ''
      if (!isValidVideoId(videoId)) {
        return deny('malformed_video_id')
      }
      if (options.previewVideoIds?.has(videoId)) {
        return allow(videoId)
      }
      return isVideoApproved(videoId) ? allow(videoId) : deny('unapproved_video', videoId)
    }

    if (first === 'live') {
      return deny('live')
    }

    if (first === 'search' || first === 'results' || first === 'hashtag') {
      return deny('search')
    }

    if (first === 'playlist') {
      return deny('playlist')
    }

    if (first === 'channel' || first.startsWith('@') || first === 'c' || first === 'user') {
      return deny('channel')
    }

    if (first === 'feed' || first === 'trending' || first === 'explore' || first === 'gaming') {
      return deny('discovery')
    }

    if (first === 'post' || first === 'community' || first === 'clip' || first === 'attribution_link') {
      return deny('unknown_route')
    }

    // The bare site root is the personalised home feed, and YouTube Music is
    // a different product altogether.
    if (first === '') {
      return deny('discovery')
    }

    if (parsed.host === 'music.youtube.com') {
      return deny('discovery')
    }

    return deny('unknown_route')
  }

  return {
    approvedVideoIds,
    records,
    isVideoApproved,
    evaluateUrl,
  }
}

/** Evaluate a url with explicit options; used by the page script and the app. */
export function evaluateUrlWithOptions(
  snapshot: ApprovedContentSnapshot | undefined,
  url: string,
  options: PolicyOptions = {},
): PolicyDecision {
  const policy = createContentPolicy(snapshot)
  return policy.evaluateUrl(url, options)
}

const createId = (size = 8) => {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  let value = ''
  for (let index = 0; index < size; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return value
}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const normalizeApprovalStatus = (value: unknown): ApprovalStatus => {
  if (value === 'approved' || value === 'rejected' || value === 'pending') {
    return value
  }
  return 'pending'
}

const normalizeApprovalScope = (value: unknown): ApprovalScope => {
  return value === 'channel' ? 'channel' : 'video'
}

const normalizeLanguage = (value: unknown): ContentLanguage => {
  if (value === 'bn' || value === 'en' || value === 'ar' || value === 'mixed') {
    return value
  }
  return 'mixed'
}

/**
 * Turns one raw record into a valid one, or returns null when the record
 * cannot be trusted. A record without a usable video id is dropped: it could
 * never be matched against anything, and keeping it would only hide a broken
 * entry from the parent who has to fix it.
 */
export function normalizeContentRecord(raw: any): ContentRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const videoId = normalizeString(raw.videoId)
  if (!videoId || !isValidVideoId(videoId)) {
    return null
  }
  const category = isContentCategory(raw.category) ? raw.category : null
  if (!category) {
    return null
  }

  const title = normalizeString(raw.title) ?? ''
  const learningGoals = Array.isArray(raw.learningGoals)
    ? (raw.learningGoals as unknown[])
        .map((goal: unknown) => normalizeString(goal))
        .filter((goal): goal is string => Boolean(goal))
    : undefined

  return {
    id: normalizeString(raw.id) ?? createId(),
    videoId,
    title,
    channelId: normalizeString(raw.channelId),
    channelName: normalizeString(raw.channelName),
    channelHandle: normalizeString(raw.channelHandle),
    language: normalizeLanguage(raw.language),
    category,
    ageBand: normalizeString(raw.ageBand),
    learningGoals: learningGoals?.length ? learningGoals : undefined,
    approvalStatus: normalizeApprovalStatus(raw.approvalStatus),
    approvalScope: normalizeApprovalScope(raw.approvalScope),
    reviewedByRole: raw.reviewedByRole === 'curator' ? 'curator' : raw.reviewedByRole === 'parent' ? 'parent' : undefined,
    reviewedAt: normalizeString(raw.reviewedAt),
    reviewNotes: normalizeString(raw.reviewNotes),
    source: normalizeString(raw.source),
    addedAt: typeof raw.addedAt === 'number' && Number.isFinite(raw.addedAt) ? raw.addedAt : Date.now(),
  }
}

/**
 * Normalises a whole snapshot, dropping the records that cannot be trusted.
 * A broken record hides its video; it never lets one through.
 */
export function normalizeApprovedContent(data: any): ApprovedContentSnapshot {
  const rawRecords = Array.isArray(data?.records) ? data.records : []
  const records: ContentRecord[] = []
  const seen = new Set<string>()

  for (const raw of rawRecords) {
    const record = normalizeContentRecord(raw)
    if (!record) {
      continue
    }
    if (seen.has(record.videoId)) {
      continue
    }
    seen.add(record.videoId)
    records.push(record)
  }

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    records,
  }
}

export const createDefaultApprovedContent = (): ApprovedContentSnapshot => ({
  schemaVersion: CONTENT_SCHEMA_VERSION,
  records: [],
})

/**
 * Normalises a channel candidate. A candidate without a name or a url could
 * never be fetched, so it is dropped rather than kept as a dead row.
 */
export function normalizeChannelCandidate(raw: any): ChannelCandidate | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const handle = normalizeString(raw.handle)
  const url = normalizeString(raw.url)
  if (!handle && !url) {
    return null
  }
  const category = isContentCategory(raw.category) ? raw.category : null
  if (!category) {
    return null
  }
  return {
    id: normalizeString(raw.id) ?? createId(),
    handle: handle ?? '',
    url: url ?? (handle ? `https://www.youtube.com/@${handle}` : ''),
    name: normalizeString(raw.name) ?? handle ?? '',
    language: normalizeLanguage(raw.language),
    category,
    notes: normalizeString(raw.notes),
    addedAt: typeof raw.addedAt === 'number' && Number.isFinite(raw.addedAt) ? raw.addedAt : Date.now(),
    importedAt: typeof raw.importedAt === 'number' && Number.isFinite(raw.importedAt) ? raw.importedAt : undefined,
  }
}

/** Normalises the whole library, dropping everything that cannot be trusted. */
export function normalizeContentLibrary(data: any): ContentLibrary {
  const base = normalizeApprovedContent(data)
  const rawChannels = Array.isArray(data?.channels) ? data.channels : []
  const channels: ChannelCandidate[] = []
  const seen = new Set<string>()

  for (const raw of rawChannels) {
    const candidate = normalizeChannelCandidate(raw)
    if (!candidate) {
      continue
    }
    const key = candidate.handle.toLowerCase() || candidate.url.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    channels.push(candidate)
  }

  return { ...base, channels }
}

export const createDefaultContentLibrary = (): ContentLibrary => ({
  ...createDefaultApprovedContent(),
  channels: [],
})

export { createId as createContentId }
