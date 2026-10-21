import { Pressable, ScrollView, View } from 'react-native'
import { useValue } from '@legendapp/state/react'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { clsx, nIf } from '@/lib/utils'
import { NouText } from '@/components/NouText'
import { approvedContent$ } from '@/states/approved-content'
import { buildKidsLibrary, getKidsThumbnail } from '@/lib/kids-library'
import type { ContentRecord } from '@/lib/content-policy'
/** The palette in this app has no green or red, so the two are spelled out. */
const APPROVED_COLOR = '#16a34a'

/**
 * The child facing home.
 *
 * It is built from the approved library and nothing else: there is no feed,
 * no search and no recommendation here, so the child cannot reach anything a
 * parent has not looked at. The categories are in the learning order, with
 * Bengali first.
 */

const VideoCard: React.FC<{ record: ContentRecord; onPlay: (videoId: string) => void }> = ({
  record,
  onPlay,
}) => {
  const { t } = useTranslation()

  return (
    <Pressable
      onPress={() => onPlay(record.videoId)}
      accessibilityRole="button"
      accessibilityLabel={record.title}
      className="w-44 mr-3 rounded-2xl bg-white dark:bg-zinc-900 p-2 active:opacity-70"
    >
      <View className="rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800">
        <Image
          source={{ uri: getKidsThumbnail(record.videoId) }}
          style={{ width: '100%', height: 99 }}
          contentFit="cover"
          transition={150}
        />
      </View>
      <NouText className="mt-2 text-sm font-medium leading-5" numberOfLines={2}>
        {record.title || t('kids.noItems')}
      </NouText>
      {nIf(
        record.channelName,
        <NouText className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
          {record.channelName}
        </NouText>,
      )}
      {nIf(
        record.ageBand,
        <View className="mt-1 self-start rounded-full bg-indigo-100 dark:bg-zinc-800 px-2 py-0.5">
          <NouText className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
            {record.ageBand}
          </NouText>
        </View>,
      )}
      <View className="mt-1 flex-row items-center gap-1">
        <MaterialIcons name="verified" size={12} color={APPROVED_COLOR} />
        <NouText className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {t('kids.approved')}
        </NouText>
      </View>
    </Pressable>
  )
}

export const KidsHome: React.FC<{
  onPlay: (videoId: string) => void
  onOpenParent: () => void
}> = ({ onPlay, onOpenParent }) => {
  const { t } = useTranslation()
  const approvedContent = useValue(approvedContent$)
  const library = buildKidsLibrary(approvedContent.records)
  const hasItems = library.length > 0

  return (
    <ScrollView
      className="flex-1 bg-zinc-100 dark:bg-zinc-950"
      contentContainerClassName="px-4 pt-4 pb-10"
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <NouText className="text-2xl font-bold">{t('kids.appName')}</NouText>
          <NouText className="text-sm text-zinc-500 dark:text-zinc-400">{t('kids.tagline')}</NouText>
        </View>
        <Pressable
          onPress={onOpenParent}
          accessibilityRole="button"
          accessibilityLabel={t('kids.parentButton')}
          className="h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-zinc-900 active:opacity-70"
        >
          <MaterialIcons name="lock" size={20} />
        </Pressable>
      </View>

      {nIf(
        !hasItems,
        <View className="mt-10 items-center rounded-3xl bg-white dark:bg-zinc-900 px-6 py-10">
          <MaterialIcons name="school" size={48} />
          <NouText className="mt-4 text-center text-base font-semibold">{t('kids.emptyTitle')}</NouText>
          <NouText className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t('kids.emptyHint')}
          </NouText>
          <Pressable
            onPress={onOpenParent}
            className="mt-6 rounded-full bg-indigo-600 px-6 py-3 active:opacity-70"
            accessibilityRole="button"
          >
            <NouText className="font-semibold text-white">{t('kids.parentArea')}</NouText>
          </Pressable>
        </View>,
      )}

      {library.map((group) => (
        <View key={group.group} className="mb-7">
          <NouText className="mb-2 text-[13px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            {t(`kids.groups.${group.group}`)}
          </NouText>
          {group.categories.map((entry) => (
            <View key={entry.category} className="mb-4">
              <NouText className="mb-2 text-base font-semibold">{t(`kids.categories.${entry.category}`)}</NouText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {entry.records.map((record) => (
                  <VideoCard key={record.id} record={record} onPlay={onPlay} />
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

/** How many videos the child can watch right now. */
export const useApprovedCount = () => {
  const approvedContent = useValue(approvedContent$)
  return approvedContent.records.filter((record: ContentRecord) => record.approvalStatus === 'approved').length
}

export const kidsHomeClass = (visible: boolean) => clsx(visible ? 'flex-1' : 'hidden')
