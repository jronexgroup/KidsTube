import { describe, expect, it } from 'bun:test'
import {
  createPinSalt,
  hashPin,
  isValidPinFormat,
  sha256Hex,
  verifyPin,
} from './parent-pin'

describe('parent-pin', () => {
  it('matches the known sha256 vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256Hex('The quick brown fox jumps over the lazy dog')).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    )
  })

  it('hashes a long input', () => {
    expect(sha256Hex('a'.repeat(1000000))).toHaveLength(64)
  })

  it('hashes bengali text', () => {
    expect(sha256Hex('বাংলা')).toHaveLength(64)
    expect(sha256Hex('বাংলা')).not.toBe(sha256Hex('বাংলা '))
  })

  it('never stores the pin itself', () => {
    const salt = createPinSalt()
    const hash = hashPin('1234', salt)
    expect(hash).toHaveLength(64)
    expect(hash).not.toContain('1234')
  })

  it('verifies a pin and rejects the wrong one', () => {
    const salt = createPinSalt()
    const hash = hashPin('1234', salt)
    expect(verifyPin('1234', salt, hash)).toBe(true)
    expect(verifyPin('1235', salt, hash)).toBe(false)
    expect(verifyPin('', salt, hash)).toBe(false)
    expect(verifyPin('1234', salt, '')).toBe(false)
  })

  it('gives every install its own salt', () => {
    expect(createPinSalt()).not.toBe(createPinSalt())
    expect(createPinSalt()).toHaveLength(32)
  })

  it('checks the pin format', () => {
    expect(isValidPinFormat('1234')).toBe(true)
    expect(isValidPinFormat('123')).toBe(false)
    expect(isValidPinFormat('12a4')).toBe(false)
    expect(isValidPinFormat('')).toBe(false)
  })
})
