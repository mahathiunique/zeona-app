/**
 * Zeona — Journal Library Screen
 * Full-featured personal reflection library with search, category filters,
 * newest/oldest sorting, favorites, entry detail/editing modal, FAB, and real user data.
 */

import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  ZText,
  ZCard,
  ZBadge,
  ZButton,
  ZDivider,
} from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useJournalStore, JournalFilter, JournalSort } from '@/store/journalStore';
import { triggerHaptic } from '@/utils/haptics';
import type { JournalEntry, MoodTag } from '@/types';

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

const FILTER_TABS: { key: JournalFilter; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'All', label: 'All', icon: 'grid-outline' },
  { key: 'Text', label: 'Text', icon: 'book-outline' },
  { key: 'Voice', label: 'Voice', icon: 'mic-outline' },
  { key: 'Photos', label: 'Photos', icon: 'image-outline' },
  { key: 'Favs', label: 'Favorites', icon: 'heart-outline' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Entry Card Component ─────────────────────────────────────────────────────
interface EntryCardProps {
  entry: JournalEntry;
  isFav: boolean;
  onToggleFav: () => void;
  onPress: () => void;
}

function EntryCard({ entry, isFav, onToggleFav, onPress }: EntryCardProps) {
  const moodColor = entry.mood ? MOOD_COLORS[entry.mood] : colors.border;

  return (
    <Pressable
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      <ZCard style={styles.entryCard} elevation="sm" radius={radii['2xl']}>
        {/* Header row */}
        <View style={styles.entryHeader}>
          <View style={styles.entryHeaderLeft}>
            <View style={styles.entryTypePill}>
              <Ionicons
                name={
                  entry.type === 'voice'
                    ? 'mic-outline'
                    : entry.type === 'photo'
                    ? 'image-outline'
                    : 'book-outline'
                }
                size={13}
                color={colors.primary}
              />
              <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                {entry.type === 'voice' ? 'Voice Diary' : entry.type === 'photo' ? 'Photo Memory' : 'Reflection'}
              </ZText>
            </View>
            <ZText variant="caption" color={colors.textTertiary}>
              {formatDate(entry.created_at)} • {formatTime(entry.created_at)}
            </ZText>
          </View>

          <Pressable
            hitSlop={12}
            onPress={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onToggleFav();
            }}
            style={styles.favBtn}
            accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav ? '#e879f9' : colors.textTertiary}
            />
          </Pressable>
        </View>

        {/* Title */}
        {entry.title ? (
          <ZText variant="headingSmall" color={colors.textPrimary} style={styles.entryTitle}>
            {entry.title}
          </ZText>
        ) : null}

        {/* Voice waveform simulation */}
        {entry.type === 'voice' && (
          <View style={styles.waveformContainer}>
            <View style={styles.audioPlayBubble}>
              <Ionicons name="play" size={14} color={colors.textInverse} />
            </View>
            <View style={styles.waveformBarRow}>
              {[35, 60, 45, 90, 75, 40, 65, 80, 50, 70, 40, 60, 30].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    { height: (h / 100) * 22, backgroundColor: i < 5 ? colors.primary : colors.primaryLight },
                  ]}
                />
              ))}
            </View>
            <ZText variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
              01:45
            </ZText>
          </View>
        )}

        {/* Short Text Preview */}
        {entry.content ? (
          <ZText
            variant="bodySmall"
            color={colors.textSecondary}
            numberOfLines={2}
            style={styles.entryContentPreview}
          >
            {entry.content}
          </ZText>
        ) : null}

        {/* Footer info: Mood tag and privacy status */}
        <View style={styles.cardFooter}>
          {entry.mood ? (
            <ZBadge
              label={entry.mood}
              color={colors.textPrimary}
              backgroundColor={moodColor}
            />
          ) : (
            <View />
          )}

          <View style={styles.privacyTag}>
            <Ionicons
              name={entry.is_private ? 'lock-closed-outline' : 'globe-outline'}
              size={12}
              color={colors.textTertiary}
            />
            <ZText variant="caption" color={colors.textTertiary}>
              {entry.is_private ? 'Private' : 'Shared'}
            </ZText>
          </View>
        </View>
      </ZCard>
    </Pressable>
  );
}

// ── Main Journal Library Screen ──────────────────────────────────────────────
export default function JournalScreen() {
  const router = useRouter();
  const {
    entries,
    favorites,
    toggleFavorite,
    hasUnsavedDraft,
    activeFilter,
    setActiveFilter,
    sortBy,
    setSortBy,
    isLoading,
    error,
    fetchEntries,
  } = useJournalStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Filter and Sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let list = entries.filter((e) => {
      // 1. Search filter: matches either title or content
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = e.title?.toLowerCase().includes(q) ?? false;
        const matchContent = e.content?.toLowerCase().includes(q) ?? false;
        if (!matchTitle && !matchContent) return false;
      }

      // 2. Category filter
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Text') return e.type === 'text';
      if (activeFilter === 'Voice') return e.type === 'voice';
      if (activeFilter === 'Photos') return e.type === 'photo';
      if (activeFilter === 'Favs') return Boolean(favorites[e.id]);
      return true;
    });

    // 3. Sorting by date
    list = [...list].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [entries, searchQuery, activeFilter, sortBy, favorites]);

  // Open entry detail screen
  const handleOpenEntry = (entry: JournalEntry) => {
    triggerHaptic();
    router.push({ pathname: '/journal/[id]', params: { id: entry.id } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.responsiveContainer}>
        {/* ── 1. Page Heading ────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ gap: 2 }}>
            <ZText variant="displayMedium" color={colors.textBrand}>
              Journal Library
            </ZText>
            <ZText variant="caption" color={colors.textSecondary}>
              {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'} in your sanctuary
            </ZText>
          </View>

          {/* Action buttons: Voice recording & Write */}
          <View style={styles.headerBtnGroup}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/journal/voice');
              }}
              style={({ pressed }) => [styles.voiceBtn, { opacity: pressed ? 0.85 : 1 }]}
              accessibilityLabel="Record voice reflection"
            >
              <Ionicons name="mic" size={16} color={colors.primary} />
              <ZText variant="label" color={colors.primaryDark}>
                Voice
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/journal/editor');
              }}
              style={({ pressed }) => [styles.writeBtn, { opacity: pressed ? 0.85 : 1 }]}
              accessibilityLabel="Write new reflection"
            >
              <Ionicons name="create-outline" size={16} color={colors.textInverse} />
              <ZText variant="label" color={colors.textInverse}>
                Write
              </ZText>
            </Pressable>
          </View>
        </View>

        {/* ── 2. Search Bar ────────────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or reflection text…"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              hitSlop={8}
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* ── Unsaved Draft Banner ─────────────────────────────────────── */}
        {hasUnsavedDraft && (
          <Pressable
            onPress={() => {
              triggerHaptic();
              router.push('/(tabs)/create');
            }}
            style={({ pressed }) => [styles.draftBanner, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.draftIconBubble}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <ZText variant="label" color={colors.primaryDark}>
                Draft in progress ✨
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Your unwritten reflection is saved • Tap to resume
              </ZText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        )}

        {/* ── 3. Filter Chips & Sort Controls ─────────────────────────── */}
        <View style={styles.controlsRow}>
          {/* Horizontally scrollable filter chips on mobile */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollView}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    triggerHaptic();
                    setActiveFilter(tab.key);
                  }}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? colors.textInverse : colors.textSecondary}
                  />
                  <ZText
                    variant="caption"
                    color={isActive ? colors.textInverse : colors.textSecondary}
                    style={isActive ? { fontWeight: '700' } : undefined}
                  >
                    {tab.label}
                  </ZText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Sort Toggle (Newest / Oldest) */}
          <Pressable
            onPress={() => {
              triggerHaptic();
              setSortBy(sortBy === 'newest' ? 'oldest' : 'newest');
            }}
            style={styles.sortToggleBtn}
            accessibilityLabel={`Sort by ${sortBy === 'newest' ? 'oldest' : 'newest'}`}
          >
            <Ionicons name="swap-vertical" size={14} color={colors.primary} />
            <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
              {sortBy === 'newest' ? 'Newest' : 'Oldest'}
            </ZText>
          </Pressable>
        </View>

        {/* ── Loading & Error States ──────────────────────────────────── */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ZText variant="bodySmall" color={colors.textSecondary}>
              Loading your sanctuary reflections…
            </ZText>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <ZText variant="caption" color={colors.error} style={{ flex: 1 }}>
              {error}
            </ZText>
            <ZButton
              label="Retry"
              variant="outline"
              size="sm"
              onPress={fetchEntries}
            />
          </View>
        )}

        {/* ── 4. Entry List & Empty States ────────────────────────────── */}
        {!isLoading && filteredAndSortedEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ZText style={{ fontSize: 44, marginBottom: spacing[2] }}>
              {searchQuery.trim() || activeFilter !== 'All' ? '🔍' : '📖'}
            </ZText>
            <ZText variant="headingMedium" color={colors.textPrimary} align="center">
              {searchQuery.trim() || activeFilter !== 'All'
                ? 'No matching reflections'
                : 'Your sanctuary awaits its first reflection'}
            </ZText>
            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.emptySubtitle}>
              {searchQuery.trim() || activeFilter !== 'All'
                ? 'Try adjusting your search terms or selecting another filter.'
                : 'Write, record a voice diary, or capture a memory. This is your safe haven.'}
            </ZText>

            <View style={{ marginTop: spacing[4] }}>
              {searchQuery.trim() ? (
                <ZButton
                  label="Clear search"
                  variant="outline"
                  size="md"
                  onPress={() => {
                    triggerHaptic();
                    setSearchQuery('');
                  }}
                />
              ) : activeFilter === 'Voice' ? (
                <View style={{ gap: spacing[2], alignItems: 'center' }}>
                  <ZButton
                    label="Record Voice Reflection 🎙️"
                    variant="primary"
                    size="lg"
                    onPress={() => {
                      triggerHaptic();
                      router.push('/journal/voice');
                    }}
                  />
                  <ZButton
                    label="Show All Reflections"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      triggerHaptic();
                      setActiveFilter('All');
                    }}
                  />
                </View>
              ) : activeFilter !== 'All' ? (
                <ZButton
                  label="Clear filters"
                  variant="outline"
                  size="md"
                  onPress={() => {
                    triggerHaptic();
                    setActiveFilter('All');
                  }}
                />
              ) : (
                <ZButton
                  label="Write First Entry ✨"
                  variant="primary"
                  size="lg"
                  onPress={() => {
                    triggerHaptic();
                    router.push('/journal/editor');
                  }}
                />
              )}
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredAndSortedEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EntryCard
                entry={item}
                isFav={Boolean(favorites[item.id])}
                onToggleFav={() => toggleFavorite(item.id)}
                onPress={() => handleOpenEntry(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}

        {/* ── 5. Floating Action Button (FAB) ─────────────────────────── */}
        <Pressable
          onPress={() => {
            triggerHaptic();
            router.push('/journal/editor');
          }}
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityLabel="Create new journal entry"
        >
          <Ionicons name="add" size={26} color={colors.textInverse} />
          <ZText variant="label" color={colors.textInverse} style={{ fontWeight: '700' }}>
            New Entry
          </ZText>
        </Pressable>
      </View>
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

  // 1. Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#ede7f6',
  },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    ...shadows.xs,
  },

  // 2. Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: layout.screenPaddingH,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[3.5],
    paddingVertical: Platform.OS === 'ios' ? spacing[2.5] : spacing[1.5],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: fontFamilies.sans,
    padding: 0,
  },

  // Draft banner
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginHorizontal: layout.screenPaddingH,
    marginBottom: spacing[2.5],
    padding: spacing[3],
    backgroundColor: colors.primarySubtle,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  draftIconBubble: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 3. Filter Chips & Sort
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  filterScrollView: {
    flexDirection: 'row',
    gap: spacing[1.5],
    paddingRight: spacing[2],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    backgroundColor: colors.primarySubtle,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },

  // Loading & Error
  loadingBox: {
    padding: spacing[6],
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: layout.screenPaddingH,
    marginBottom: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.errorSubtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },

  // 4. Entry List
  listContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[16],
  },
  entryCard: {
    gap: spacing[2],
    padding: spacing[4],
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favBtn: {
    padding: 2,
  },
  entryTitle: {
    marginTop: spacing[1],
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primarySubtle,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  audioPlayBubble: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformBarRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: radii.full,
  },
  entryContentPreview: {
    lineHeight: 20,
    marginTop: spacing[1],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  privacyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
  },
  emptySubtitle: {
    marginTop: spacing[1],
    maxWidth: 320,
    lineHeight: 20,
  },

  // 5. Floating Action Button
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: layout.screenPaddingH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.full,
    ...shadows.sm,
  },

  // 6. Entry Detail & Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? spacing[4] : 0,
  },
  modalSafeArea: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 680,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: Platform.OS === 'web' ? radii['3xl'] : undefined,
    borderTopLeftRadius: radii['3xl'],
    borderTopRightRadius: radii['3xl'],
    padding: spacing[5],
    maxHeight: '100%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  modalScroll: {
    maxHeight: 400,
    marginVertical: spacing[2],
  },
  viewContent: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  fullContentText: {
    lineHeight: 24,
    marginTop: spacing[2],
  },
  editForm: {
    gap: spacing[2],
  },
  editTitleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 16,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundMuted,
  },
  editContentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 15,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundMuted,
    minHeight: 140,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing[1.5],
  },
});
