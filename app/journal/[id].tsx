/**
 * Zeona — Journal Detail Screen
 * Elegant, contemplative view of a single reflection with formatted date, mood, tags,
 * entry type, favorite toggle, edit action, and destructive delete confirmation.
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ZText, ZCard, ZBadge, ZButton, ZDivider } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useJournalStore } from '@/store/journalStore';
import { triggerHaptic } from '@/utils/haptics';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import type { MoodTag } from '@/types';

const MOOD_COLORS: Record<MoodTag, string> = {
  happy: '#fde68a',
  calm: '#a7f3d0',
  neutral: '#e5e7eb',
  anxious: '#fca5a5',
  sad: '#bfdbfe',
  angry: '#fecaca',
  grateful: '#d8b4fe',
  excited: '#fbcfe8',
};

const MOOD_EMOJIS: Record<MoodTag, string> = {
  happy: '😊',
  calm: '😌',
  neutral: '😐',
  anxious: '😟',
  sad: '🌧️',
  angry: '😤',
  grateful: '✨',
  excited: '🌸',
};

export default function JournalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, favorites, toggleFavorite, deleteEntry } = useJournalStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find target entry
  const entry = useMemo(() => {
    return entries.find((e) => e.id === id) || null;
  }, [entries, id]);

  const isFav = entry ? Boolean(favorites[entry.id]) : false;

  const formattedDate = useMemo(() => {
    if (!entry) return '';
    const d = new Date(entry.created_at);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [entry]);

  const formattedTime = useMemo(() => {
    if (!entry) return '';
    const d = new Date(entry.created_at);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [entry]);

  // Handle destructive delete
  const handleConfirmDelete = async () => {
    if (!entry) return;
    triggerHaptic();
    setIsDeleting(true);
    await deleteEntry(entry.id);
    setIsDeleting(false);
    setShowDeleteModal(false);
    router.replace('/(tabs)/journal');
  };

  // If entry not found
  if (!entry) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <ZText style={{ fontSize: 36, marginBottom: spacing[2] }}>🌸</ZText>
          <ZText variant="headingMedium" color={colors.textPrimary} align="center">
            Reflection not found
          </ZText>
          <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ marginTop: spacing[1] }}>
            This memory may have been removed or moved to another place.
          </ZText>
          <View style={{ marginTop: spacing[4] }}>
            <ZButton
              label="Return to Journal"
              variant="primary"
              size="md"
              onPress={() => router.replace('/(tabs)/journal')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const moodColor = entry.mood ? MOOD_COLORS[entry.mood] : colors.border;
  const moodEmoji = entry.mood ? MOOD_EMOJIS[entry.mood] : '🌸';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.responsiveContainer}>
        {/* ── Top Bar with Clear Back Navigation ──────────────────────── */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityLabel="Back to journal library"
          >
            <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
            <ZText variant="bodySmall" color={colors.primaryDark} style={{ fontWeight: '600' }}>
              Journal
            </ZText>
          </Pressable>

          <View style={styles.topActions}>
            {/* Favorite toggle */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                toggleFavorite(entry.id);
              }}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={22}
                color={isFav ? '#e879f9' : colors.textTertiary}
              />
            </Pressable>

            {/* Edit action */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push({ pathname: '/journal/editor', params: { id: entry.id } });
              }}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel="Edit reflection"
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>

            {/* Delete action */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setShowDeleteModal(true);
              }}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityLabel="Delete reflection"
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* ── Complete Entry Scroll Content ────────────────────────────── */}
        <ScrollView
          style={styles.scrollCanvas}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Metadata badges row: Type, Date, Privacy */}
          <View style={styles.metaRow}>
            <View style={styles.typePill}>
              <Ionicons
                name={
                  entry.type === 'voice'
                    ? 'mic-outline'
                    : entry.type === 'photo'
                    ? 'image-outline'
                    : 'book-outline'
                }
                size={14}
                color={colors.primary}
              />
              <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                {entry.type === 'voice'
                  ? 'Voice Diary'
                  : entry.type === 'photo'
                  ? 'Photo Memory'
                  : 'Personal Reflection'}
              </ZText>
            </View>

            <View style={styles.privacyPill}>
              <Ionicons
                name={entry.is_private ? 'lock-closed-outline' : 'globe-outline'}
                size={12}
                color={colors.textTertiary}
              />
              <ZText variant="caption" color={colors.textTertiary}>
                {entry.is_private ? 'Private Sanctuary' : 'Shared'}
              </ZText>
            </View>
          </View>

          {/* Formatted Date & Time */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
            <ZText variant="bodySmall" color={colors.textSecondary}>
              {formattedDate} at {formattedTime}
            </ZText>
          </View>

          {/* Title */}
          <ZText variant="displayMedium" color={colors.primaryDark} style={styles.titleText}>
            {entry.title || 'Untitled Reflection'}
          </ZText>

          {/* Mood Badge */}
          {entry.mood && (
            <View style={styles.moodBadgeContainer}>
              <View style={[styles.moodBadge, { backgroundColor: moodColor }]}>
                <ZText style={{ fontSize: 16 }}>{moodEmoji}</ZText>
                <ZText variant="caption" color={colors.textPrimary} style={{ fontWeight: '700' }}>
                  Feeling {entry.mood}
                </ZText>
              </View>
            </View>
          )}

          {/* Tags list */}
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {entry.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                    #{tag}
                  </ZText>
                </View>
              ))}
            </View>
          )}

          {/* Real Audio Player if voice diary or audio present */}
          {(entry.type === 'voice' || Boolean(entry.audio_url)) && entry.audio_url && (
            <AudioPlayer
              audioUrl={entry.audio_url}
              duration={entry.audio_duration}
              title={entry.title || 'Voice Reflection'}
              style={{ marginVertical: spacing[2] }}
            />
          )}

          <ZDivider marginV={spacing[3]} />

          {/* Complete Entry Content Text */}
          <ZText variant="bodyLarge" color={colors.textPrimary} style={styles.bodyContent}>
            {entry.content || 'No written reflection text.'}
          </ZText>

          <View style={{ height: spacing[16] }} />
        </ScrollView>
      </View>

      {/* ── Destructive Deletion Confirmation Modal ───────────────────── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.deleteModalCard} radius={radii['2xl']} elevation="md">
            <View style={styles.deleteIconWrapper}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>

            <ZText variant="headingSmall" color={colors.textPrimary} align="center">
              Delete reflection?
            </ZText>
            <ZText variant="bodySmall" color={colors.textSecondary} align="center">
              This entry will be permanently removed from your sanctuary. This action cannot be undone.
            </ZText>

            <View style={styles.modalButtonStack}>
              <ZButton
                label="Delete Permanently"
                variant="primary"
                size="md"
                isLoading={isDeleting}
                onPress={handleConfirmDelete}
                style={{ backgroundColor: colors.error }}
              />
              <ZButton
                label="Keep Reflection"
                variant="outline"
                size="md"
                onPress={() => setShowDeleteModal(false)}
              />
            </View>
          </ZCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },

  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: layout.minTouchTarget,
    paddingRight: spacing[2],
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },

  scrollCanvas: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing[2],
  },

  titleText: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 30,
    lineHeight: 38,
    color: colors.primaryDark,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },

  moodBadgeContainer: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    marginBottom: spacing[2],
  },
  tagChip: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },

  audioPlayerCard: {
    padding: spacing[3.5],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing[2],
  },
  audioPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xs,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: radii.full,
  },

  bodyContent: {
    fontFamily: fontFamilies.sans,
    fontSize: 17,
    lineHeight: 28,
    color: colors.textPrimary,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing[6],
    gap: spacing[3],
    alignItems: 'center',
  },
  deleteIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.errorSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  modalButtonStack: {
    width: '100%',
    gap: spacing[2],
    marginTop: spacing[2],
  },
});
