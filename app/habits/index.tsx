/**
 * Zeona — Habit Tracker Screen
 *
 * Mindful habit tracking and daily rituals:
 * - Create, edit, archive, and delete habits
 * - Daily, weekdays, weekends, and custom recurring schedules
 * - Interactive 7-day weekly completion grid (tap to complete or undo)
 * - Accurate current & best streak calculation from calendar records
 * - Weekly completion percentage visualization
 * - Warm, encouraging language celebrating progress over perfection
 * - Scoped persistence with Supabase and offline AsyncStorage fallback
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
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

import { useHabitStore } from '@/store/habitStore';
import {
  toLocalDateString,
  getCurrentWeekDays,
  isHabitScheduledForDate,
} from '@/utils/habitCalculations';
import type { Habit, HabitFrequency } from '@/types';

// ─── Available Palette & Icons ───────────────────────────────────────────────

const HABIT_COLORS = [
  '#8b5cf6', // Violet
  '#0284c7', // Sky Blue
  '#10b981', // Sage Emerald
  '#f59e0b', // Amber Sun
  '#f43f5e', // Blush Rose
  '#f97316', // Warm Peach
  '#6366f1', // Indigo
  '#ec4899', // Blossom Pink
];

const HABIT_ICONS = [
  { name: 'water-outline', label: 'Water' },
  { name: 'book-outline', label: 'Journal' },
  { name: 'fitness-outline', label: 'Movement' },
  { name: 'leaf-outline', label: 'Nature' },
  { name: 'moon-outline', label: 'Rest' },
  { name: 'sparkles-outline', label: 'Mindful' },
  { name: 'heart-outline', label: 'Self-Care' },
  { name: 'walk-outline', label: 'Walk' },
  { name: 'cafe-outline', label: 'Pause' },
  { name: 'sunny-outline', label: 'Morning' },
  { name: 'musical-notes-outline', label: 'Sound' },
  { name: 'bicycle-outline', label: 'Active' },
];

const DAYS_OF_WEEK = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export default function HabitTrackerScreen() {
  const router = useRouter();

  // Store state
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const createHabit = useHabitStore((s) => s.createHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const unarchiveHabit = useHabitStore((s) => s.unarchiveHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const toggleHabitDate = useHabitStore((s) => s.toggleHabitDate);
  const isHabitCompletedOnDate = useHabitStore((s) => s.isHabitCompletedOnDate);
  const getHabitStats = useHabitStore((s) => s.getHabitStats);
  const getOverallStats = useHabitStore((s) => s.getOverallStats);

  // Local tab: active vs archived
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFrequency, setFormFrequency] = useState<HabitFrequency>('daily');
  const [formTargetDays, setFormTargetDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formColor, setFormColor] = useState(HABIT_COLORS[0]);
  const [formIcon, setFormIcon] = useState(HABIT_ICONS[0].name);
  const [formError, setFormError] = useState('');

  // Calendar week
  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const todayStr = useMemo(() => toLocalDateString(), []);

  // Filtered habits
  const activeHabits = useMemo(() => habits.filter((h) => !h.is_archived), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => h.is_archived), [habits]);
  const displayedHabits = activeTab === 'active' ? activeHabits : archivedHabits;

  // Overall stats
  const overallStats = useMemo(() => getOverallStats(), [habits, logs]);

  // Open modal for creating
  const handleOpenCreateModal = () => {
    triggerHaptic();
    setEditingHabit(null);
    setFormTitle('');
    setFormDescription('');
    setFormFrequency('daily');
    setFormTargetDays([1, 2, 3, 4, 5]);
    setFormColor(HABIT_COLORS[0]);
    setFormIcon(HABIT_ICONS[0].name);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (habit: Habit) => {
    triggerHaptic();
    setEditingHabit(habit);
    setFormTitle(habit.title);
    setFormDescription(habit.description || '');
    setFormFrequency(habit.frequency);
    setFormTargetDays(habit.target_days || [1, 2, 3, 4, 5]);
    setFormColor(habit.color || HABIT_COLORS[0]);
    setFormIcon(habit.icon || HABIT_ICONS[0].name);
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleSaveHabit = async () => {
    if (!formTitle.trim()) {
      setFormError('Please name your habit');
      return;
    }

    if (formFrequency === 'custom' && formTargetDays.length === 0) {
      setFormError('Please select at least one day for custom frequency');
      return;
    }

    triggerHaptic();

    if (editingHabit) {
      await updateHabit(editingHabit.id, {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        frequency: formFrequency,
        target_days: formFrequency === 'custom' ? formTargetDays : undefined,
        color: formColor,
        icon: formIcon,
      });
    } else {
      await createHabit({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        frequency: formFrequency,
        target_days: formFrequency === 'custom' ? formTargetDays : undefined,
        color: formColor,
        icon: formIcon,
      });
    }

    setIsModalOpen(false);
  };

  // Confirm delete habit
  const handleConfirmDelete = async () => {
    if (!habitToDelete) return;
    triggerHaptic();
    await deleteHabit(habitToDelete.id);
    setHabitToDelete(null);
  };

  // Toggle custom day selection in form
  const toggleCustomDay = (day: number) => {
    triggerHaptic();
    if (formTargetDays.includes(day)) {
      setFormTargetDays(formTargetDays.filter((d) => d !== day));
    } else {
      setFormTargetDays([...formTargetDays, day]);
    }
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
                Habits & Rituals
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Gentle progress over perfection ✨
              </ZText>
            </View>

            <Pressable
              onPress={handleOpenCreateModal}
              style={styles.newButton}
              accessibilityLabel="Add new habit"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <ZText variant="label" color="#ffffff" style={{ fontWeight: '600' }}>
                New
              </ZText>
            </Pressable>
          </View>

          {/* ── Overall Consistency & Encouragement Banner ─────────────── */}
          <ZCard elevation="sm" radius={radii['2xl']} style={styles.overviewCard}>
            <View style={styles.overviewTop}>
              <View style={styles.overviewText}>
                <ZText variant="label" color={colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  This Week's Rhythm
                </ZText>
                <ZText variant="headingMedium" color={colors.textPrimary} style={{ marginTop: 2 }}>
                  {overallStats.averageWeeklyRate}% Consistency
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                  {overallStats.activeStreaksCount > 0
                    ? `${overallStats.activeStreaksCount} habit${overallStats.activeStreaksCount > 1 ? 's' : ''} in beautiful momentum 🌱`
                    : 'A clean slate to nurture your wellbeing today.'}
                </ZText>
              </View>

              <View style={styles.overviewStreakBadge}>
                <Ionicons name="flame" size={26} color="#f97316" />
                <ZText variant="headingLarge" color="#c2410c" style={{ fontWeight: '800' }}>
                  {overallStats.bestStreak}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ fontSize: 10 }}>
                  Best Streak
                </ZText>
              </View>
            </View>

            {/* Small Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, overallStats.averageWeeklyRate))}%` },
                ]}
              />
            </View>

            <View style={styles.statsStrip}>
              <View style={styles.statsStripItem}>
                <ZText variant="label" color={colors.textPrimary}>
                  {overallStats.activeHabitsCount}
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Active Habits
                </ZText>
              </View>
              <View style={styles.statsStripDivider} />
              <View style={styles.statsStripItem}>
                <ZText variant="label" color={colors.textPrimary}>
                  {overallStats.totalCompletions}
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Total Check-ins
                </ZText>
              </View>
              <View style={styles.statsStripDivider} />
              <View style={styles.statsStripItem}>
                <ZText variant="label" color={colors.textPrimary}>
                  {overallStats.bestStreak}d
                </ZText>
                <ZText variant="caption" color={colors.textTertiary}>
                  Longest Flow
                </ZText>
              </View>
            </View>
          </ZCard>

          {/* ── Active / Archived Filter Segment ───────────────────────── */}
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveTab('active');
              }}
              style={[
                styles.segmentTab,
                activeTab === 'active' && styles.segmentTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'active' }}
            >
              <ZText
                variant="label"
                color={activeTab === 'active' ? colors.primary : colors.textSecondary}
                style={activeTab === 'active' ? { fontWeight: '700' } : undefined}
              >
                Active Rituals ({activeHabits.length})
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveTab('archived');
              }}
              style={[
                styles.segmentTab,
                activeTab === 'archived' && styles.segmentTabActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'archived' }}
            >
              <ZText
                variant="label"
                color={activeTab === 'archived' ? colors.primary : colors.textSecondary}
                style={activeTab === 'archived' ? { fontWeight: '700' } : undefined}
              >
                Archived ({archivedHabits.length})
              </ZText>
            </Pressable>
          </View>

          {/* ── Habits List ─────────────────────────────────────────────── */}
          {displayedHabits.length === 0 ? (
            <ZCard elevation="none" radius={radii['2xl']} style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={activeTab === 'active' ? 'sparkles-outline' : 'archive-outline'}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginTop: 12 }}>
                {activeTab === 'active' ? 'No active rituals yet' : 'No archived rituals'}
              </ZText>
              <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.emptyText}>
                {activeTab === 'active'
                  ? 'Plant the first seed of your daily rhythm. Create a mindful habit to nurture consistency.'
                  : 'When a ritual has completed its season, archive it here with gentle appreciation.'}
              </ZText>
              {activeTab === 'active' && (
                <ZButton
                  label="Create Your First Habit"
                  leftIcon={<Ionicons name="add" size={18} color="#ffffff" />}
                  onPress={handleOpenCreateModal}
                  style={{ marginTop: 16 }}
                />
              )}
            </ZCard>
          ) : (
            displayedHabits.map((habit) => {
              const stats = getHabitStats(habit.id);
              const habitColor = habit.color || colors.primary;

              return (
                <ZCard
                  key={habit.id}
                  elevation="sm"
                  radius={radii['2xl']}
                  style={styles.habitCard}
                >
                  {/* Card Header: Icon, Name, Frequency, Actions */}
                  <View style={styles.habitCardHeader}>
                    <View
                      style={[
                        styles.habitIconBadge,
                        { backgroundColor: `${habitColor}18`, borderColor: `${habitColor}30` },
                      ]}
                    >
                      <Ionicons
                        name={(habit.icon as any) || 'sparkles-outline'}
                        size={22}
                        color={habitColor}
                      />
                    </View>

                    <View style={styles.habitTitleCol}>
                      <View style={styles.habitTitleRow}>
                        <ZText variant="headingSmall" color={colors.textPrimary} style={{ flexShrink: 1 }}>
                          {habit.title}
                        </ZText>
                        <ZBadge
                          label={
                            habit.frequency === 'daily'
                              ? 'Daily'
                              : habit.frequency === 'weekdays'
                              ? 'Weekdays'
                              : habit.frequency === 'weekends'
                              ? 'Weekends'
                              : habit.frequency === 'weekly'
                              ? 'Weekly'
                              : 'Custom'
                          }
                          color={habitColor}
                          backgroundColor={`${habitColor}15`}
                        />
                      </View>
                      {habit.description ? (
                        <ZText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                          {habit.description}
                        </ZText>
                      ) : null}
                    </View>

                    {/* Action buttons (Edit, Archive, Delete) */}
                    <View style={styles.cardActionRow}>
                      <Pressable
                        hitSlop={8}
                        onPress={() => handleOpenEditModal(habit)}
                        style={styles.actionIconBtn}
                        accessibilityLabel="Edit habit"
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                      </Pressable>

                      {habit.is_archived ? (
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            triggerHaptic();
                            unarchiveHabit(habit.id);
                          }}
                          style={styles.actionIconBtn}
                          accessibilityLabel="Unarchive habit"
                        >
                          <Ionicons name="arrow-undo-outline" size={16} color={colors.sage} />
                        </Pressable>
                      ) : (
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            triggerHaptic();
                            archiveHabit(habit.id);
                          }}
                          style={styles.actionIconBtn}
                          accessibilityLabel="Archive habit"
                        >
                          <Ionicons name="archive-outline" size={16} color={colors.textSecondary} />
                        </Pressable>
                      )}

                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          triggerHaptic();
                          setHabitToDelete(habit);
                        }}
                        style={styles.actionIconBtn}
                        accessibilityLabel="Delete habit"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Encouraging message strip */}
                  <View style={styles.encouragingNoteRow}>
                    <Ionicons
                      name={stats.isCompletedToday ? 'checkmark-circle' : 'sparkles'}
                      size={14}
                      color={stats.isCompletedToday ? colors.sage : colors.primary}
                    />
                    <ZText
                      variant="caption"
                      color={stats.isCompletedToday ? colors.sage : colors.textSecondary}
                      style={{ flex: 1, marginLeft: 6, fontWeight: '500' }}
                    >
                      {stats.message}
                    </ZText>
                  </View>

                  {/* Metrics Badges: Streak, Best, Weekly Rate */}
                  <View style={styles.metricsRow}>
                    <View style={[styles.metricPill, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="flame" size={14} color="#d97706" />
                      <ZText variant="caption" color="#92400e" style={{ fontWeight: '700', marginLeft: 4 }}>
                        {stats.currentStreak} day streak
                      </ZText>
                    </View>

                    <View style={[styles.metricPill, { backgroundColor: '#ede9fe' }]}>
                      <Ionicons name="trophy-outline" size={14} color="#7c3aed" />
                      <ZText variant="caption" color="#5b21b6" style={{ fontWeight: '600', marginLeft: 4 }}>
                        Best: {stats.bestStreak}d
                      </ZText>
                    </View>

                    <View style={[styles.metricPill, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="pie-chart-outline" size={14} color="#0284c7" />
                      <ZText variant="caption" color="#0369a1" style={{ fontWeight: '600', marginLeft: 4 }}>
                        {stats.weeklyPercentage}% this week
                      </ZText>
                    </View>
                  </View>

                  <ZDivider marginV={spacing[2.5]} />

                  {/* 7-Day Interactive Weekly Completion Grid */}
                  <View style={styles.weekGrid}>
                    {weekDays.map((day) => {
                      const isCompleted = isHabitCompletedOnDate(habit.id, day.dateStr);
                      const isScheduled = isHabitScheduledForDate(habit, day.dateStr);
                      const isCurrentDay = day.isToday;

                      return (
                        <Pressable
                          key={day.dateStr}
                          onPress={async () => {
                            triggerHaptic();
                            await toggleHabitDate(habit.id, day.dateStr);
                          }}
                          style={[
                            styles.weekDayColumn,
                            isCurrentDay && styles.weekDayColumnToday,
                          ]}
                          accessibilityLabel={`${day.dayLabel} ${day.dayNumber}: ${
                            isCompleted ? 'Completed' : 'Not completed'
                          }`}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isCompleted }}
                        >
                          <ZText
                            variant="caption"
                            color={isCurrentDay ? colors.primary : colors.textTertiary}
                            style={{ fontSize: 11, fontWeight: isCurrentDay ? '700' : '500' }}
                          >
                            {day.dayLabel}
                          </ZText>

                          <View
                            style={[
                              styles.dayCircle,
                              isCompleted && {
                                backgroundColor: habitColor,
                                borderColor: habitColor,
                              },
                              !isCompleted && isScheduled && styles.dayCircleScheduled,
                              !isScheduled && styles.dayCircleRest,
                            ]}
                          >
                            {isCompleted ? (
                              <Ionicons name="checkmark" size={15} color="#ffffff" />
                            ) : !isScheduled ? (
                              <View style={styles.restDot} />
                            ) : null}
                          </View>

                          <ZText
                            variant="caption"
                            color={isCurrentDay ? colors.primary : colors.textSecondary}
                            style={{ fontSize: 10, marginTop: 2, fontWeight: isCurrentDay ? '700' : '400' }}
                          >
                            {day.dayNumber}
                          </ZText>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Bottom Quick-Action: Complete Today */}
                  {!habit.is_archived && (
                    <Pressable
                      onPress={async () => {
                        triggerHaptic();
                        await toggleHabitDate(habit.id, todayStr);
                      }}
                      style={[
                        styles.quickCheckButton,
                        stats.isCompletedToday && {
                          backgroundColor: `${colors.sage}15`,
                          borderColor: `${colors.sage}40`,
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={stats.isCompletedToday ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={stats.isCompletedToday ? colors.sage : colors.primary}
                      />
                      <ZText
                        variant="label"
                        color={stats.isCompletedToday ? colors.sage : colors.primary}
                        style={{ marginLeft: 8, fontWeight: '600' }}
                      >
                        {stats.isCompletedToday
                          ? 'Completed Today • Tap to Undo'
                          : 'Mark Completed for Today'}
                      </ZText>
                    </Pressable>
                  )}
                </ZCard>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Add / Edit Habit Modal ────────────────────────────────────── */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ZText variant="headingMedium" color={colors.textBrand}>
                {editingHabit ? 'Edit Habit' : 'New Wellness Ritual'}
              </ZText>
              <Pressable
                hitSlop={8}
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* Title input */}
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Habit Name *
              </ZText>
              <TextInput
                value={formTitle}
                onChangeText={(t) => {
                  setFormTitle(t);
                  if (formError) setFormError('');
                }}
                placeholder="e.g. Morning Hydration, 15m Reading..."
                placeholderTextColor={colors.textTertiary}
                style={styles.textInput}
              />

              {/* Description input */}
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Gentle Intention (Optional)
              </ZText>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="e.g. To feel grounded and energized before sunrise"
                placeholderTextColor={colors.textTertiary}
                style={[styles.textInput, { height: 60 }]}
                multiline
              />

              {/* Frequency selection */}
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Frequency
              </ZText>
              <View style={styles.frequencyRow}>
                {(['daily', 'weekdays', 'weekends', 'custom'] as HabitFrequency[]).map((freq) => (
                  <Pressable
                    key={freq}
                    onPress={() => {
                      triggerHaptic();
                      setFormFrequency(freq);
                    }}
                    style={[
                      styles.frequencyChip,
                      formFrequency === freq && styles.frequencyChipActive,
                    ]}
                  >
                    <ZText
                      variant="caption"
                      color={formFrequency === freq ? colors.primary : colors.textSecondary}
                      style={{ fontWeight: formFrequency === freq ? '700' : '500', textTransform: 'capitalize' }}
                    >
                      {freq}
                    </ZText>
                  </Pressable>
                ))}
              </View>

              {/* Custom days selector if 'custom' */}
              {formFrequency === 'custom' && (
                <View style={styles.customDaysContainer}>
                  <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: 6 }}>
                    Select scheduled days:
                  </ZText>
                  <View style={styles.customDaysRow}>
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = formTargetDays.includes(d.day);
                      return (
                        <Pressable
                          key={d.day}
                          onPress={() => toggleCustomDay(d.day)}
                          style={[
                            styles.customDayCircle,
                            isSelected && styles.customDayCircleActive,
                          ]}
                        >
                          <ZText
                            variant="caption"
                            color={isSelected ? '#ffffff' : colors.textPrimary}
                            style={{ fontWeight: isSelected ? '700' : '500' }}
                          >
                            {d.label}
                          </ZText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Color picker */}
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Color Accent
              </ZText>
              <View style={styles.colorPaletteRow}>
                {HABIT_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      triggerHaptic();
                      setFormColor(c);
                    }}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      formColor === c && styles.colorCircleSelected,
                    ]}
                  >
                    {formColor === c && (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Icon picker */}
              <ZText variant="label" color={colors.textPrimary} style={styles.formLabel}>
                Icon Symbol
              </ZText>
              <View style={styles.iconGrid}>
                {HABIT_ICONS.map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => {
                      triggerHaptic();
                      setFormIcon(item.name);
                    }}
                    style={[
                      styles.iconSelectBtn,
                      formIcon === item.name && {
                        backgroundColor: `${formColor}20`,
                        borderColor: formColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.name as any}
                      size={20}
                      color={formIcon === item.name ? formColor : colors.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>

              {formError ? (
                <ZText variant="caption" color={colors.error} style={{ marginTop: 8 }}>
                  {formError}
                </ZText>
              ) : null}
            </ScrollView>

            <View style={styles.modalActionRow}>
              <ZButton
                variant="outline"
                label="Cancel"
                onPress={() => setIsModalOpen(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ZButton
                label={editingHabit ? 'Save Changes' : 'Create Ritual'}
                onPress={handleSaveHabit}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <Modal
        visible={Boolean(habitToDelete)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setHabitToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 380 }]}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center" style={{ marginTop: 12 }}>
              Delete Habit?
            </ZText>

            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ marginTop: 8 }}>
              Are you sure you want to delete "{habitToDelete?.title}"? All associated streak history and check-in records will be permanently removed.
            </ZText>

            <View style={[styles.modalActionRow, { marginTop: 20 }]}>
              <ZButton
                variant="outline"
                label="Cancel"
                onPress={() => setHabitToDelete(null)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ZButton
                label="Delete"
                variant="primary"
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
    maxWidth: 720,
    alignSelf: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    gap: 4,
    ...shadows.sm,
  },

  // Overview Banner
  overviewCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(238, 242, 255, 0.9)',
    borderWidth: 1,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  overviewText: {
    flex: 1,
    paddingRight: spacing[3],
  },
  overviewStreakBadge: {
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#ffedd5',
    minWidth: 70,
  },
  progressBarBg: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    marginTop: spacing[3.5],
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing[3.5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsStripItem: {
    alignItems: 'center',
  },
  statsStripDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Segment Tabs
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: radii.xl,
    padding: 4,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radii.lg,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },

  // Empty State
  emptyCard: {
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
    maxWidth: 320,
    lineHeight: 18,
  },

  // Habit Card
  habitCard: {
    padding: spacing[4],
    marginBottom: spacing[3.5],
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.9)',
  },
  habitCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  habitIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTitleCol: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },

  // Encouraging note
  encouragingNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.md,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2.5],
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },

  // Weekly Grid
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  weekDayColumn: {
    alignItems: 'center',
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[1],
    borderRadius: radii.lg,
    flex: 1,
  },
  weekDayColumnToday: {
    backgroundColor: 'rgba(238, 242, 255, 0.6)',
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dayCircleScheduled: {
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  dayCircleRest: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  restDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },

  // Quick Check Button
  quickCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radii.xl,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: radii['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    marginTop: spacing[3],
    marginBottom: spacing[1.5],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#f8fafc',
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  frequencyChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  frequencyChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  customDaysContainer: {
    marginTop: spacing[2.5],
    padding: spacing[2.5],
    backgroundColor: '#f8fafc',
    borderRadius: radii.lg,
  },
  customDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
  },
  customDayCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    ...shadows.md,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  iconSelectBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  deleteModalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
