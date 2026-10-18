/**
 * Zeona — Memories Gallery Screen
 *
 * Browse and search cherished memories:
 * - Card and Grid layout toggles
 * - Search by title, description, and tags
 * - Filter by All, Favorites, This Month, and This Year
 * - Image carousel / preview with private signed URLs and graceful placeholders
 * - Quick favorite toggle with haptic feedback
 * - Direct navigation to Memory Detail (/memories/[id]) and Editor (/memories/editor)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, radii, shadows } from '@/constants/theme';
import { ZText } from '@/components/ui/ZText';
import { ZCard } from '@/components/ui/ZCard';
import { ZButton } from '@/components/ui/ZButton';
import { ZBadge } from '@/components/ui/ZBadge';
import { triggerHaptic } from '@/utils/haptics';

import { useMemoryStore } from '@/store/memoryStore';
import type { Memory, MemoryFilter, MemoryLayout } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

// ── Format Memory Date ────────────────────────────────────────────────────────
function formatMemoryDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function MemoriesScreen() {
  const router = useRouter();
  const { memories, isLoading, fetchMemories, toggleFavorite } = useMemoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<MemoryFilter>('all');
  const [layout, setLayout] = useState<MemoryLayout>('card');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerHaptic();
    await fetchMemories();
    setIsRefreshing(false);
  };

  // Filter and search logic
  const filteredMemories = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${currentYear}-${currentMonth}`;

    return memories.filter((memory) => {
      // 1. Filter Chip Matching
      if (filter === 'favorites' && !memory.is_favorite) {
        return false;
      }
      if (filter === 'month' && !memory.memory_date.startsWith(currentYearMonth)) {
        return false;
      }
      if (filter === 'year' && !memory.memory_date.startsWith(String(currentYear))) {
        return false;
      }

      // 2. Search Query Matching
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = memory.title.toLowerCase().includes(q);
        const descMatch = (memory.description || '').toLowerCase().includes(q);
        const tagsMatch = (memory.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [memories, filter, searchQuery]);

  // Counts for filter chips
  const favoritesCount = useMemo(() => {
    return memories.filter((m) => m.is_favorite).length;
  }, [memories]);

  // Handle favorite toggle with haptic
  const handleToggleFavorite = (id: string, e: any) => {
    e.stopPropagation?.();
    triggerHaptic();
    toggleFavorite(id);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.responsiveWrapper}>
          {/* ── Top Header Bar ────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                router.back();
              }}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTextWrapper}>
              <ZText variant="headingLarge" color={colors.textBrand}>
                Memories
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Cherished moments, milestones & celebrations 🌸
              </ZText>
            </View>

            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                router.push('/memories/editor');
              }}
              style={styles.addQuickButton}
              accessibilityLabel="Add new memory"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <ZText variant="caption" color="#fff" style={{ fontWeight: '700', marginLeft: 4 }}>
                New
              </ZText>
            </Pressable>
          </View>

          {/* ── Search & Layout Bar ───────────────────────────────────────── */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search memories or #tags…"
                placeholderTextColor={colors.textTertiary}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  hitSlop={8}
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Layout Toggle (Card vs Grid) */}
            <View style={styles.layoutToggleWrapper}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setLayout('card');
                }}
                style={[styles.layoutBtn, layout === 'card' && styles.layoutBtnActive]}
                accessibilityLabel="Card View"
              >
                <Ionicons
                  name="albums-outline"
                  size={18}
                  color={layout === 'card' ? colors.primary : colors.textTertiary}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setLayout('grid');
                }}
                style={[styles.layoutBtn, layout === 'grid' && styles.layoutBtnActive]}
                accessibilityLabel="Grid View"
              >
                <Ionicons
                  name="grid-outline"
                  size={18}
                  color={layout === 'grid' ? colors.primary : colors.textTertiary}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Filter Chips ──────────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              onPress={() => {
                triggerHaptic();
                setFilter('all');
              }}
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            >
              <ZText
                variant="caption"
                color={filter === 'all' ? colors.primary : colors.textSecondary}
                style={filter === 'all' ? { fontWeight: '700' } : undefined}
              >
                All ({memories.length})
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setFilter('favorites');
              }}
              style={[styles.filterChip, filter === 'favorites' && styles.filterChipActive]}
            >
              <Ionicons
                name="heart"
                size={14}
                color={filter === 'favorites' ? '#e11d48' : colors.textTertiary}
                style={{ marginRight: 4 }}
              />
              <ZText
                variant="caption"
                color={filter === 'favorites' ? colors.primary : colors.textSecondary}
                style={filter === 'favorites' ? { fontWeight: '700' } : undefined}
              >
                Favorites ({favoritesCount})
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setFilter('month');
              }}
              style={[styles.filterChip, filter === 'month' && styles.filterChipActive]}
            >
              <ZText
                variant="caption"
                color={filter === 'month' ? colors.primary : colors.textSecondary}
                style={filter === 'month' ? { fontWeight: '700' } : undefined}
              >
                This Month
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setFilter('year');
              }}
              style={[styles.filterChip, filter === 'year' && styles.filterChipActive]}
            >
              <ZText
                variant="caption"
                color={filter === 'year' ? colors.primary : colors.textSecondary}
                style={filter === 'year' ? { fontWeight: '700' } : undefined}
              >
                This Year
              </ZText>
            </Pressable>
          </ScrollView>

          {/* ── Content States ────────────────────────────────────────────── */}
          {isLoading ? (
            <ZCard elevation="sm" radius={radii.xl} style={styles.stateCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ZText variant="bodyMedium" color={colors.textSecondary} style={{ marginTop: spacing[3] }}>
                Gathering your cherished memories…
              </ZText>
            </ZCard>
          ) : filteredMemories.length === 0 ? (
            /* ── Empty State ─────────────────────────────────────────────── */
            <ZCard elevation="sm" radius={radii.xl} style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="images-outline" size={38} color={colors.primary} />
              </View>
              <ZText variant="headingMedium" color={colors.textBrand} style={{ marginTop: spacing[3] }}>
                {searchQuery.trim().length > 0 || filter !== 'all'
                  ? 'No matching memories'
                  : 'Your Memory Garden Awaits'}
              </ZText>
              <ZText
                variant="bodySmall"
                color={colors.textSecondary}
                style={{ textAlign: 'center', marginTop: spacing[2], maxWidth: 360, lineHeight: 20 }}
              >
                {searchQuery.trim().length > 0 || filter !== 'all'
                  ? 'Try clearing your search query or switching filters to see other memories.'
                  : 'Capture the small joys, milestones, photographs, and quiet celebrations of your life.'}
              </ZText>
              <View style={{ marginTop: spacing[4] }}>
                {searchQuery.trim().length > 0 || filter !== 'all' ? (
                  <ZButton
                    label="Clear Filters"
                    variant="outline"
                    size="md"
                    onPress={() => {
                      triggerHaptic();
                      setSearchQuery('');
                      setFilter('all');
                    }}
                  />
                ) : (
                  <ZButton
                    label="Add First Memory"
                    variant="primary"
                    size="md"
                    onPress={() => {
                      triggerHaptic();
                      router.push('/memories/editor');
                    }}
                    leftIcon={<Ionicons name="add" size={18} color="#fff" />}
                  />
                )}
              </View>
            </ZCard>
          ) : layout === 'card' ? (
            /* ── Card Layout (Full Storytelling Cards) ────────────────────── */
            <View style={styles.cardsList}>
              {filteredMemories.map((memory) => {
                const hasPhotos = memory.image_urls && memory.image_urls.length > 0;
                const firstPhoto = hasPhotos ? memory.image_urls[0] : null;

                return (
                  <Pressable
                    key={memory.id}
                    onPress={() => {
                      triggerHaptic();
                      router.push(`/memories/${memory.id}`);
                    }}
                    style={styles.cardPressable}
                    accessibilityRole="button"
                    accessibilityLabel={`View memory ${memory.title}`}
                  >
                    <ZCard elevation="sm" radius={radii['2xl']} style={styles.memoryCard}>
                      {/* Photo Banner or Botanical Placeholder */}
                      {hasPhotos && firstPhoto ? (
                        <View style={styles.photoBannerWrapper}>
                          <Image
                            source={{ uri: firstPhoto }}
                            style={styles.photoBanner}
                            resizeMode="cover"
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.4)']}
                            style={styles.photoGradientOverlay}
                          />
                          {memory.image_urls.length > 1 && (
                            <View style={styles.photoCountBadge}>
                              <Ionicons name="images" size={12} color="#fff" />
                              <ZText variant="caption" color="#fff" style={{ marginLeft: 4, fontWeight: '700' }}>
                                +{memory.image_urls.length - 1}
                              </ZText>
                            </View>
                          )}
                        </View>
                      ) : (
                        <LinearGradient
                          colors={['#fdf4ff', '#f5f3ff', '#ede9fe']}
                          style={styles.placeholderBanner}
                        >
                          <Ionicons name="sparkles" size={28} color={colors.primaryLight} />
                          <ZText variant="caption" color={colors.primaryDark} style={{ marginTop: 4, fontWeight: '600' }}>
                            A gentle memory
                          </ZText>
                        </LinearGradient>
                      )}

                      {/* Card Body */}
                      <View style={styles.cardBody}>
                        {/* Top Meta Row */}
                        <View style={styles.cardMetaRow}>
                          <View style={styles.dateChip}>
                            <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                            <ZText variant="caption" color={colors.textSecondary} style={{ marginLeft: 4 }}>
                              {formatMemoryDate(memory.memory_date)}
                            </ZText>
                          </View>

                          <Pressable
                            hitSlop={8}
                            onPress={(e) => handleToggleFavorite(memory.id, e)}
                            style={styles.favoriteButton}
                            accessibilityLabel={memory.is_favorite ? 'Remove favorite' : 'Add to favorites'}
                          >
                            <Ionicons
                              name={memory.is_favorite ? 'heart' : 'heart-outline'}
                              size={20}
                              color={memory.is_favorite ? '#e11d48' : colors.textTertiary}
                            />
                          </Pressable>
                        </View>

                        {/* Title */}
                        <ZText variant="headingSmall" color={colors.textBrand} style={styles.memoryTitle}>
                          {memory.title}
                        </ZText>

                        {/* Description Preview */}
                        {memory.description && (
                          <ZText
                            variant="bodySmall"
                            color={colors.textSecondary}
                            numberOfLines={2}
                            style={styles.descriptionSnippet}
                          >
                            {memory.description}
                          </ZText>
                        )}

                        {/* Tags */}
                        {memory.tags && memory.tags.length > 0 && (
                          <View style={styles.tagsContainer}>
                            {memory.tags.map((tag) => (
                              <View key={tag} style={styles.tagChip}>
                                <ZText variant="caption" color={colors.primary} style={{ fontSize: 11, fontWeight: '600' }}>
                                  #{tag}
                                </ZText>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </ZCard>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            /* ── Grid Layout (2-Column Gallery Tiles) ─────────────────────── */
            <View style={styles.gridContainer}>
              {filteredMemories.map((memory) => {
                const hasPhotos = memory.image_urls && memory.image_urls.length > 0;
                const firstPhoto = hasPhotos ? memory.image_urls[0] : null;

                return (
                  <Pressable
                    key={memory.id}
                    onPress={() => {
                      triggerHaptic();
                      router.push(`/memories/${memory.id}`);
                    }}
                    style={styles.gridTilePressable}
                    accessibilityRole="button"
                    accessibilityLabel={`View memory ${memory.title}`}
                  >
                    <ZCard elevation="sm" radius={radii.xl} style={styles.gridTileCard}>
                      {hasPhotos && firstPhoto ? (
                        <Image
                          source={{ uri: firstPhoto }}
                          style={styles.gridTileImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={['#faf5ff', '#ede9fe']}
                          style={styles.gridTilePlaceholder}
                        >
                          <Ionicons name="sparkles-outline" size={24} color={colors.primaryLight} />
                        </LinearGradient>
                      )}

                      {/* Favorite Icon Pill */}
                      <Pressable
                        hitSlop={6}
                        onPress={(e) => handleToggleFavorite(memory.id, e)}
                        style={styles.gridFavoriteBadge}
                      >
                        <Ionicons
                          name={memory.is_favorite ? 'heart' : 'heart-outline'}
                          size={16}
                          color={memory.is_favorite ? '#e11d48' : '#ffffff'}
                        />
                      </Pressable>

                      {/* Bottom Gradient with Info */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.gridTileOverlay}
                      >
                        <ZText variant="caption" color="#fff" style={{ fontSize: 10, opacity: 0.9 }}>
                          {formatMemoryDate(memory.memory_date)}
                        </ZText>
                        <ZText
                          variant="label"
                          color="#fff"
                          numberOfLines={1}
                          style={{ fontWeight: '700', marginTop: 2 }}
                        >
                          {memory.title}
                        </ZText>
                      </LinearGradient>
                    </ZCard>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
    paddingTop: spacing[2],
  },
  responsiveWrapper: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2.5],
    ...shadows.sm,
  },
  headerTextWrapper: {
    flex: 1,
  },
  addQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    ...shadows.sm,
  },

  // Search & Layout
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2.5],
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: spacing[3],
    height: 44,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearSearchBtn: {
    padding: 4,
  },
  layoutToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radii.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  layoutBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layoutBtnActive: {
    backgroundColor: colors.primarySubtle,
  },

  // Filter Chips
  filterScroll: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryLight,
  },

  // States
  stateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card Layout
  cardsList: {
    gap: spacing[3.5],
  },
  cardPressable: {
    width: '100%',
  },
  memoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    padding: 0,
  },
  photoBannerWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  photoBanner: {
    width: '100%',
    height: '100%',
  },
  photoGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  photoCountBadge: {
    position: 'absolute',
    top: spacing[2.5],
    right: spacing[2.5],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  placeholderBanner: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: spacing[4],
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 4,
  },
  memoryTitle: {
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  descriptionSnippet: {
    lineHeight: 18,
    marginBottom: spacing[2.5],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },

  // Grid Layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  gridTilePressable: {
    width: '48%',
  },
  gridTileCard: {
    height: 170,
    position: 'relative',
    overflow: 'hidden',
    padding: 0,
  },
  gridTileImage: {
    width: '100%',
    height: '100%',
  },
  gridTilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridFavoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  gridTileOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[2.5],
  },
});
