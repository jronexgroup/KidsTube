import { describe, expect, it } from 'bun:test'
import { buildKidsLibrary, getKidsThumbnail, getVisibleCategories } from './kids-library'
import type { ContentRecord } from './content-policy'

const record = (overrides: Partial<ContentRecord>): ContentRecord => ({
  id: overrides.videoId || 'r',
  videoId: 'dQw4w9WgXcQ',
  title: 'A video',
  language: 'bn',
  category: 'bengali_alphabet',
  approvalStatus: 'approved',
  approvalScope: 'video',
  addedAt: 1,
  ...overrides,
})

describe('kids-library', () => {
  it('shows only the approved records', () => {
    const library = buildKidsLibrary([
      record({ videoId: 'aaaaaaaaaaa', category: 'bengali_alphabet' }),
      record({ videoId: 'bbbbbbbbbbb', category: 'bengali_alphabet', approvalStatus: 'pending' }),
      record({ videoId: 'ccccccccccc', category: 'bengali_alphabet', approvalStatus: 'rejected' }),
    ])
    expect(library.flatMap((group) => group.records).map((item) => item.videoId)).toEqual(['aaaaaaaaaaa'])
  })

  it('leaves out a group with nothing approved in it', () => {
    const library = buildKidsLibrary([record({ category: 'bengali_alphabet' })])
    expect(library.map((group) => group.group)).toEqual(['bengali'])
  })

  it('puts the bengali groups first', () => {
    const library = buildKidsLibrary([
      record({ videoId: 'aaaaaaaaaaa', category: 'islamic_quran' }),
      record({ videoId: 'bbbbbbbbbbb', category: 'english_alphabet' }),
      record({ videoId: 'ccccccccccc', category: 'bengali_alphabet' }),
      record({ videoId: 'ddddddddddd', category: 'shapes_colours' }),
    ])
    expect(library.map((group) => group.group)).toEqual(['bengali', 'english', 'general', 'islamic'])
  })

  it('keeps the categories in the learning order', () => {
    const library = buildKidsLibrary([
      record({ videoId: 'aaaaaaaaaaa', category: 'bengali_numbers' }),
      record({ videoId: 'bbbbbbbbbbb', category: 'bengali_alphabet' }),
      record({ videoId: 'ccccccccccc', category: 'bengali_rhymes' }),
    ])
    expect(library[0].categories.map((entry) => entry.category)).toEqual([
      'bengali_alphabet',
      'bengali_rhymes',
      'bengali_numbers',
    ])
  })

  it('lists the visible categories', () => {
    const categories = getVisibleCategories([
      record({ videoId: 'aaaaaaaaaaa', category: 'english_alphabet' }),
      record({ videoId: 'bbbbbbbbbbb', category: 'bengali_alphabet', approvalStatus: 'pending' }),
    ])
    expect(categories).toEqual(['english_alphabet'])
  })

  it('is empty when nothing is approved', () => {
    expect(buildKidsLibrary([])).toEqual([])
    expect(buildKidsLibrary([record({ approvalStatus: 'pending' })])).toEqual([])
  })

  it('builds a thumbnail url', () => {
    expect(getKidsThumbnail('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })
})
