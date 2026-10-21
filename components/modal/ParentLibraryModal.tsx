import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useState } from 'react'
import { useValue } from '@legendapp/state/react'
import { useTranslation } from 'react-i18next'
import { Image } from 'expo-image'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '@/components/NouText'
import { NouButton } from '@/components/button/NouButton'
import { BaseFullScreenModal } from './BaseFullScreenModal'
import { approvedContent$, getApprovedContentSnapshot } from '@/states/approved-content'
import { parentGate$, parentGateSession$ } from '@/states/parent-gate'
import { settings$ } from '@/states/settings'
import { extractVideoId, isValidVideoId, type ChannelCandidate, type ContentRecord } from '@/lib/content-policy'
import { getKidsThumbnail } from '@/lib/kids-library'
import { normalizeChannelValue } from '@/lib/content-policy'
import { clsx, isWeb, nIf } from '@/lib/utils'
import { useTwColor } from '@/lib/theme'

/** The palette in this app has no green or red, so the two are spelled out. */
const APPROVED_COLOR = '#15803d'
const REJECTED_COLOR = '#b91c1c'
import { showToast } from '@/lib/toast'
import { fetchChannelCandidates } from '@/lib/channel-import'

/**
 * The parent area.
 *
 * Everything the child may watch is decided here: a video is added, reviewed,
 * approved, sent back or removed, and the record of who decided and when is
 * kept with it. Only the parent gets in, and the PIN is what keeps the child
 * out.
 */

type Tab = 'approved' | 'pending' | 'rejected' | 'channels'

const TABS: Tab[] = ['approved', 'pending', 'rejected', 'channels']

const TAB_LABEL: Record<Tab, string> = {
  approved: 'kids.tabApproved',
  pending: 'kids.tabPending',
  rejected: 'kids.tabRejected',
  channels: 'kids.tabChannels',
}

const statusIcon = (status: ContentRecord['approvalStatus']) => {
  if (status === 'approved') {
    return 'check-circle'
  }
  if (status === 'rejected') {
    return 'cancel'
  }
  return 'schedule'
}

const RecordRow: React.FC<{
  record: ContentRecord
  onPreview: (record: ContentRecord) => void
}> = ({ record, onPreview }) => {
  const { t } = useTranslation()
  const tw = useTwColor()

  const set = (status: ContentRecord['approvalStatus']) => {
    approvedContent$.setStatus(record.id, status)
    showToast(t(status === 'approved' ? 'kids.approve' : status === 'rejected' ? 'kids.reject' : 'kids.moveToPending'))
  }

  return (
    <View className="flex-row gap-3 border-b-2 border-zinc-100 dark:border-zinc-900 px-4 py-3">
      <Image
        source={{ uri: getKidsThumbnail(record.videoId) }}
        style={{ width: 96, height: 54 }}
        contentFit="cover"
        className="rounded-lg"
      />
      <View className="flex-1">
        <NouText className="font-medium" numberOfLines={2}>
          {record.title || record.videoId}
        </NouText>
        <NouText className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
          {[
            t(`kids.categories.${record.category}`),
            t(`kids.languages.${record.language}`),
            record.channelName,
            record.ageBand,
          ]
            .filter(Boolean)
            .join(' · ')}
        </NouText>
        {nIf(
          record.reviewNotes,
          <NouText className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400" numberOfLines={2}>
            {record.reviewNotes}
          </NouText>,
        )}
        <NouText className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {record.reviewedAt ? `${t('kids.reviewedOn')}: ${record.reviewedAt}` : t('kids.notReviewed')}
        </NouText>

        <View className="mt-2 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => set('approved')}
            className="flex-row items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 active:opacity-70"
            accessibilityRole="button"
          >
            <MaterialIcons name="check" size={14} color={APPROVED_COLOR} />
            <NouText className="text-xs font-medium text-green-700 dark:text-green-300">{t('kids.approve')}</NouText>
          </Pressable>
          <Pressable
            onPress={() => set('pending')}
            className="flex-row items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-3 py-1 active:opacity-70"
            accessibilityRole="button"
          >
            <MaterialIcons name="schedule" size={14} />
            <NouText className="text-xs font-medium">{t('kids.moveToPending')}</NouText>
          </Pressable>
          <Pressable
            onPress={() => set('rejected')}
            className="flex-row items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 active:opacity-70"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={14} color={REJECTED_COLOR} />
            <NouText className="text-xs font-medium text-red-700 dark:text-red-300">{t('kids.reject')}</NouText>
          </Pressable>
          <Pressable
            onPress={() => onPreview(record)}
            className="flex-row items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 active:opacity-70"
            accessibilityRole="button"
          >
            <MaterialIcons name="play-circle-outline" size={14} />
            <NouText className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{t('kids.preview')}</NouText>
          </Pressable>
          <Pressable
            onPress={() => {
              approvedContent$.removeRecord(record.id)
            }}
            className="flex-row items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 active:opacity-70"
            accessibilityRole="button"
          >
            <MaterialIcons name="delete-outline" size={14} />
            <NouText className="text-xs font-medium">{t('kids.remove')}</NouText>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const ChannelRow: React.FC<{
  candidate: { id: string; handle: string; name: string; url: string; category: string; importedAt?: number }
  onImport: () => void
  onRemove: () => void
}> = ({ candidate, onImport, onRemove }) => {
  const { t } = useTranslation()
  return (
    <View className="flex-row items-center gap-3 border-b-2 border-zinc-100 dark:border-zinc-900 px-4 py-3">
      <View className="flex-1">
        <NouText className="font-medium" numberOfLines={1}>
          {candidate.name || candidate.handle}
        </NouText>
        <NouText className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
          {candidate.url}
        </NouText>
        <NouText className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {candidate.importedAt ? t('kids.channelImported') : t('kids.reviewBeforeApproving')}
        </NouText>
      </View>
      <Pressable
        onPress={onImport}
        className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 active:opacity-70"
        accessibilityRole="button"
      >
        <NouText className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
          {t('kids.importChannel')}
        </NouText>
      </Pressable>
      <Pressable
        onPress={onRemove}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-zinc-200 dark:active:bg-zinc-800"
        accessibilityRole="button"
      >
        <MaterialIcons name="delete-outline" size={18} />
      </Pressable>
    </View>
  )
}

export const ParentLibraryModal: React.FC<{
  onClose: () => void
  onPreview: (videoId: string) => void
}> = ({ onClose, onPreview }) => {
  const { t } = useTranslation()
  const library = useValue(approvedContent$)
  const kidsMode = useValue(settings$.kidsMode)
  const [tab, setTab] = useState<Tab>('pending')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const records = getApprovedContentSnapshot(library).records
  const byStatus = (status: ContentRecord['approvalStatus']) =>
    records.filter((record) => record.approvalStatus === status)

  const addFromInput = () => {
    const value = input.trim()
    if (!value) {
      return
    }

    const videoId = extractVideoId(value)
    if (isValidVideoId(videoId)) {
      const existing = records.find((record) => record.videoId === videoId)
      if (existing) {
        showToast(t('kids.addDuplicate'))
        setInput('')
        return
      }
      approvedContent$.addRecord({
        videoId,
        title: '',
        language: 'mixed',
        category: 'everyday_knowledge',
        approvalStatus: 'pending',
        source: 'parent-added',
      })
      setInput('')
      showToast(t('kids.addVideo'))
      return
    }

    const handle = normalizeChannelValue(value)
    if (handle) {
      approvedContent$.addChannel({
        handle,
        url: value.startsWith('http') ? value : `https://www.youtube.com/@${handle}`,
        name: handle,
        language: 'mixed',
        category: 'everyday_knowledge',
      })
      setInput('')
      showToast(t('kids.addChannel'))
      return
    }

    showToast(t('kids.addInvalid'))
  }

  const importChannel = async (candidate: { id: string; url: string; name: string }) => {
    setBusy(true)
    try {
      const result = await fetchChannelCandidates(candidate.url)
      if (!result.videos.length) {
        showToast(t('kids.importChannelFailed'))
        return
      }
      for (const video of result.videos) {
        const existing = records.find((record) => record.videoId === video.videoId)
        if (existing) {
          continue
        }
        approvedContent$.addRecord({
          videoId: video.videoId,
          title: video.title,
          channelName: result.name || candidate.name,
          language: 'mixed',
          category: 'everyday_knowledge',
          approvalStatus: 'pending',
          approvalScope: 'channel',
          source: 'channel-import',
        })
      }
      approvedContent$.markChannelImported(candidate.id)
      showToast(t('kids.importChannelDone', { count: result.videos.length, defaultValue: '' }))
    } catch (error) {
      console.error('channel import failed', error)
      showToast(t('kids.importChannelFailed'))
    } finally {
      setBusy(false)
    }
  }

  const importSeed = () => {
    const count = approvedContent$.importSeed()
    showToast(t('kids.importSeedDone', { count, defaultValue: '' }))
  }

  const exportBackup = async () => {
    const snapshot = getApprovedContentSnapshot(library)
    const payload = JSON.stringify(snapshot, null, 2)
    try {
      const Clipboard = await import('expo-clipboard')
      await Clipboard.setStringAsync(payload)
    } catch (error) {
      console.error('export failed', error)
    }
    showToast(t('kids.exportDone'))
  }

  const list = tab === 'channels' ? [] : byStatus(tab)

  return (
    <BaseFullScreenModal
      title={t('kids.parentArea')}
      icon="verified-user"
      onClose={() => {
        parentGateSession$.lock()
        onClose()
      }}
      actions={
        <Pressable
          onPress={() => {
            parentGateSession$.lock()
            onClose()
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-900"
          accessibilityRole="button"
          accessibilityLabel={t('kids.lockNow')}
        >
          <MaterialIcons name="lock" size={20} />
        </Pressable>
      }
    >
      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <View className="flex-row gap-1 px-3 pb-2">
          {TABS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              className={clsx(
                'rounded-full px-3 py-1.5',
                tab === item ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800',
              )}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
            >
              <NouText className={clsx('text-xs font-medium', tab === item ? 'text-white' : '')}>
                {t(TAB_LABEL[item])}
              </NouText>
            </Pressable>
          ))}
        </View>

        <View className="mx-3 mb-3 rounded-2xl bg-white dark:bg-zinc-900 p-3">
          <View className="flex-row items-center gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('kids.addHint')}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={addFromInput}
              className="min-h-11 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 text-base text-zinc-950 dark:text-zinc-100"
              returnKeyType="done"
            />
            <NouButton size="1" onPress={addFromInput} disabled={!input.trim()}>
              {t('kids.addVideo')}
            </NouButton>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <NouButton size="1" variant="outline" onPress={importSeed}>
              {t('kids.importSeed')}
            </NouButton>
            <NouButton size="1" variant="outline" onPress={exportBackup}>
              {t('kids.exportBackup')}
            </NouButton>
          </View>
        </View>

        {nIf(
          tab === 'channels',
          <View className="mx-3 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
            {library.channels.length === 0 ? (
              <View className="px-4 py-6">
                <NouText className="text-sm text-zinc-500 dark:text-zinc-400">{t('kids.noItems')}</NouText>
              </View>
            ) : (
              library.channels.map((candidate: ChannelCandidate) => (
                <ChannelRow
                  key={candidate.id}
                  candidate={candidate}
                  onImport={() => void importChannel(candidate)}
                  onRemove={() => approvedContent$.removeChannel(candidate.id)}
                />
              ))
            )}
          </View>,
        )}

        {nIf(
          tab !== 'channels',
          <View className="mx-3 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
            {list.length === 0 ? (
              <View className="px-4 py-6">
                <NouText className="text-sm text-zinc-500 dark:text-zinc-400">{t('kids.noItems')}</NouText>
              </View>
            ) : (
              list.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  onPreview={(item) => onPreview(item.videoId)}
                />
              ))
            )}
          </View>,
        )}

        <View className="mx-3 mt-4 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
          <View className="flex-row items-center gap-3 px-4 py-3">
            <MaterialIcons name="shield" size={20} />
            <View className="flex-1">
              <NouText className="font-medium">{t('kids.kidsModeOn')}</NouText>
              <NouText className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t('kids.kidsModeHint')}</NouText>
            </View>
            <Pressable
              onPress={() => {
                settings$.kidsMode.set(!kidsMode)
                showToast(kidsMode ? t('kids.kidsModeOff') : t('kids.kidsModeOn'))
              }}
              className={clsx(
                'rounded-full px-3 py-1.5',
                kidsMode ? 'bg-green-100 dark:bg-green-900/40' : 'bg-zinc-200 dark:bg-zinc-700',
              )}
              accessibilityRole="button"
            >
              <NouText className="text-xs font-medium">{kidsMode ? t('menus.on') : t('menus.off')}</NouText>
            </Pressable>
          </View>
          <View className="flex-row items-center gap-3 border-t-2 border-zinc-100 dark:border-zinc-900 px-4 py-3">
            <MaterialIcons name="pin" size={20} />
            <View className="flex-1">
              <NouText className="font-medium">{t('kids.changePin')}</NouText>
              <NouText className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {parentGate$.hasPin.get() ? t('kids.currentPin') : t('kids.createPinTitle')}
              </NouText>
            </View>
            <Pressable
              onPress={() => {
                parentGate$.clearPin()
                showToast(t('kids.pinSet'))
                onClose()
              }}
              className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5"
              accessibilityRole="button"
            >
              <NouText className="text-xs font-medium">{t('kids.changePin')}</NouText>
            </Pressable>
          </View>
        </View>

        {nIf(
          isWeb,
          <NouText className="mt-4 px-4 text-xs text-zinc-500 dark:text-zinc-400">
            {t('kids.reviewBeforeApproving')}
          </NouText>,
        )}
      </ScrollView>
    </BaseFullScreenModal>
  )
}
