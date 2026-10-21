import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv'
import { createPinSalt, hashPin, isValidPinFormat, verifyPin } from '@/lib/parent-pin'

/**
 * How long the parent area stays open. The gate is about keeping a child out
 * of the settings, not about keeping a determined adult out, so it re-locks
 * on its own after a few minutes of quiet.
 */
export const GATE_TIMEOUT_MS = 5 * 60 * 1000

interface GateStore {
  /** The salted hash of the PIN. Never the PIN itself. */
  pinHash: string
  pinSalt: string
  /** Set once a PIN exists. An install with no PIN has no parent area yet. */
  hasPin: boolean
  setPin: (pin: string) => boolean
  changePin: (currentPin: string, nextPin: string) => boolean
  clearPin: () => void
}

interface GateSession {
  unlocked: boolean
  unlockedAt: number
  unlock: () => void
  lock: () => void
}

/**
 * The stored part of the gate. It is persisted so the PIN survives a restart,
 * but the PIN itself is never stored: only its salted hash is.
 */
export const parentGate$ = observable<GateStore>({
  pinHash: '',
  pinSalt: '',
  hasPin: false,

  setPin: (pin) => {
    if (!isValidPinFormat(pin)) {
      return false
    }
    const salt = createPinSalt()
    parentGate$.pinSalt.set(salt)
    parentGate$.pinHash.set(hashPin(pin, salt))
    parentGate$.hasPin.set(true)
    return true
  },

  changePin: (currentPin, nextPin) => {
    const { pinHash, pinSalt } = parentGate$.get()
    if (!pinHash || !verifyPin(currentPin, pinSalt, pinHash)) {
      return false
    }
    if (!isValidPinFormat(nextPin)) {
      return false
    }
    const salt = createPinSalt()
    parentGate$.pinSalt.set(salt)
    parentGate$.pinHash.set(hashPin(nextPin, salt))
    parentGate$.hasPin.set(true)
    return true
  },

  clearPin: () => {
    parentGate$.pinHash.set('')
    parentGate$.pinSalt.set('')
    parentGate$.hasPin.set(false)
    parentGateSession$.lock()
  },
})

/**
 * The unlocked state is deliberately not persisted. It lives for as long as
 * the parent area is open and no longer, so a restart always lands back
 * behind the gate.
 */
export const parentGateSession$ = observable<GateSession>({
  unlocked: false,
  unlockedAt: 0,

  unlock: () => {
    parentGateSession$.unlocked.set(true)
    parentGateSession$.unlockedAt.set(Date.now())
  },

  lock: () => {
    parentGateSession$.unlocked.set(false)
    parentGateSession$.unlockedAt.set(0)
  },
})

/** Checks a PIN against the stored hash. */
export const checkParentPin = (pin: string): boolean => {
  const { pinHash, pinSalt, hasPin } = parentGate$.get()
  if (!hasPin || !pinHash || !pinSalt) {
    return false
  }
  return verifyPin(pin, pinSalt, pinHash)
}

/** Whether the parent area is open right now. */
export const isParentUnlocked = (): boolean => {
  if (!parentGateSession$.unlocked.get()) {
    return false
  }
  const unlockedAt = parentGateSession$.unlockedAt.get()
  if (!unlockedAt || Date.now() - unlockedAt > GATE_TIMEOUT_MS) {
    parentGateSession$.lock()
    return false
  }
  return true
}

/** Re-opens the gate for a while longer. */
export const touchParentGate = () => {
  if (parentGateSession$.unlocked.get()) {
    parentGateSession$.unlockedAt.set(Date.now())
  }
}

syncObservable(parentGate$, {
  persist: {
    name: 'parentGate',
    plugin: ObservablePersistMMKV,
    transform: {
      load: (data: GateStore) => ({
        ...data,
        pinHash: typeof data?.pinHash === 'string' ? data.pinHash : '',
        pinSalt: typeof data?.pinSalt === 'string' ? data.pinSalt : '',
        hasPin: Boolean(data?.hasPin) && Boolean(data?.pinHash),
      }),
    },
  },
})
