/**
 * Zeona — Journal Editor Screen
 * Distraction-free, calming writing sanctuary with title, tags, mood selector,
 * favorite toggle, live word/character count, autosave resilience, and unsaved changes confirmation.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ZText, ZButton, ZCard, ZBadge, ZDivider } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useJournalStore } from '@/store/journalStore';
import { triggerHaptic } from '@/utils/haptics';
import type { MoodTag } from '@/types';

const MOODS: { tag: MoodTag; emoji: string; label: string; color: string }[] = [
  { tag: 'calm', emoji: '😌', label: 'Calm', color: '#a7f3d0' },
  { tag: 'happy', emoji: '😊', label: 'Happy', color: '#fde68a' },
  { tag: 'grateful', emoji: '✨', label: 'Grateful', color: '#d8b4fe' },
  { tag: 'neutral', emoji: '😐', label: 'Neutral', color: '#e5e7eb' },
  { tag: 'anxious', emoji: '😟', label: 'Anxious', color: '#fca5a5' },
  { tag: 'sad', emoji: '🌧️', label: 'Low', color: '#bfdbfe' },
];

const SUGGESTED_TAGS = ['clarity', 'gratitude', 'peace', 'growth', 'mindfulness', 'nature', 'rest'];

export default function JournalEditorScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const isMemoryMode = type === 'photo';
  const {
    entries,
    draft,
    updateDraft,
    createEntry,
    updateEntry,
    saveDraftToStorage,
    discardDraft,
    favorites,
    toggleFavorite,
  } = useJournalStore();

  // Find existing entry if editing
  const existingEntry = useMemo(() => {
    if (!id) return null;
    return entries.find((e) => e.id === id) || null;
  }, [id, entries]);

  const isEditingExisting = Boolean(existingEntry);

  // Editor states
  const [title, setTitle] = useState(existingEntry ? existingEntry.title || '' : draft.title || '');
  const [content, setContent] = useState(existingEntry ? existingEntry.content || '' : draft.content || '');
  const [selectedMood, setSelectedMood] = useState<MoodTag | null>(
    existingEntry ? existingEntry.mood : draft.mood || 'calm'
  );
  const [tags, setTags] = useState<string[]>(
    existingEntry ? existingEntry.tags || [] : draft.tags || []
  );
  const [customTagInput, setCustomTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState<boolean>(
    existingEntry ? Boolean(favorites[existingEntry.id]) : false
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Track if changes were made
  const initialDataRef = useRef({
    title: existingEntry ? existingEntry.title || '' : '',
    content: existingEntry ? existingEntry.content || '' : '',
    mood: existingEntry ? existingEntry.mood : 'calm',
    tags: existingEntry ? existingEntry.tags || [] : [],
  });

  const hasUnsavedChanges = useMemo(() => {
    if (isEditingExisting) {
      return (
        title !== initialDataRef.current.title ||
        content !== initialDataRef.current.content ||
        selectedMood !== initialDataRef.current.mood ||
        JSON.stringify(tags) !== JSON.stringify(initialDataRef.current.tags)
      );
    }
    return Boolean(title.trim() || content.trim());
  }, [title, content, selectedMood, tags, isEditingExisting]);

  // Current formatted timestamp
  const nowFormatted = useMemo(() => {
    const d = existingEntry ? new Date(existingEntry.created_at) : new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [existingEntry]);

  // Autosave draft locally for new reflections (debounced)
  useEffect(() => {
    if (isEditingExisting) return;

    const timer = setTimeout(() => {
      if (title.trim() || content.trim()) {
        updateDraft({
          title,
          content,
          mood: selectedMood,
          tags,
        });
        const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setLastAutosaved(nowTime);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, content, selectedMood, tags, isEditingExisting, updateDraft]);

  // Stats
  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);
  const charCount = content.length;

  // Add custom tag
  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.replace(/^#/, '').trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    triggerHaptic();
    setTags([...tags, clean]);
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    triggerHaptic();
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Save Entry (Publication)
  const handleSaveEntry = async () => {
    if (!title.trim() && !content.trim()) {
      setErrorMessage('Please write a title or reflection text before saving.');
      return;
    }

    if (isSaving) return; // Prevent duplicate submission
    triggerHaptic();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (isEditingExisting && existingEntry) {
        // Update existing entry
        const updated = await updateEntry(existingEntry.id, {
          title: title.trim() || 'Untitled Reflection',
          content: content.trim(),
          mood: selectedMood,
          tags,
        });

        if (isFavorite !== Boolean(favorites[existingEntry.id])) {
          toggleFavorite(existingEntry.id);
        }

        setIsSaving(false);
        if (updated) {
          setSuccessNotice('Reflection updated ✨');
          setTimeout(() => {
            router.replace({ pathname: '/journal/[id]', params: { id: existingEntry.id } });
          }, 600);
        }
      } else {
        // Create new entry
        const newEntry = await createEntry({
          title: title.trim() || 'Untitled Reflection',
          content: content.trim(),
          mood: selectedMood,
          tags,
          type: isMemoryMode ? 'photo' : 'text',
        });

        if (newEntry && isFavorite) {
          toggleFavorite(newEntry.id);
        }

        setIsSaving(false);
        if (newEntry) {
          setSuccessNotice('Saved to your sanctuary ✨');
          setTimeout(() => {
            router.replace({ pathname: '/journal/[id]', params: { id: newEntry.id } });
          }, 600);
        }
      }
    } catch (err: any) {
      setIsSaving(false);
      setErrorMessage(err?.message || 'Failed to save reflection. Your text is safely kept in this editor.');
    }
  };

  // Save Draft explicitly
  const handleSaveDraft = async () => {
    triggerHaptic();
    updateDraft({
      title,
      content,
      mood: selectedMood,
      tags,
    });
    await saveDraftToStorage();
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setLastAutosaved(nowTime);
    setSuccessNotice('Draft saved securely 🌸');
    setTimeout(() => setSuccessNotice(null), 2500);
  };

  // Back button press with unsaved changes check
  const handleBack = () => {
    triggerHaptic();
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.responsiveContainer}>
          {/* ── Top App Bar ───────────────────────────────────────────── */}
          <View style={styles.topBar}>
            <Pressable
              onPress={handleBack}
              style={styles.backBtn}
              hitSlop={10}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
              <ZText variant="bodySmall" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                Back
              </ZText>
            </Pressable>

            {/* Favorite toggle & Save button */}
            <View style={styles.topBarActions}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setIsFavorite(!isFavorite);
                }}
                hitSlop={8}
                style={styles.favoriteBtn}
                accessibilityLabel="Toggle favorite"
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? '#e879f9' : colors.textTertiary}
                />
              </Pressable>

              <Pressable
                onPress={handleSaveDraft}
                hitSlop={8}
                style={styles.draftTextBtn}
              >
                <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                  Save Draft
                </ZText>
              </Pressable>

              <ZButton
                label={isEditingExisting ? 'Save ✨' : 'Publish ✨'}
                variant="primary"
                size="sm"
                isLoading={isSaving}
                onPress={handleSaveEntry}
              />
            </View>
          </View>

          {/* ── Feedback Notices ──────────────────────────────────────── */}
          {errorMessage && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <ZText variant="caption" color={colors.error} style={{ flex: 1 }}>
                {errorMessage}
              </ZText>
              <Pressable onPress={() => setErrorMessage(null)} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.error} />
              </Pressable>
            </View>
          )}

          {successNotice && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600', flex: 1 }}>
                {successNotice}
              </ZText>
            </View>
          )}

          {/* ── Main Writing Canvas ───────────────────────────────────── */}
          <ScrollView
            style={styles.scrollCanvas}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Timestamp & autosave status */}
            <View style={styles.timestampRow}>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                  {nowFormatted}
                </ZText>
              </View>

              {lastAutosaved && !isEditingExisting && (
                <ZText variant="caption" color={colors.textTertiary}>
                  Draft saved {lastAutosaved}
                </ZText>
              )}
            </View>

            {/* Editable Title Input */}
            <TextInput
              style={styles.titleInput}
              placeholder="Title of this moment…"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (errorMessage) setErrorMessage(null);
              }}
              multiline={false}
              autoCapitalize="sentences"
            />

            {/* ── Optional Mood Selector ──────────────────────────────── */}
            <View style={styles.moodSection}>
              <ZText variant="caption" color={colors.textSecondary} style={styles.sectionLabel}>
                How are you feeling?
              </ZText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
                {MOODS.map((m) => {
                  const isSelected = selectedMood === m.tag;
                  return (
                    <Pressable
                      key={m.tag}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedMood(isSelected ? null : m.tag);
                      }}
                      style={[
                        styles.moodChip,
                        isSelected && { backgroundColor: m.color, borderColor: colors.primary, borderWidth: 1.5 },
                      ]}
                    >
                      <ZText style={{ fontSize: 16 }}>{m.emoji}</ZText>
                      <ZText
                        variant="caption"
                        color={isSelected ? colors.textPrimary : colors.textSecondary}
                        style={isSelected ? { fontWeight: '700' } : undefined}
                      >
                        {m.label}
                      </ZText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Optional Tags ───────────────────────────────────────── */}
            <View style={styles.tagsSection}>
              <ZText variant="caption" color={colors.textSecondary} style={styles.sectionLabel}>
                Tags & Themes
              </ZText>

              {/* Tag pills list */}
              <View style={styles.tagPillContainer}>
                {tags.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => handleRemoveTag(t)}
                    style={styles.activeTagPill}
                    hitSlop={4}
                  >
                    <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                      #{t}
                    </ZText>
                    <Ionicons name="close-circle" size={13} color={colors.primary} />
                  </Pressable>
                ))}

                {/* Custom tag input field */}
                <View style={styles.addTagInputRow}>
                  <TextInput
                    style={styles.customTagInput}
                    placeholder="+ add tag"
                    placeholderTextColor={colors.textTertiary}
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                    onSubmitEditing={() => handleAddTag(customTagInput)}
                    returnKeyType="done"
                    autoCapitalize="none"
                  />
                  {customTagInput.trim().length > 0 && (
                    <Pressable onPress={() => handleAddTag(customTagInput)} hitSlop={6}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Suggested tags suggestions */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedTagsRow}>
                {SUGGESTED_TAGS.filter((st) => !tags.includes(st)).map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => handleAddTag(st)}
                    style={styles.suggestedTagChip}
                  >
                    <ZText variant="caption" color={colors.textTertiary}>
                      +{st}
                    </ZText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <ZDivider marginV={spacing[2]} />

            {/* ── Large Distraction-Free Content Input ─────────────────── */}
            <TextInput
              style={styles.contentInput}
              placeholder="What is on your heart and mind right now? Allow your thoughts to unfold gently…"
              placeholderTextColor={colors.textTertiary}
              value={content}
              onChangeText={(c) => {
                setContent(c);
                if (errorMessage) setErrorMessage(null);
              }}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              scrollEnabled={false}
            />

            <View style={{ height: spacing[16] }} />
          </ScrollView>

          {/* ── Bottom Stats Toolbar (Word & Char count) ─────────────── */}
          <View style={styles.statsToolbar}>
            <View style={styles.statsBadge}>
              <Ionicons name="text-outline" size={14} color={colors.textTertiary} />
              <ZText variant="caption" color={colors.textSecondary}>
                {wordCount} {wordCount === 1 ? 'word' : 'words'} • {charCount} characters
              </ZText>
            </View>

            {hasUnsavedChanges && (
              <ZText variant="caption" color={colors.primaryDark} style={{ fontStyle: 'italic' }}>
                Unsaved changes
              </ZText>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Unsaved Changes Exit Confirmation Modal ─────────────────── */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.exitModalCard} radius={radii['2xl']} elevation="md">
            <View style={styles.exitIconWrapper}>
              <Ionicons name="bookmark-outline" size={28} color={colors.primary} />
            </View>

            <ZText variant="headingSmall" color={colors.textPrimary} align="center">
              Unsaved Thoughts
            </ZText>
            <ZText variant="bodySmall" color={colors.textSecondary} align="center">
              You have written thoughts that have not been saved yet. Would you like to save this as a draft before leaving?
            </ZText>

            <View style={styles.exitModalButtons}>
              <ZButton
                label="Save as Draft & Exit 🌸"
                variant="primary"
                size="md"
                onPress={async () => {
                  setShowExitModal(false);
                  await handleSaveDraft();
                  router.back();
                }}
              />
              <ZButton
                label="Discard Changes"
                variant="outline"
                size="md"
                onPress={async () => {
                  setShowExitModal(false);
                  if (!isEditingExisting) {
                    await discardDraft();
                  }
                  router.back();
                }}
              />
              <ZButton
                label="Keep Writing"
                variant="ghost"
                size="sm"
                onPress={() => setShowExitModal(false)}
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
  keyboardView: { flex: 1 },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
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
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  favoriteBtn: {
    padding: spacing[1],
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftTextBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: layout.screenPaddingH,
    marginTop: spacing[2],
    padding: spacing[2.5],
    backgroundColor: colors.errorSubtle,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: layout.screenPaddingH,
    marginTop: spacing[2],
    padding: spacing[2.5],
    backgroundColor: '#dcfce7',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },

  scrollCanvas: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[3],
    paddingBottom: spacing[10],
  },

  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radii.full,
  },

  titleInput: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 26,
    color: colors.primaryDark,
    paddingVertical: spacing[2],
    paddingHorizontal: 0,
    letterSpacing: -0.4,
  },

  moodSection: {
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  sectionLabel: {
    marginBottom: spacing[1.5],
    fontWeight: '600',
  },
  moodRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  moodChip: {
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

  tagsSection: {
    marginBottom: spacing[1],
  },
  tagPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  activeTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  addTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customTagInput: {
    fontSize: 13,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    padding: 0,
    minWidth: 70,
  },
  suggestedTagsRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
    paddingVertical: 2,
  },
  suggestedTagChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
  },

  contentInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
    minHeight: 300,
    paddingVertical: spacing[2],
    paddingHorizontal: 0,
  },

  statsToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[2.5],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  exitModalCard: {
    width: '100%',
    maxWidth: 420,
    padding: spacing[6],
    gap: spacing[3],
    alignItems: 'center',
  },
  exitIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  exitModalButtons: {
    width: '100%',
    gap: spacing[2],
    marginTop: spacing[2],
  },
});
