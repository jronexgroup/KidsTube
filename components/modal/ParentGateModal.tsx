import { Pressable, View } from 'react-native'
import { useState } from 'react'
import { useValue } from '@legendapp/state/react'
import { useTranslation } from 'react-i18next'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '@/components/NouText'
import { BaseModal } from './BaseModal'
import { checkParentPin, parentGate$, parentGateSession$ } from '@/states/parent-gate'
import { isValidPinFormat, MIN_PIN_LENGTH } from '@/lib/parent-pin'
import { clsx, nIf } from '@/lib/utils'
/** The palette in this app has no red, so the error colour is spelled out. */
const ERROR_COLOR = '#ef4444'

/**
 * The gate in front of the parent area.
 *
 * There is no default PIN: an install that has never had one has no parent
 * area until a parent creates one, so a child cannot get in by guessing a
 * value that ships with the app.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

const Dots: React.FC<{ length: number; error: boolean }> = ({ length, error }) => {
  return (
    <View className="flex-row gap-3">
      {Array.from({ length: Math.max(4, length) }).map((_, index) => (
        <View
          key={index}
          className={clsx(
            'h-4 w-4 rounded-full',
            index < length
              ? error
                ? 'bg-red-500'
                : 'bg-indigo-600'
              : 'bg-zinc-300 dark:bg-zinc-700',
          )}
          style={error ? { backgroundColor: ERROR_COLOR } : undefined}
        />
      ))}
    </View>
  )
}

export const ParentGateModal: React.FC<{
  onClose: () => void
  onUnlocked: () => void
}> = ({ onClose, onUnlocked }) => {
  const { t } = useTranslation()
  const hasPin = useValue(parentGate$.hasPin)
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')

  const isCreating = !hasPin
  // Creating a PIN takes two entries: the new one and the same one again.
  const confirming = isCreating && firstPin.length > 0

  const onKey = (key: string) => {
    setError('')
    if (key === 'del') {
      setPin((current) => current.slice(0, -1))
      return
    }
    if (!key) {
      return
    }
    setPin((current) => (current.length >= 8 ? current : current + key))
  }

  const submit = () => {
    if (!isValidPinFormat(pin)) {
      setError(t('kids.pinTooShort'))
      return
    }

    if (isCreating) {
      if (!confirming) {
        setFirstPin(pin)
        setPin('')
        return
      }
      if (pin !== firstPin) {
        setError(t('kids.pinMismatch'))
        setFirstPin('')
        setPin('')
        return
      }
      parentGate$.setPin(pin)
      parentGateSession$.unlock()
      onUnlocked()
      return
    }

    if (!checkParentPin(pin)) {
      setError(t('kids.pinWrong'))
      setPin('')
      return
    }
    parentGateSession$.unlock()
    onUnlocked()
  }

  const title = isCreating
    ? confirming
      ? t('kids.confirmPinTitle')
      : t('kids.createPinTitle')
    : t('kids.unlockPrompt')

  const hint = isCreating ? t('kids.createPinHint') : t('kids.lockedHint')

  return (
    <BaseModal onClose={onClose} className="items-center justify-center">
      <View className="mx-4 w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6">
        <View className="items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-zinc-800">
            <MaterialIcons name={isCreating ? 'lock-person' : 'lock-open'} size={26} />
          </View>
          <NouText className="mt-4 text-center text-lg font-bold">{title}</NouText>
          <NouText className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">{hint}</NouText>
        </View>

        <View className="mt-6 items-center">
          <Dots length={pin.length} error={Boolean(error)} />
          {nIf(
            error,
            <NouText className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</NouText>,
          )}
        </View>

        <View className="mt-6 flex-row flex-wrap justify-center gap-3">
          {KEYS.map((key, index) =>
            key === '' ? (
              <View key={`gap-${index}`} className="h-14 w-16" />
            ) : (
              <Pressable
                key={key}
                onPress={() => onKey(key)}
                accessibilityRole="button"
                accessibilityLabel={key === 'del' ? t('buttons.clear') : key}
                className={clsx(
                  'h-14 w-16 items-center justify-center rounded-2xl active:opacity-60',
                  key === 'del'
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : 'bg-zinc-200 dark:bg-zinc-800',
                )}
              >
                {key === 'del' ? (
                  <MaterialIcons name="backspace" size={22} />
                ) : (
                  <NouText className="text-xl font-semibold">{key}</NouText>
                )}
              </Pressable>
            ),
          )}
        </View>

        <Pressable
          onPress={submit}
          disabled={pin.length < MIN_PIN_LENGTH}
          accessibilityRole="button"
          className={clsx(
            'mt-6 items-center rounded-full py-3',
            pin.length < MIN_PIN_LENGTH ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-indigo-600 active:opacity-70',
          )}
        >
          <NouText
            className={clsx(
              'font-semibold',
              pin.length < MIN_PIN_LENGTH ? 'text-zinc-500 dark:text-zinc-400' : 'text-white',
            )}
          >
            {isCreating && !confirming ? t('kids.approve') : t('kids.unlockPrompt')}
          </NouText>
        </Pressable>

        <Pressable onPress={onClose} className="mt-3 items-center py-2" accessibilityRole="button">
          <NouText className="text-sm text-zinc-500 dark:text-zinc-400">{t('buttons.cancel')}</NouText>
        </Pressable>
      </View>
    </BaseModal>
  )
}
