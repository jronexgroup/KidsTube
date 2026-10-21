import { observable, type Observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv'
import {
  CONTENT_SCHEMA_VERSION,
  createContentId,
  createDefaultContentLibrary,
  normalizeChannelCandidate,
  normalizeContentLibrary,
  normalizeContentRecord,
  type ApprovalStatus,
  type ApprovedContentSnapshot,
  type ChannelCandidate,
  type ContentLibrary,
  type ContentRecord,
} from '@/lib/content-policy'
import kidsSeed from '@/content/kids-seed.json'

interface Store extends ContentLibrary {
  /** Adds a candidate video. It starts out pending, never approved. */
  addRecord: (record: Partial<ContentRecord>) => string
  /** Replaces the fields of an existing record. */
  updateRecord: (id: string, patch: Partial<ContentRecord>) => void
  removeRecord: (id: string) => void
  /** Approves, rejects or sends a record back to pending. */
  setStatus: (id: string, status: ApprovalStatus, notes?: string) => void
  /** Adds a channel to review. */
  addChannel: (channel: Partial<ChannelCandidate>) => string
  removeChannel: (id: string) => void
  markChannelImported: (id: string) => void
  /** Copies the seed library in. Existing records are left alone. */
  importSeed: () => number
  /** Empties the library. */
  clear: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

/**
 * The seed library holds candidates that a parent still has to look at, so
 * they arrive as pending. Nothing reaches the child without a human decision.
 */
const seedRecords = (): ContentRecord[] => {
  const raw = Array.isArray((kidsSeed as any)?.videos) ? (kidsSeed as any).videos : []
  const records: ContentRecord[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    const record = normalizeContentRecord({
      ...item,
      approvalStatus: 'pending',
      approvalScope: item?.approvalScope === 'channel' ? 'channel' : 'video',
      source: item?.source ?? 'seed-list',
      addedAt: 0,
    })
    if (!record || seen.has(record.videoId)) {
      continue
    }
    seen.add(record.videoId)
    records.push(record)
  }

  return records
}

const seedChannels = (): ChannelCandidate[] => {
  const raw = Array.isArray((kidsSeed as any)?.channels) ? (kidsSeed as any).channels : []
  const channels: ChannelCandidate[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    const candidate = normalizeChannelCandidate({ ...item, addedAt: 0 })
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

  return channels
}

export const approvedContent$: Observable<Store> = observable<Store>({
  ...createDefaultContentLibrary(),

  addRecord: (record) => {
    const created = normalizeContentRecord({
      ...record,
      id: createContentId(),
      approvalStatus: record.approvalStatus ?? 'pending',
      addedAt: Date.now(),
    })
    if (!created) {
      return ''
    }
    const records = approvedContent$.records.get()
    const existing = records.find((item) => item.videoId === created.videoId)
    if (existing) {
      approvedContent$.records.set(
        records.map((item) => (item.id === existing.id ? { ...item, ...record, id: item.id } : item)),
      )
      return existing.id
    }
    approvedContent$.records.set(records.concat(created))
    return created.id
  },

  updateRecord: (id, patch) => {
    const records = approvedContent$.records.get()
    if (!records.some((item) => item.id === id)) {
      return
    }
    approvedContent$.records.set(
      records.map((item) => (item.id === id ? { ...item, ...patch, id: item.id } : item)),
    )
  },

  removeRecord: (id) => {
    approvedContent$.records.set(approvedContent$.records.get().filter((item) => item.id !== id))
  },

  setStatus: (id, status, notes) => {
    const records = approvedContent$.records.get()
    approvedContent$.records.set(
      records.map((item): ContentRecord => {
        if (item.id !== id) {
          return item
        }
        return {
          ...item,
          approvalStatus: status,
          reviewedAt: today(),
          reviewedByRole: 'parent',
          ...(notes !== undefined ? { reviewNotes: notes } : {}),
        }
      }),
    )
  },

  addChannel: (channel) => {
    const created = normalizeChannelCandidate({ ...channel, id: createContentId(), addedAt: Date.now() })
    if (!created) {
      return ''
    }
    const channels = approvedContent$.channels.get()
    const existing = channels.find(
      (item) =>
        (created.handle && item.handle.toLowerCase() === created.handle.toLowerCase()) ||
        (created.url && item.url.toLowerCase() === created.url.toLowerCase()),
    )
    if (existing) {
      return existing.id
    }
    approvedContent$.channels.set(channels.concat(created))
    return created.id
  },

  removeChannel: (id) => {
    approvedContent$.channels.set(approvedContent$.channels.get().filter((item) => item.id !== id))
  },

  markChannelImported: (id) => {
    const channels = approvedContent$.channels.get()
    approvedContent$.channels.set(
      channels.map((item) => (item.id === id ? { ...item, importedAt: Date.now() } : item)),
    )
  },

  importSeed: () => {
    const existingRecords = approvedContent$.records.get()
    const knownVideos = new Set(existingRecords.map((item) => item.videoId))
    const incomingRecords = seedRecords().filter((item) => !knownVideos.has(item.videoId))

    const existingChannels = approvedContent$.channels.get()
    const knownChannels = new Set(
      existingChannels.map((item) => item.handle.toLowerCase() || item.url.toLowerCase()),
    )
    const incomingChannels = seedChannels().filter(
      (item) => !knownChannels.has(item.handle.toLowerCase() || item.url.toLowerCase()),
    )

    if (incomingRecords.length) {
      approvedContent$.records.set(existingRecords.concat(incomingRecords))
    }
    if (incomingChannels.length) {
      approvedContent$.channels.set(existingChannels.concat(incomingChannels))
    }

    return incomingRecords.length + incomingChannels.length
  },

  clear: () => {
    approvedContent$.records.set([])
    approvedContent$.channels.set([])
  },
})

/** The normalised snapshot the policy is built from. */
export const getApprovedContentSnapshot = (
  value: Partial<Store> | undefined = approvedContent$.get(),
): ApprovedContentSnapshot => {
  const library = normalizeContentLibrary(value)
  return { schemaVersion: library.schemaVersion, records: library.records }
}

/** The whole library, normalised. */
export const getContentLibrary = (value: Partial<Store> | undefined = approvedContent$.get()): ContentLibrary =>
  normalizeContentLibrary(value)

/** The records a child may watch, in the order the categories are shown. */
export const getApprovedRecords = (): ContentRecord[] =>
  getApprovedContentSnapshot().records.filter((record) => record.approvalStatus === 'approved')

export const getPendingRecords = (): ContentRecord[] =>
  getApprovedContentSnapshot().records.filter((record) => record.approvalStatus === 'pending')

export const getRejectedRecords = (): ContentRecord[] =>
  getApprovedContentSnapshot().records.filter((record) => record.approvalStatus === 'rejected')

export const findRecordByVideoId = (videoId: string): ContentRecord | undefined =>
  getApprovedContentSnapshot().records.find((record) => record.videoId === videoId)

syncObservable(approvedContent$, {
  persist: {
    name: 'approvedContent',
    plugin: ObservablePersistMMKV,
    transform: {
      load: (data: Store) => normalizeContentLibrary(data),
    },
  },
})

export { CONTENT_SCHEMA_VERSION }
