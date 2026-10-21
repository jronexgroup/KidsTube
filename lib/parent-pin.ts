/**
 * The parent gate.
 *
 * A child's PIN must not sit in the app's storage in a form that can be read
 * back, and it must never be a value that is shipped in the source. So the
 * PIN is salted and hashed, the salt is generated per install, and there is no
 * default PIN anywhere: an install that has never had a PIN set simply has no
 * parent area until one is created.
 *
 * This is deliberately implemented without a crypto dependency so the same
 * code runs in the app, in the tests and in the page script.
 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

const rotr = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount))

const utf8Bytes = (input: string): number[] => {
  const bytes: number[] = []
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return bytes
}

/** SHA-256 of a utf-8 string, as lowercase hex. */
export function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input)
  const bitLength = bytes.length * 8

  bytes.push(0x80)
  while (bytes.length % 64 !== 56) {
    bytes.push(0)
  }
  // The length is written as a 64 bit big-endian value. The high word stays
  // zero for any input this app could conceivably hash.
  bytes.push(0, 0, 0, 0)
  bytes.push((bitLength >>> 24) & 0xff, (bitLength >>> 16) & 0xff, (bitLength >>> 8) & 0xff, bitLength & 0xff)

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]

  const w = new Array<number>(64)

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const j = offset + i * 4
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, hh] = h

    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
      const ch = ((e & f) ^ (~e & g)) >>> 0
      const temp1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
      const temp2 = (S0 + maj) >>> 0

      hh = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }

  return h.map((value) => value.toString(16).padStart(8, '0')).join('')
}

const HEX = '0123456789abcdef'

const randomBytes = (count: number): Uint8Array => {
  const bytes = new Uint8Array(count)
  const cryptoObject = (globalThis as { crypto?: Crypto }).crypto
  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(bytes)
    return bytes
  }
  for (let i = 0; i < count; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

/** A per-install salt, so two installs with the same PIN do not share a hash. */
export const createPinSalt = (): string => {
  const bytes = randomBytes(16)
  let salt = ''
  for (const byte of bytes) {
    salt += HEX[(byte >> 4) & 0x0f] + HEX[byte & 0x0f]
  }
  return salt
}

/**
 * Iterated hashing, so a four digit PIN is not cheap to search. The
 * iteration count is small enough to stay instant on a low end phone.
 */
const PIN_ITERATIONS = 1000

export const hashPin = (pin: string, salt: string): string => {
  let digest = sha256Hex(`${salt}:${pin}`)
  for (let i = 0; i < PIN_ITERATIONS; i += 1) {
    digest = sha256Hex(`${salt}:${digest}`)
  }
  return digest
}

/** Compares two digests without leaking where they differ. */
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export const verifyPin = (pin: string, salt: string, expectedHash: string): boolean => {
  if (!pin || !salt || !expectedHash) {
    return false
  }
  return safeEqual(hashPin(pin, salt), expectedHash)
}

/** The shortest PIN the app accepts. */
export const MIN_PIN_LENGTH = 4

export const isValidPinFormat = (pin: string): boolean =>
  typeof pin === 'string' && /^\d+$/.test(pin) && pin.length >= MIN_PIN_LENGTH
