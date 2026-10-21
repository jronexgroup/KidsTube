import {
  CONTENT_CATEGORIES,
  getCategoryOrder,
  getContentGroup,
  type ContentCategory,
  type ContentGroup,
  type ContentRecord,
} from './content-policy'

/**
 * The shape of the child facing library.
 *
 * The library is built from the approved records only, so it can never show
 * a video the policy would refuse. The groups come in a fixed order --
 * Bengali first, then English, then the general topics, then the Islamic ones
 * -- because that is the order the learning goes in.
 */

export interface KidsCategory {
  category: ContentCategory
  records: ContentRecord[]
}

export interface KidsGroup {
  group: ContentGroup
  categories: KidsCategory[]
  /** Every record of the group, for the "all of it" list. */
  records: ContentRecord[]
}

const GROUP_ORDER: ContentGroup[] = ['bengali', 'english', 'general', 'islamic']

/** The groups, in the order the child sees them. */
export const getGroupOrder = (): ContentGroup[] => [...GROUP_ORDER]

/**
 * Builds the library from a list of records. Only the approved ones are
 * given; the caller decides that, and the policy checks it again.
 */
export function buildKidsLibrary(records: ContentRecord[]): KidsGroup[] {
  const approved = records.filter((record) => record.approvalStatus === 'approved')

  const groups = new Map<ContentGroup, Map<ContentCategory, ContentRecord[]>>()

  for (const record of approved) {
    const group = getContentGroup(record.category)
    let categories = groups.get(group)
    if (!categories) {
      categories = new Map()
      groups.set(group, categories)
    }
    const list = categories.get(record.category)
    if (list) {
      list.push(record)
    } else {
      categories.set(record.category, [record])
    }
  }

  return GROUP_ORDER.map((group) => {
    const categories = groups.get(group)
    const entries: KidsCategory[] = categories
      ? [...categories.entries()]
          .map(([category, list]) => ({
            category,
            records: list.sort((a, b) => a.title.localeCompare(b.title)),
          }))
          .sort((a, b) => getCategoryOrder(a.category) - getCategoryOrder(b.category))
      : []
    return {
      group,
      categories: entries,
      records: entries.flatMap((entry) => entry.records),
    }
  }).filter((group) => group.categories.length > 0)
}

/** The categories that have at least one approved item, in order. */
export const getVisibleCategories = (records: ContentRecord[]): ContentCategory[] =>
  CONTENT_CATEGORIES.filter((category) =>
    records.some((record) => record.approvalStatus === 'approved' && record.category === category),
  )

/** The thumbnail of a video. */
export const getKidsThumbnail = (videoId: string) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
