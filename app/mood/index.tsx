/**
 * Zeona — Mood Check-in Screen
 *
 * Mindful emotional check-ins:
 * - 5 clear, accessible mood options (Happy, Calm, Neutral, Anxious, Sad)
 * - Multi-channel accessibility: distinct icon shapes, descriptive text, and contrast borders
 * - Optional reflection note, calendar date, and customizable context tags
 * - Save check-in with gentle confirmation and immediate navigation options
 * - Complete mood history with filtering, editing, and deletion
 * - Non-clinical, compassionate philosophy avoiding forced positivity
 * - User-scoped Supabase persistence with offline AsyncStorage resilience
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radii, shadows } from '@/constants/theme';
import { ZText } from '@/components/ui/ZText';
import { ZCard } from '@/components/ui/ZCard';
import { ZButton } from '@/components/ui/ZButton';
import { ZBadge } from '@/components/ui/ZBadge';
import { ZDivider } from '@/components/ui/ZDivider';
import { triggerHaptic } from '@/utils/haptics';

import { useMoodStore, getLocalTodayDateString } from '@/store/moodStore';
import type { CoreMood, MoodEntry } from '@/types';

// ── Accessible Mood Definition ───────────────────────────────────────────────

interface MoodConfig {
  tag: CoreMood;
  label: string;
  subtitle: string;
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgSubtle: string;
  supportMessage: string;
}

const MOOD_CONFIGS: Record<CoreMood, MoodConfig> = {
  happy: {
    tag: 'happy',
    label: 'Happy',
    subtitle: 'Joyful, light & uplifted',
    emoji: '☀️',
    icon: 'sunny-outline',
    color: '#d97706', // High-contrast amber
    bgSubtle: '#fffbeb',
    supportMessage: 'Cherishing this bright light. Savoring the joy that blooms today.',
  },
  calm: {
    tag: 'calm',
    label: 'Calm',
    subtitle: 'Peaceful, grounded & centered',
    emoji: '🌿',
    icon: 'leaf-outline',
    color: '#059669', // High-contrast emerald/sage
    bgSubtle: '#ecfdf5',
    supportMessage: 'A quiet stillness. Breathing deeply and honoring your grounded peace.',
  },
  neutral: {
    tag: 'neutral',
    label: 'Neutral',
    subtitle: 'Present, balanced & okay',
    emoji: '☁️',
    icon: 'pause-circle-outline',
    color: '#7c3aed', // High-contrast lavender violet
    bgSubtle: '#f5f3ff',
    supportMessage: 'Steady and present. Moving gently with the flow of the ordinary.',
  },
  anxious: {
    tag: 'anxious',
    label: 'Anxious',
    subtitle: 'Restless, tense & unsettled',
    emoji: '🌊',
    icon: 'pulse-outline',
    color: '#ea580c', // High-contrast warm coral
    bgSubtle: '#fff7ed',
    supportMessage: 'Holding space for this fluttering heart. You are safe, and you do not have to fix everything right now.',
  },
  sad: {
    tag: 'sad',
    label: 'Sad',
    subtitle: 'Tender, heavy & quiet',
    emoji: '🌧️',
    icon: 'rainy-outline',
    color: '#0284c7', // High-contrast sky blue
    bgSubtle: '#f0f9ff',
    supportMessage: 'Giving your quiet, tender heart room to rest. All feelings belong here.',
  },
};

const PRESET_TAGS = [
  'Work',
  'Family',
  'Health',
  'Sleep',
  'Solitude',
  'Nature',
  'Exercise',
  'Social',
  'Creativity',
  'Rest',
  'Finances',
  'Weather',
];

export default function MoodCheckInScreen() {
  const router = useRouter();

  // Store state
  const entries = useMoodStore((s) => s.entries);
  const saveCheckIn = useMoodStore((s) => s.saveCheckIn);
  const updateEntry = useMoodStore((s) => s.updateEntry);
  const deleteEntry = useMoodStore((s) => s.deleteEntry);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'checkin' | 'history'>('checkin');

  // Form State
  const [selectedMood, setSelectedMood] = useState<CoreMood | null>(null);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loggedDate, setLoggedDate] = useState(getLocalTodayDateString());
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagField, setShowCustomTagField] = useState(false);

  // Edit State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Status & Modal States
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<MoodEntry | null>(null);

  // History Filter
  const [historyFilter, setHistoryFilter] = useState<CoreMood | 'all'>('all');

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return entries;
    return entries.filter((e) => e.mood === historyFilter);
  }, [entries, historyFilter]);

  // Current Mood Config
  const activeConfig = selectedMood ? MOOD_CONFIGS[selectedMood] : null;

  // Select a mood option
  const handleSelectMood = (mood: CoreMood) => {
    triggerHaptic();
    setSelectedMood(mood);
    if (validationError) setValidationError('');
  };

  // Toggle context tag
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
    setShowCustomTagField(false);
  };

  // Save or Update check-in
  const handleSave = async () => {
    if (!selectedMood) {
      triggerHaptic();
      setValidationError('Please select how you are feeling before saving');
      return;
    }

    setIsSaving(true);
    triggerHaptic();

    try {
      if (editingEntryId) {
        await updateEntry(editingEntryId, {
          mood: selectedMood,
          note: note.trim() || null,
          tags: selectedTags,
          logged_date: loggedDate,
        });
      } else {
        await saveCheckIn({
          mood: selectedMood,
          note: note.trim() || undefined,
          tags: selectedTags,
          logged_date: loggedDate,
        });
      }

      setIsSaving(false);
      setShowSavedModal(true);
    } catch {
      setIsSaving(false);
      setValidationError('Could not save check-in. Please try again.');
    }
  };

  // Reset form to clean state
  const resetForm = () => {
    setSelectedMood(null);
    setNote('');
    setSelectedTags([]);
    setLoggedDate(getLocalTodayDateString());
    setEditingEntryId(null);
    setValidationError('');
  };

  // Edit an existing entry
  const handleStartEdit = (entry: MoodEntry) => {
    triggerHaptic();
    setEditingEntryId(entry.id);
    setSelectedMood(entry.mood);
    setNote(entry.note || '');
    setSelectedTags(entry.tags || []);
    setLoggedDate(entry.logged_date);
    setValidationError('');
    setActiveTab('checkin');
  };

  // Delete entry confirmation
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    triggerHaptic();
    await deleteEntry(entryToDelete.id);
    setEntryToDelete(null);
  };

  // Format date display
  const formatDateLabel = (dateStr: string) => {
    const todayStr = getLocalTodayDateString();
    if (dateStr === todayStr) return 'Today';

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, (m || 1) - 1, d || 1);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>

            <View style={styles.headerTextWrapper}>
              <ZText variant="headingLarge" color={colors.textBrand}>
                Mood Sanctuary
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Honoring how you feel with kind curiosity 🌸
              </ZText>
            </View>
          </View>

          {/* ── Tabs: Check-in vs History ───────────────────────────────── */}
          <View style={styles.tabSegment}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveTab('checkin');
              }}
              style={[
                styles.tabButton,
                activeTab === 'checkin' && styles.tabButtonActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'checkin' }}
            >
              <ZText
                variant="label"
                color={activeTab === 'checkin' ? colors.primary : colors.textSecondary}
                style={activeTab === 'checkin' ? { fontWeight: '700' } : undefined}
              >
                {editingEntryId ? 'Edit Check-in' : 'New Check-in'}
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveTab('history');
              }}
              style={[
                styles.tabButton,
                activeTab === 'history' && styles.tabButtonActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'history' }}
            >
              <ZText
                variant="label"
                color={activeTab === 'history' ? colors.primary : colors.textSecondary}
                style={activeTab === 'history' ? { fontWeight: '700' } : undefined}
              >
                Mood History ({entries.length})
              </ZText>
            </Pressable>
          </View>

          {/* ── Tab 1: Check-in Form ────────────────────────────────────── */}
          {activeTab === 'checkin' && (
            <View>
              {/* Gentle disclaimer & philosophy banner */}
              <ZCard elevation="none" radius={radii.xl} style={styles.philosophyCard}>
                <Ionicons name="heart-half-outline" size={20} color={colors.primary} />
                <ZText variant="caption" color={colors.textSecondary} style={styles.philosophyText}>
                  Zeona is a space for self-compassion, not a clinical assessment. All emotions belong here—no need to force positivity or hide what feels tender.
                </ZText>
              </ZCard>

              {/* Editing Banner */}
              {editingEntryId && (
                <View style={styles.editingBanner}>
                  <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600', flex: 1 }}>
                    Editing past check-in from {formatDateLabel(loggedDate)}
                  </ZText>
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      resetForm();
                    }}
                    hitSlop={6}
                  >
                    <ZText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                      Cancel Edit
                    </ZText>
                  </Pressable>
                </View>
              )}

              {/* ── 5 Core Mood Selection (Accessible & Non-color-reliant) ── */}
              <ZText variant="label" color={colors.textPrimary} style={styles.sectionTitle}>
                How does your heart feel? *
              </ZText>

              <View style={styles.moodOptionsContainer}>
                {(['happy', 'calm', 'neutral', 'anxious', 'sad'] as CoreMood[]).map((tag) => {
                  const cfg = MOOD_CONFIGS[tag];
                  const isSelected = selectedMood === tag;

                  return (
                    <Pressable
                      key={tag}
                      onPress={() => handleSelectMood(tag)}
                      style={[
                        styles.moodOptionCard,
                        isSelected && {
                          borderColor: cfg.color,
                          borderWidth: 2,
                          backgroundColor: cfg.bgSubtle,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Mood option: ${cfg.label}. ${cfg.subtitle}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View
                        style={[
                          styles.moodIconCircle,
                          {
                            backgroundColor: isSelected ? `${cfg.color}25` : '#f1f5f9',
                            borderColor: isSelected ? cfg.color : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={cfg.icon}
                          size={24}
                          color={isSelected ? cfg.color : colors.textSecondary}
                        />
                      </View>

                      <View style={styles.moodTextCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ZText
                            variant="label"
                            color={isSelected ? colors.textPrimary : colors.textPrimary}
                            style={{ fontWeight: isSelected ? '700' : '600', fontSize: 16 }}
                          >
                            {cfg.label}
                          </ZText>
                          <ZText style={{ fontSize: 14 }}>{cfg.emoji}</ZText>
                        </View>
                        <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                          {cfg.subtitle}
                        </ZText>
                      </View>

                      {/* Selection Checkmark Indicator */}
                      <View
                        style={[
                          styles.selectionIndicator,
                          isSelected && { backgroundColor: cfg.color, borderColor: cfg.color },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Supportive message based on selected mood */}
              {activeConfig && (
                <View style={[styles.supportNoteBox, { backgroundColor: activeConfig.bgSubtle, borderColor: `${activeConfig.color}40` }]}>
                  <Ionicons name="sparkles" size={16} color={activeConfig.color} />
                  <ZText variant="caption" color={colors.textPrimary} style={styles.supportNoteText}>
                    {activeConfig.supportMessage}
                  </ZText>
                </View>
              )}

              {/* ── Date Selection ────────────────────────────────────────── */}
              <View style={styles.fieldSection}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Check-in Date
                </ZText>
                <View style={styles.dateSelectorRow}>
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      setLoggedDate(getLocalTodayDateString());
                    }}
                    style={[
                      styles.datePill,
                      loggedDate === getLocalTodayDateString() && styles.datePillActive,
                    ]}
                  >
                    <Ionicons
                      name="today-outline"
                      size={15}
                      color={loggedDate === getLocalTodayDateString() ? colors.primary : colors.textSecondary}
                    />
                    <ZText
                      variant="caption"
                      color={loggedDate === getLocalTodayDateString() ? colors.primary : colors.textSecondary}
                      style={{ fontWeight: loggedDate === getLocalTodayDateString() ? '700' : '500' }}
                    >
                      Today
                    </ZText>
                  </Pressable>

                  {/* Date display badge */}
                  <View style={styles.dateDisplayBadge}>
                    <Ionicons name="calendar-outline" size={15} color={colors.textTertiary} />
                    <ZText variant="caption" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                      {loggedDate}
                    </ZText>
                  </View>
                </View>
              </View>

              {/* ── Context Tags ─────────────────────────────────────────── */}
              <View style={styles.fieldSection}>
                <View style={styles.tagsHeaderRow}>
                  <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                    What is shaping this feeling? (Optional)
                  </ZText>
                  <Pressable
                    onPress={() => setShowCustomTagField(!showCustomTagField)}
                    hitSlop={6}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                      Custom Tag
                    </ZText>
                  </Pressable>
                </View>

                {/* Custom tag input field if opened */}
                {showCustomTagField && (
                  <View style={styles.customTagInputRow}>
                    <TextInput
                      value={customTagInput}
                      onChangeText={setCustomTagInput}
                      placeholder="e.g. Project deadline, Sunset..."
                      placeholderTextColor={colors.textTertiary}
                      style={styles.customTagInput}
                      onSubmitEditing={handleAddCustomTag}
                    />
                    <ZButton
                      size="sm"
                      label="Add"
                      onPress={handleAddCustomTag}
                    />
                  </View>
                )}

                <View style={styles.tagsWrapRow}>
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => handleToggleTag(tag)}
                        style={[
                          styles.tagChip,
                          isSelected && styles.tagChipActive,
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                      >
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.primaryDark : colors.textSecondary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {isSelected ? `✓ ${tag}` : tag}
                        </ZText>
                      </Pressable>
                    );
                  })}
                  {/* Any custom added tags that are not in presets */}
                  {selectedTags
                    .filter((t) => !PRESET_TAGS.includes(t))
                    .map((customTag) => (
                      <Pressable
                        key={customTag}
                        onPress={() => handleToggleTag(customTag)}
                        style={[styles.tagChip, styles.tagChipActive]}
                      >
                        <ZText
                          variant="caption"
                          color={colors.primaryDark}
                          style={{ fontWeight: '700' }}
                        >
                          ✓ {customTag}
                        </ZText>
                      </Pressable>
                    ))}
                </View>
              </View>

              {/* ── Optional Note ────────────────────────────────────────── */}
              <View style={styles.fieldSection}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Gentle Thoughts (Optional)
                </ZText>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="What is on your mind? Write freely without pressure..."
                  placeholderTextColor={colors.textTertiary}
                  style={styles.noteInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Validation Error Message */}
              {validationError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                  <ZText variant="caption" color={colors.error} style={{ flex: 1, marginLeft: 6 }}>
                    {validationError}
                  </ZText>
                </View>
              ) : null}

              {/* Save Action Button */}
              <View style={{ marginTop: spacing[4], marginBottom: spacing[8] }}>
                <ZButton
                  label={
                    isSaving
                      ? 'Saving check-in…'
                      : editingEntryId
                      ? 'Update Check-in'
                      : 'Save Mood Check-in'
                  }
                  isLoading={isSaving}
                  onPress={handleSave}
                  fullWidth
                />
              </View>
            </View>
          )}

          {/* ── Tab 2: Mood History ─────────────────────────────────────── */}
          {activeTab === 'history' && (
            <View>
              {/* Filter Row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    setHistoryFilter('all');
                  }}
                  style={[
                    styles.filterChip,
                    historyFilter === 'all' && styles.filterChipActive,
                  ]}
                >
                  <ZText
                    variant="caption"
                    color={historyFilter === 'all' ? colors.primary : colors.textSecondary}
                    style={{ fontWeight: historyFilter === 'all' ? '700' : '500' }}
                  >
                    All ({entries.length})
                  </ZText>
                </Pressable>

                {(['happy', 'calm', 'neutral', 'anxious', 'sad'] as CoreMood[]).map((m) => {
                  const cfg = MOOD_CONFIGS[m];
                  const count = entries.filter((e) => e.mood === m).length;
                  const isSelected = historyFilter === m;

                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        triggerHaptic();
                        setHistoryFilter(m);
                      }}
                      style={[
                        styles.filterChip,
                        isSelected && {
                          borderColor: cfg.color,
                          backgroundColor: cfg.bgSubtle,
                        },
                      ]}
                    >
                      <ZText style={{ fontSize: 13, marginRight: 4 }}>{cfg.emoji}</ZText>
                      <ZText
                        variant="caption"
                        color={isSelected ? cfg.color : colors.textSecondary}
                        style={{ fontWeight: isSelected ? '700' : '500' }}
                      >
                        {cfg.label} ({count})
                      </ZText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* History Cards */}
              {filteredHistory.length === 0 ? (
                <ZCard elevation="none" radius={radii['2xl']} style={styles.emptyHistoryCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="sparkles-outline" size={32} color={colors.primary} />
                  </View>
                  <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginTop: 12 }}>
                    No check-ins found
                  </ZText>
                  <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.emptyText}>
                    {historyFilter === 'all'
                      ? 'You have not recorded any mood reflections yet. Take a gentle moment to record how you feel.'
                      : `No check-ins recorded with ${MOOD_CONFIGS[historyFilter].label} mood yet.`}
                  </ZText>
                  <ZButton
                    label="Record a Check-in"
                    leftIcon={<Ionicons name="add" size={18} color="#ffffff" />}
                    onPress={() => {
                      triggerHaptic();
                      setActiveTab('checkin');
                    }}
                    style={{ marginTop: 16 }}
                  />
                </ZCard>
              ) : (
                filteredHistory.map((item) => {
                  const cfg = MOOD_CONFIGS[item.mood] || MOOD_CONFIGS.neutral;

                  return (
                    <ZCard
                      key={item.id}
                      elevation="sm"
                      radius={radii['2xl']}
                      style={styles.historyCard}
                    >
                      {/* Card Header: Mood badge, Date, and Actions */}
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyMoodBadgeCol}>
                          <View
                            style={[
                              styles.historyMoodBadge,
                              { backgroundColor: cfg.bgSubtle, borderColor: `${cfg.color}40` },
                            ]}
                          >
                            <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                            <ZText
                              variant="label"
                              color={cfg.color}
                              style={{ fontWeight: '700', marginLeft: 6 }}
                            >
                              {cfg.label}
                            </ZText>
                            <ZText style={{ marginLeft: 4 }}>{cfg.emoji}</ZText>
                          </View>
                          <ZText variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>
                            {formatDateLabel(item.logged_date)}
                          </ZText>
                        </View>

                        {/* Actions: Edit & Delete */}
                        <View style={styles.historyActionRow}>
                          <Pressable
                            hitSlop={8}
                            onPress={() => handleStartEdit(item)}
                            style={styles.historyIconBtn}
                            accessibilityLabel="Edit check-in"
                          >
                            <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                          </Pressable>

                          <Pressable
                            hitSlop={8}
                            onPress={() => {
                              triggerHaptic();
                              setEntryToDelete(item);
                            }}
                            style={styles.historyIconBtn}
                            accessibilityLabel="Delete check-in"
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Optional Note */}
                      {item.note ? (
                        <View style={styles.historyNoteBox}>
                          <ZText variant="bodySmall" color={colors.textPrimary} style={styles.historyNoteText}>
                            "{item.note}"
                          </ZText>
                        </View>
                      ) : null}

                      {/* Context Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <View style={styles.historyTagsRow}>
                          {item.tags.map((t) => (
                            <View key={t} style={styles.historyTagPill}>
                              <ZText variant="caption" color={colors.textSecondary} style={{ fontSize: 11 }}>
                                #{t}
                              </ZText>
                            </View>
                          ))}
                        </View>
                      )}
                    </ZCard>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Gentle Confirmation Modal ─────────────────────────────────── */}
      <Modal
        visible={showSavedModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSavedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.savedModalBox}>
            <View style={styles.savedIconCircle}>
              <Ionicons name="heart" size={32} color={colors.primary} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center" style={{ marginTop: 14 }}>
              Reflection Held
            </ZText>

            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.savedSubtext}>
              Thank you for listening to yourself today. It takes gentle courage to honor how you truly feel.
            </ZText>

            <View style={styles.savedActionCol}>
              <ZButton
                label="View Mood History"
                onPress={() => {
                  triggerHaptic();
                  setShowSavedModal(false);
                  resetForm();
                  setActiveTab('history');
                }}
                fullWidth
              />

              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setShowSavedModal(false);
                  resetForm();
                  router.back();
                }}
                style={styles.savedReturnBtn}
              >
                <ZText variant="label" color={colors.primary} style={{ fontWeight: '600' }}>
                  Return to Dashboard
                </ZText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <Modal
        visible={Boolean(entryToDelete)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEntryToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.savedModalBox, { maxWidth: 380 }]}>
            <View style={[styles.savedIconCircle, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center" style={{ marginTop: 14 }}>
              Delete Check-in?
            </ZText>

            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.savedSubtext}>
              Are you sure you want to delete this mood check-in from {entryToDelete ? formatDateLabel(entryToDelete.logged_date) : ''}? This action cannot be undone.
            </ZText>

            <View style={styles.deleteActionRow}>
              <ZButton
                variant="outline"
                label="Cancel"
                onPress={() => setEntryToDelete(null)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ZButton
                label="Delete"
                onPress={handleConfirmDelete}
                style={{ flex: 1, marginLeft: 8, backgroundColor: colors.error }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    width: '100%',
    maxWidth: 680,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTextWrapper: {
    flex: 1,
    marginLeft: spacing[3],
  },

  // Tabs
  tabSegment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: radii.xl,
    padding: 4,
    marginBottom: spacing[3.5],
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radii.lg,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },

  // Philosophy Banner
  philosophyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: spacing[3],
    marginBottom: spacing[3.5],
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[2.5],
  },
  philosophyText: {
    flex: 1,
    lineHeight: 18,
  },

  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.lg,
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },

  sectionTitle: {
    marginBottom: spacing[2],
    fontSize: 15,
    fontWeight: '700',
  },

  // 5 Mood Cards
  moodOptionsContainer: {
    gap: spacing[2.5],
  },
  moodOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3.5],
    borderRadius: radii.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  moodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodTextCol: {
    flex: 1,
    marginLeft: spacing[3],
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  supportNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    marginTop: spacing[3],
    gap: spacing[2],
  },
  supportNoteText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Field Section
  fieldSection: {
    marginTop: spacing[4],
  },
  fieldLabel: {
    marginBottom: spacing[1.5],
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  datePillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  dateDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },

  // Tags
  tagsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2.5],
    gap: spacing[2],
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    backgroundColor: '#ffffff',
    fontSize: 13,
    color: colors.textPrimary,
  },
  tagsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tagChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  tagChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },

  // Note Input
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing[3.5],
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
    lineHeight: 20,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    padding: spacing[3],
    borderRadius: radii.lg,
    marginTop: spacing[3],
    borderWidth: 1,
    borderColor: '#fecdd3',
  },

  // History Tab Styles
  filterScroll: {
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },

  historyCard: {
    padding: spacing[4],
    marginBottom: spacing[3.5],
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.9)',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  historyMoodBadgeCol: {
    flex: 1,
  },
  historyMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  historyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  historyNoteBox: {
    marginTop: spacing[2.5],
    padding: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  historyNoteText: {
    lineHeight: 20,
    fontStyle: 'italic',
  },

  historyTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing[2.5],
  },
  historyTagPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: '#f1f5f9',
  },

  // Empty State
  emptyHistoryCard: {
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 6,
    maxWidth: 300,
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  savedModalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: radii['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.lg,
  },
  savedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedSubtext: {
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  savedActionCol: {
    width: '100%',
    marginTop: spacing[5],
    gap: spacing[2.5],
  },
  savedReturnBtn: {
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[5],
    width: '100%',
  },
});
