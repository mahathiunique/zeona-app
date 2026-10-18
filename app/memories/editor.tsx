/**
 * Zeona — Memory Editor Screen
 *
 * Add or edit a cherished memory:
 * - Title, description, and date
 * - Multi-photo selection and upload using Expo Image Picker
 * - Uploads to private Supabase Storage bucket ('memories')
 * - Enforces 10MB file-size limits, loading states, and upload failure handling
 * - Context tags (presets + custom tags)
 * - Favorite toggle
 * - Safe data persistence and validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, radii, shadows } from '@/constants/theme';
import { ZText } from '@/components/ui/ZText';
import { ZCard } from '@/components/ui/ZCard';
import { ZButton } from '@/components/ui/ZButton';
import { ZBadge } from '@/components/ui/ZBadge';
import { ZDivider } from '@/components/ui/ZDivider';
import { triggerHaptic } from '@/utils/haptics';

import { useMemoryStore } from '@/store/memoryStore';
import { useAuthStore } from '@/store/authStore';
import { uploadMemoryPhoto, MAX_FILE_SIZE_BYTES } from '@/services/photoStorage';
import { getLocalTodayDateString } from '@/store/moodStore';
import type { Memory } from '@/types';

const PRESET_TAGS = [
  'Celebration',
  'Travel',
  'Nature',
  'Family',
  'Friends',
  'Milestone',
  'Home',
  'Peace',
];

export default function MemoryEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const memoryId = params.id;

  const { memories, addMemory, updateMemory } = useMemoryStore();
  const user = useAuthStore((s) => s.user);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState(getLocalTodayDateString());
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);

  // Loading & Validation
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // If editing an existing memory, populate form
  useEffect(() => {
    if (memoryId) {
      const existing = memories.find((m) => m.id === memoryId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description || '');
        setMemoryDate(existing.memory_date);
        setImageUrls(existing.image_urls || []);
        setIsFavorite(Boolean(existing.is_favorite));
        setSelectedTags(existing.tags || []);
      }
    }
  }, [memoryId, memories]);

  // Handle Pick Photos
  const handlePickPhotos = async () => {
    triggerHaptic();
    setValidationError('');

    try {
      // Request permission
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo Permission Needed',
            'Please grant Zeona photo library access in your settings to attach memories.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsUploadingPhoto(true);

      const uploadedUrls: string[] = [];
      const currentUserId = user?.id || 'local-user';

      for (const asset of result.assets) {
        // Enforce 10MB size limit if provided
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
          Alert.alert('File too large', `Photo "${asset.fileName || 'selected image'}" exceeds the 10MB limit.`);
          continue;
        }

        try {
          const uploadRes = await uploadMemoryPhoto({
            uri: asset.uri,
            userId: currentUserId,
            fileSize: asset.fileSize,
          });
          uploadedUrls.push(uploadRes.viewUrl);
        } catch (uploadErr: any) {
          console.warn('[Zeona Memory Editor] Upload photo failed:', uploadErr);
          // Fallback to local asset URI so user NEVER loses their chosen photo
          uploadedUrls.push(asset.uri);
        }
      }

      setImageUrls((prev) => [...prev, ...uploadedUrls]);
      setIsUploadingPhoto(false);
    } catch (err: any) {
      console.warn('[Zeona Memory Editor] Error picking images:', err);
      setIsUploadingPhoto(false);
      setValidationError('Could not load photos. Please try again.');
    }
  };

  // Remove photo from memory
  const handleRemovePhoto = (indexToRemove: number) => {
    triggerHaptic();
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Toggle tag
  const handleToggleTag = (tag: string) => {
    triggerHaptic();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Add custom tag
  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    triggerHaptic();
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setCustomTagInput('');
    setShowCustomTagInput(false);
  };

  // Date shortcut
  const handleSetDate = (daysAgo: number) => {
    triggerHaptic();
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setMemoryDate(getLocalTodayDateString(d));
  };

  // Save or Update Memory
  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      triggerHaptic();
      setValidationError('Please give your memory a title');
      return;
    }

    setIsSaving(true);
    triggerHaptic();

    try {
      if (memoryId) {
        await updateMemory(memoryId, {
          title: trimmedTitle,
          description: description.trim() || null,
          image_urls: imageUrls,
          memory_date: memoryDate,
          is_favorite: isFavorite,
          tags: selectedTags,
        });
      } else {
        await addMemory({
          title: trimmedTitle,
          description: description.trim() || null,
          image_urls: imageUrls,
          memory_date: memoryDate,
          is_favorite: isFavorite,
          tags: selectedTags,
        });
      }

      setIsSaving(false);
      router.back();
    } catch {
      setIsSaving(false);
      setValidationError('Could not save memory. Please check your connection and try again.');
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
          {/* ── Top Header ──────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                router.back();
              }}
              style={styles.backButton}
              accessibilityLabel="Cancel and go back"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTextWrapper}>
              <ZText variant="headingMedium" color={colors.textBrand}>
                {memoryId ? 'Edit Memory' : 'Capture Memory'}
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Preserve a meaningful moment in your sanctuary 🌸
              </ZText>
            </View>

            <Pressable
              hitSlop={8}
              onPress={() => {
                triggerHaptic();
                setIsFavorite(!isFavorite);
              }}
              style={styles.favoriteToggleBtn}
              accessibilityLabel={isFavorite ? 'Remove favorite' : 'Mark favorite'}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#e11d48' : colors.textTertiary}
              />
            </Pressable>
          </View>

          {/* ── Form Card ────────────────────────────────────────────────── */}
          <ZCard elevation="sm" radius={radii['2xl']} style={styles.formCard}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <ZText variant="label" color={colors.textPrimary} style={styles.inputLabel}>
                Memory Title *
              </ZText>
              <TextInput
                value={title}
                onChangeText={(val) => {
                  setTitle(val);
                  if (validationError) setValidationError('');
                }}
                placeholder="e.g. Stargazing at the lake, Baking with Mom…"
                placeholderTextColor={colors.textTertiary}
                style={styles.textInput}
              />
            </View>

            {/* Date Selector */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithShortcutsRow}>
                <ZText variant="label" color={colors.textPrimary} style={styles.inputLabel}>
                  Date
                </ZText>
                <View style={styles.dateShortcutsRow}>
                  <Pressable onPress={() => handleSetDate(0)} style={styles.dateShortcutBtn}>
                    <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                      Today
                    </ZText>
                  </Pressable>
                  <Pressable onPress={() => handleSetDate(1)} style={styles.dateShortcutBtn}>
                    <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                      Yesterday
                    </ZText>
                  </Pressable>
                </View>
              </View>

              <View style={styles.dateInputBox}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <TextInput
                  value={memoryDate}
                  onChangeText={setMemoryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.dateTextInput}
                />
              </View>
            </View>

            {/* Description Textarea */}
            <View style={styles.inputGroup}>
              <ZText variant="label" color={colors.textPrimary} style={styles.inputLabel}>
                Story & Reflection
              </ZText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What made this moment special? Describe the scents, laughter, sounds, or quiet feelings…"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={styles.textAreaInput}
              />
            </View>

            {/* Photos Section */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithShortcutsRow}>
                <ZText variant="label" color={colors.textPrimary} style={styles.inputLabel}>
                  Photographs ({imageUrls.length})
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Max 10MB per photo
                </ZText>
              </View>

              {/* Photo Thumbnails */}
              {imageUrls.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                  {imageUrls.map((uri, idx) => (
                    <View key={`${uri}-${idx}`} style={styles.photoThumbWrapper}>
                      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                      <Pressable
                        hitSlop={6}
                        onPress={() => handleRemovePhoto(idx)}
                        style={styles.removePhotoBtn}
                        accessibilityLabel="Remove photo"
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Add Photos Button */}
              <Pressable
                onPress={handlePickPhotos}
                disabled={isUploadingPhoto}
                style={styles.addPhotoDashedBtn}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.addPhotoContent}>
                    <Ionicons name="camera-outline" size={22} color={colors.primary} />
                    <ZText variant="bodySmall" color={colors.primary} style={{ fontWeight: '600', marginLeft: 8 }}>
                      {imageUrls.length > 0 ? 'Add More Photos' : 'Choose Photos from Library'}
                    </ZText>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Context Tags */}
            <View style={styles.inputGroup}>
              <ZText variant="label" color={colors.textPrimary} style={styles.inputLabel}>
                Tags & Themes
              </ZText>
              <View style={styles.tagsFlexWrap}>
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => handleToggleTag(tag)}
                      style={[styles.tagPill, isSelected && styles.tagPillActive]}
                    >
                      <ZText
                        variant="caption"
                        color={isSelected ? colors.primary : colors.textSecondary}
                        style={isSelected ? { fontWeight: '700' } : undefined}
                      >
                        #{tag}
                      </ZText>
                    </Pressable>
                  );
                })}

                {/* Custom Selected Tags not in preset */}
                {selectedTags
                  .filter((t) => !PRESET_TAGS.includes(t))
                  .map((customTag) => (
                    <Pressable
                      key={customTag}
                      onPress={() => handleToggleTag(customTag)}
                      style={[styles.tagPill, styles.tagPillActive]}
                    >
                      <ZText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                        #{customTag} ✕
                      </ZText>
                    </Pressable>
                  ))}

                {/* Add Custom Tag Pill */}
                {!showCustomTagInput ? (
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      setShowCustomTagInput(true);
                    }}
                    style={styles.addCustomTagPill}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <ZText variant="caption" color={colors.primary} style={{ marginLeft: 2, fontWeight: '600' }}>
                      Custom
                    </ZText>
                  </Pressable>
                ) : null}
              </View>

              {/* Custom Tag Input Field */}
              {showCustomTagInput && (
                <View style={styles.customTagInputRow}>
                  <TextInput
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                    placeholder="Enter tag name…"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.customTagField}
                    autoFocus
                    onSubmitEditing={handleAddCustomTag}
                  />
                  <Pressable onPress={handleAddCustomTag} style={styles.customTagAddBtn}>
                    <ZText variant="caption" color="#fff" style={{ fontWeight: '700' }}>
                      Add
                    </ZText>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Validation Error Message */}
            {validationError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <ZText variant="caption" color={colors.error} style={{ marginLeft: 6, flex: 1 }}>
                  {validationError}
                </ZText>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <ZButton
                label={isSaving ? 'Saving…' : memoryId ? 'Update Memory' : 'Save Memory'}
                variant="primary"
                size="md"
                isLoading={isSaving}
                onPress={handleSave}
                fullWidth
              />
            </View>
          </ZCard>

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
    maxWidth: 680,
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
  favoriteToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  // Form Card
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: spacing[4],
  },
  inputGroup: {
    marginBottom: spacing[3.5],
  },
  inputLabel: {
    fontWeight: '700',
    marginBottom: spacing[1.5],
  },
  labelWithShortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  dateShortcutsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  dateShortcutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
  },

  // Inputs
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3.5],
    height: 46,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3.5],
    height: 46,
  },
  dateTextInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 15,
    color: colors.textPrimary,
  },
  textAreaInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 120,
    lineHeight: 20,
  },

  // Photo Strip
  photoStrip: {
    flexDirection: 'row',
    marginBottom: spacing[2.5],
  },
  photoThumbWrapper: {
    width: 90,
    height: 90,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginRight: spacing[2],
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoDashedBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    borderRadius: radii.xl,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySubtle,
  },
  addPhotoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Tags
  tagsFlexWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tagPill: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagPillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryLight,
  },
  addCustomTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  customTagInputRow: {
    flexDirection: 'row',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  customTagField: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    height: 38,
    fontSize: 13,
    color: colors.textPrimary,
  },
  customTagAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3.5],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    padding: spacing[2.5],
    borderRadius: radii.md,
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: '#fecdd3',
  },

  // Actions
  actionsRow: {
    marginTop: spacing[2],
  },
});
