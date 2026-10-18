/**
 * Zeona — Memory Detail Screen
 *
 * Full memory viewing, photo gallery, editing, and deletion:
 * - High-resolution photo gallery with active preview
 * - Formatted date, title, tags, and story description
 * - Favorite heart toggle
 * - Edit memory navigation
 * - Deletion with confirmation modal
 * - Safe authenticated storage cleanup
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, radii, shadows } from '@/constants/theme';
import { ZText } from '@/components/ui/ZText';
import { ZCard } from '@/components/ui/ZCard';
import { ZButton } from '@/components/ui/ZButton';
import { ZBadge } from '@/components/ui/ZBadge';
import { ZDivider } from '@/components/ui/ZDivider';
import { triggerHaptic } from '@/utils/haptics';

import { useMemoryStore } from '@/store/memoryStore';
import type { Memory } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

function formatFullDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function MemoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const memoryId = params.id;

  const { memories, toggleFavorite, deleteMemory } = useMemoryStore();

  const memory = useMemo(() => {
    return memories.find((m) => m.id === memoryId);
  }, [memories, memoryId]);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // If memory not found
  if (!memory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="sparkles-outline" size={48} color={colors.primaryLight} />
          <ZText variant="headingMedium" color={colors.textBrand} style={{ marginTop: spacing[3] }}>
            Memory Not Found
          </ZText>
          <ZText variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[4] }}>
            This memory may have been removed or does not exist.
          </ZText>
          <ZButton label="Return to Memories" variant="primary" size="md" onPress={() => router.replace('/memories')} />
        </View>
      </SafeAreaView>
    );
  }

  const hasPhotos = memory.image_urls && memory.image_urls.length > 0;
  const currentPhoto = hasPhotos ? memory.image_urls[activePhotoIndex] || memory.image_urls[0] : null;

  // Handle favorite toggle
  const handleToggleFavorite = () => {
    triggerHaptic();
    toggleFavorite(memory.id);
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    triggerHaptic();
    try {
      await deleteMemory(memory.id);
      setIsDeleting(false);
      setShowDeleteModal(false);
      router.replace('/memories');
    } catch {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
              style={styles.circleBtn}
              accessibilityLabel="Back to Memories"
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerSpacer} />

            {/* Favorite Button */}
            <Pressable
              hitSlop={8}
              onPress={handleToggleFavorite}
              style={styles.circleBtn}
              accessibilityLabel={memory.is_favorite ? 'Remove favorite' : 'Add to favorites'}
            >
              <Ionicons
                name={memory.is_favorite ? 'heart' : 'heart-outline'}
                size={22}
                color={memory.is_favorite ? '#e11d48' : colors.textPrimary}
              />
            </Pressable>

            {/* Edit Button */}
            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                router.push({ pathname: '/memories/editor', params: { id: memory.id } });
              }}
              style={styles.circleBtn}
              accessibilityLabel="Edit memory"
            >
              <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
            </Pressable>

            {/* Delete Button */}
            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                setShowDeleteModal(true);
              }}
              style={styles.circleBtn}
              accessibilityLabel="Delete memory"
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          </View>

          {/* ── Photo Gallery Section ──────────────────────────────────────── */}
          {hasPhotos && currentPhoto ? (
            <View style={styles.galleryWrapper}>
              <View style={styles.mainPhotoWrapper}>
                <Image
                  source={{ uri: currentPhoto }}
                  style={styles.mainPhotoImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.photoOverlayGradient}
                />
                {memory.image_urls.length > 1 && (
                  <View style={styles.photoCounterPill}>
                    <ZText variant="caption" color="#fff" style={{ fontWeight: '700' }}>
                      {activePhotoIndex + 1} / {memory.image_urls.length}
                    </ZText>
                  </View>
                )}
              </View>

              {/* Thumbnails strip if multiple photos */}
              {memory.image_urls.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                  {memory.image_urls.map((photoUri, idx) => {
                    const isSelected = idx === activePhotoIndex;
                    return (
                      <Pressable
                        key={`${photoUri}-${idx}`}
                        onPress={() => {
                          triggerHaptic();
                          setActivePhotoIndex(idx);
                        }}
                        style={[
                          styles.thumbItem,
                          isSelected && styles.thumbItemSelected,
                        ]}
                      >
                        <Image source={{ uri: photoUri }} style={styles.thumbImage} resizeMode="cover" />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : (
            /* Botanical Decorative Banner if No Photos Attached */
            <LinearGradient
              colors={['#faf5ff', '#ede9fe', '#f3e8ff']}
              style={styles.noPhotoBanner}
            >
              <Ionicons name="sparkles" size={36} color={colors.primaryLight} />
              <ZText variant="caption" color={colors.primaryDark} style={{ marginTop: 6, fontWeight: '600' }}>
                Cherished Reflection Sanctuary
              </ZText>
            </LinearGradient>
          )}

          {/* ── Memory Content Card ────────────────────────────────────────── */}
          <ZCard elevation="sm" radius={radii['2xl']} style={styles.contentCard}>
            {/* Date Row */}
            <View style={styles.metaRow}>
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <ZText variant="caption" color={colors.primary} style={{ marginLeft: 6, fontWeight: '700' }}>
                  {formatFullDate(memory.memory_date)}
                </ZText>
              </View>

              {memory.is_favorite && (
                <ZBadge label="Favorite ❤️" color="#e11d48" backgroundColor="#ffe4e6" />
              )}
            </View>

            {/* Title */}
            <ZText variant="headingLarge" color={colors.textBrand} style={styles.titleText}>
              {memory.title}
            </ZText>

            {/* Context Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {memory.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <ZText variant="caption" color={colors.primary} style={{ fontSize: 12, fontWeight: '600' }}>
                      #{tag}
                    </ZText>
                  </View>
                ))}
              </View>
            )}

            <ZDivider style={{ marginVertical: spacing[3] }} />

            {/* Story Description */}
            {memory.description ? (
              <ZText variant="bodyLarge" color={colors.textPrimary} style={styles.storyText}>
                {memory.description}
              </ZText>
            ) : (
              <ZText variant="bodyMedium" color={colors.textTertiary} style={{ fontStyle: 'italic' }}>
                No story written for this memory.
              </ZText>
            )}

            <ZDivider style={{ marginVertical: spacing[4] }} />

            {/* Footer Timestamps */}
            <View style={styles.footerRow}>
              <ZText variant="caption" color={colors.textTertiary}>
                Preserved on {new Date(memory.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </ZText>
            </View>
          </ZCard>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center" style={{ marginTop: 12 }}>
              Delete Memory?
            </ZText>

            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ marginTop: 8, lineHeight: 20 }}>
              Are you sure you want to remove "{memory.title}"? Any attached photos in private storage will also be deleted.
            </ZText>

            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                size="md"
                onPress={() => setShowDeleteModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ZButton
                label="Delete"
                variant="danger"
                size="md"
                isLoading={isDeleting}
                onPress={handleConfirmDelete}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    gap: spacing[2],
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerSpacer: {
    flex: 1,
  },

  // Photo Gallery
  galleryWrapper: {
    marginBottom: spacing[3.5],
  },
  mainPhotoWrapper: {
    width: '100%',
    height: 320,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    ...shadows.md,
  },
  mainPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  photoCounterPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  thumbScroll: {
    flexDirection: 'row',
    marginTop: spacing[2.5],
  },
  thumbItem: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginRight: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbItemSelected: {
    borderColor: colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  noPhotoBanner: {
    width: '100%',
    height: 140,
    borderRadius: radii['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3.5],
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Content Card
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: spacing[5],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2.5],
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  titleText: {
    fontWeight: '800',
    marginBottom: spacing[2],
    lineHeight: 30,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing[1],
  },
  tagChip: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  storyText: {
    lineHeight: 26,
    color: colors.textPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: radii['2xl'],
    padding: spacing[5],
    alignItems: 'center',
    ...shadows.lg,
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    marginTop: spacing[5],
    width: '100%',
  },

  // Not Found
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
});
