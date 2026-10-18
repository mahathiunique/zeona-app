/**
 * Zeona — Home Tab
 * Personal, calm, and immediately useful dashboard with personalized greeting,
 * real task focus, interactive mood check-in, weekly habit strip, upcoming reminders,
 * recent reflections, and dynamic gentle wisdom.
 */

import React, { useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZCard, ZBadge, ZButton } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useCalendarStore } from '@/store/calendarStore';
import { useJournalStore } from '@/store/journalStore';
import { useAuthStore } from '@/store/authStore';
import { useHabitStore } from '@/store/habitStore';
import { useMoodStore, getLocalTodayDateString } from '@/store/moodStore';
import { triggerHaptic } from '@/utils/haptics';
import type { MoodTag, CoreMood, Task, Habit, CalendarEvent, JournalEntry } from '@/types';

// ── Gentle Motivational Messages (Curated & Dynamic) ──────────────────────────
const GENTLE_MESSAGES = [
  'Give yourself permission to move at your own pace today.',
  'Your worth is not measured by your productivity.',
  'Softness is not weakness; it is the space where healing grows.',
  'In the quiet moments, clarity finds its way.',
  'Small, gentle steps still carry you forward.',
  'Breathe in ease, exhale what is no longer yours to hold.',
  'May your day have pockets of peace and unexpected beauty.',
  'You do not have to carry everything all at once.',
  'Honor where you are right now, even while you are growing.',
  'Every breath is a quiet opportunity to begin anew.',
  'Peace begins the moment you decide not to rush your soul.',
  'Celebrate the quiet victories that only you know about.',
  'Listen closely to your body; rest is a form of courage.',
  'You are allowed to take up space and be gentle with yourself.',
];

const MOOD_OPTIONS: { emoji: string; label: string; tag: MoodTag; color: string; note: string }[] = [
  { emoji: '😌', label: 'Calm', tag: 'calm', color: '#a7f3d0', note: 'You are anchored in peace. Allow this stillness to guide your steps.' },
  { emoji: '😊', label: 'Happy', tag: 'happy', color: '#fde68a', note: 'Your joy radiates outward. Soak in this bright energy.' },
  { emoji: '✨', label: 'Grateful', tag: 'grateful', color: '#d8b4fe', note: 'Gratitude turns what we have into enough.' },
  { emoji: '😐', label: 'Neutral', tag: 'neutral', color: '#e5e7eb', note: 'A quiet, steady day. Gentle neutrality is its own kind of peace.' },
  { emoji: '😟', label: 'Anxious', tag: 'anxious', color: '#fecdd3', note: 'Take a slow, deep breath. You are safe here, and this feeling will pass.' },
  { emoji: '🌧️', label: 'Low', tag: 'sad', color: '#bfdbfe', note: 'Be extra kind to yourself today. Tender hearts need gentle care.' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuthStore();
  const { tasks, toggleTask, habits, activeHabitLog, toggleHabitToday, events } = useCalendarStore();
  const { entries, todayMood, setTodayMood, favorites, toggleFavorite, updateDraft } = useJournalStore();
  const moodEntries = useMoodStore((s) => s.entries);
  const saveMoodCheckIn = useMoodStore((s) => s.saveCheckIn);
  const todayMoodEntry = useMemo(() => {
    const todayStr = getLocalTodayDateString();
    return moodEntries.find((e) => e.logged_date === todayStr) || null;
  }, [moodEntries]);

  const [messageIndex, setMessageIndex] = useState(() => {
    const todayNum = new Date().getDate() + new Date().getHours();
    return todayNum % GENTLE_MESSAGES.length;
  });
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  // ── Greeting calculations ──────────────────────────────────────────────────
  const now = new Date();
  const currentHour = now.getHours();
  const greetingTime =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  const userDisplayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : isGuest ? 'Traveler' : 'Mahathi');

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // ── Task calculations ──────────────────────────────────────────────────────
  const completedTasksCount = tasks.filter((t) => t.is_completed).length;
  const todayPriorities = tasks.slice(0, 3);

  // ── Habit & Streak calculations (strictly from actual records) ─────────────
  const habitStoreHabits = useHabitStore((s) => s.habits);
  const habitStoreLogs = useHabitStore((s) => s.logs);
  const maxStreak = useMemo(() => {
    return useHabitStore.getState().getOverallStats().bestStreak;
  }, [habitStoreHabits, habitStoreLogs]);

  // 7-day weekly strip data
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === today.toISOString().split('T')[0];
      const isPastOrToday = d <= today;

      // Count completed habits for this day
      const completedCount = habits.filter((h) => Boolean(activeHabitLog[`${h.id}_${dateStr}`])).length;
      const hasCompleted = completedCount > 0;

      const dayShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i];
      const dayNum = d.getDate();

      return {
        dateStr,
        dayShort,
        dayNum,
        isToday,
        isPastOrToday,
        hasCompleted,
        completedCount,
      };
    });
  }, [habits, activeHabitLog]);

  // Today's primary habit for quick-check
  const primaryHabit = habits[0] || null;
  const todayDateStr = now.toISOString().split('T')[0];
  const isPrimaryHabitDone = primaryHabit
    ? Boolean(activeHabitLog[`${primaryHabit.id}_${todayDateStr}`])
    : false;

  // ── Upcoming Reminders / Events ────────────────────────────────────────────
  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return events
      .filter((e) => new Date(e.event_date).getTime() >= startOfToday)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 3);
  }, [events]);

  // ── Recent Memories / Journal Entries ──────────────────────────────────────
  const recentEntries = useMemo(() => entries.slice(0, 2), [entries]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const cycleMessage = () => {
    triggerHaptic();
    setMessageIndex((prev) => (prev + 1) % GENTLE_MESSAGES.length);
  };

  const handleSelectMood = async (tag: MoodTag) => {
    triggerHaptic();
    setTodayMood(tag);
    setShowMoodPicker(false);
    const coreMood = (['happy', 'calm', 'neutral', 'anxious', 'sad'].includes(tag) ? tag : 'calm') as CoreMood;
    await saveMoodCheckIn({ mood: coreMood });
  };

  const activeMoodInfo = MOOD_OPTIONS.find((m) => m.tag === todayMood);

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.responsiveContainer}>
          {/* ── 1. Personalized Greeting & Header ───────────────────────── */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <View style={styles.dateBadge}>
                <Ionicons name="leaf-outline" size={14} color={colors.primary} />
                <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                  {formattedDate}
                </ZText>
              </View>
              <ZText variant="displayMedium" color={colors.textBrand} style={styles.greetingTitle}>
                {greetingTime}, {userDisplayName} 🌸
              </ZText>
            </View>

            {/* Profile Avatar link */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/(tabs)/profile');
              }}
              style={({ pressed }) => [styles.avatarButton, { opacity: pressed ? 0.8 : 1 }]}
              accessibilityLabel="View profile"
            >
              <ZText style={styles.avatarEmoji}>🌸</ZText>
            </Pressable>
          </View>

          {/* ── 8. Gentle Motivational Message (Non-repeating) ──────────── */}
          <ZCard style={styles.quoteCard} elevation="xs" radius={radii.xl}>
            <View style={styles.quoteRow}>
              <View style={styles.quoteIconBadge}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ZText variant="label" color={colors.primaryDark}>
                  Mindful Reflection
                </ZText>
                <ZText variant="bodySmall" color={colors.textSecondary} style={styles.quoteText}>
                  "{GENTLE_MESSAGES[messageIndex]}"
                </ZText>
              </View>
              <Pressable
                onPress={cycleMessage}
                hitSlop={10}
                style={styles.refreshIconBtn}
                accessibilityLabel="Next gentle thought"
              >
                <Ionicons name="sync-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </ZCard>

          {/* ── 3. Mood Check-in Card ────────────────────────────────────── */}
          <ZCard style={styles.moodCard} elevation="sm" radius={radii['2xl']}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/mood');
              }}
              style={styles.cardHeaderRow}
              accessibilityRole="button"
              accessibilityLabel="Open Mood Sanctuary"
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ZText variant="headingSmall" color={colors.textPrimary}>
                    Daily Mood Check-In
                  </ZText>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
                <ZText variant="caption" color={colors.textSecondary}>
                  {todayMood ? 'Honoring how you feel today' : 'How does your heart feel today?'}
                </ZText>
              </View>
              {todayMood && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    triggerHaptic();
                    setShowMoodPicker(!showMoodPicker);
                  }}
                  hitSlop={8}
                >
                  <ZBadge
                    label={showMoodPicker ? 'Done' : 'Change'}
                    color={colors.primary}
                    backgroundColor={colors.primarySubtle}
                  />
                </Pressable>
              )}
            </Pressable>

            {/* If mood is recorded and not changing */}
            {todayMood && !showMoodPicker && activeMoodInfo && (
              <View style={styles.recordedMoodBox}>
                <View style={[styles.recordedEmojiBadge, { backgroundColor: activeMoodInfo.color }]}>
                  <ZText style={{ fontSize: 26 }}>{activeMoodInfo.emoji}</ZText>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <ZText variant="label" color={colors.textPrimary}>
                      Feeling {activeMoodInfo.label}
                    </ZText>
                    <ZBadge label="Recorded" color={colors.sage} backgroundColor={colors.sageSubtle} />
                  </View>
                  <ZText variant="caption" color={colors.textSecondary} style={{ fontStyle: todayMoodEntry?.note ? 'italic' : 'normal', lineHeight: 18 }}>
                    {todayMoodEntry?.note ? `"${todayMoodEntry.note}"` : activeMoodInfo.note}
                  </ZText>
                  {todayMoodEntry?.tags && todayMoodEntry.tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {todayMoodEntry.tags.map((t) => (
                        <View key={t} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <ZText variant="caption" color={colors.textSecondary} style={{ fontSize: 10 }}>#{t}</ZText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Mood Selector Buttons (shown if not recorded or changing) */}
            {(!todayMood || showMoodPicker) && (
              <View style={styles.moodSelectorGrid}>
                {MOOD_OPTIONS.map((m) => {
                  const isSelected = todayMood === m.tag;
                  return (
                    <Pressable
                      key={m.tag}
                      onPress={() => handleSelectMood(m.tag)}
                      style={({ pressed }) => [
                        styles.moodOptionButton,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <View
                        style={[
                          styles.moodEmojiBubble,
                          {
                            backgroundColor: m.color,
                            borderColor: isSelected ? colors.primary : 'transparent',
                            borderWidth: isSelected ? 2 : 0,
                          },
                        ]}
                      >
                        <ZText style={{ fontSize: 22 }}>{m.emoji}</ZText>
                      </View>
                      <ZText
                        variant="caption"
                        color={isSelected ? colors.primaryDark : colors.textSecondary}
                        style={isSelected ? { fontWeight: '700' } : undefined}
                      >
                        {m.label}
                      </ZText>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {todayMood && (
              <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    router.push('/mood');
                  }}
                  style={[styles.reflectionPromptRow, { flex: 1, marginTop: 0 }]}
                >
                  <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
                  <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                    Sanctuary
                  </ZText>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    router.push('/mood/insights');
                  }}
                  style={[styles.reflectionPromptRow, { flex: 1, marginTop: 0 }]}
                >
                  <Ionicons name="bar-chart-outline" size={15} color={colors.primary} />
                  <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                    Insights
                  </ZText>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    updateDraft({ mood: todayMood });
                    router.push('/(tabs)/create');
                  }}
                  style={[styles.reflectionPromptRow, { flex: 1, marginTop: 0 }]}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                    Journal ✍️
                  </ZText>
                </Pressable>
              </View>
            )}
          </ZCard>

          {/* ── 4. Quick Access Section ──────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <ZText variant="headingSmall" color={colors.textPrimary}>
              Quick Actions
            </ZText>
            <ZText variant="caption" color={colors.textTertiary}>
              Capture & view
            </ZText>
          </View>

          <View style={styles.quickAccessGrid}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                updateDraft({ type: 'text' });
                router.push('/(tabs)/create');
              }}
              style={({ pressed }) => [
                styles.quickAccessCard,
                { backgroundColor: '#faf5ff', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="book-outline" size={22} color={colors.primary} />
              </View>
              <ZText variant="label" color={colors.textPrimary}>
                Journal
              </ZText>
              <ZText variant="caption" color={colors.textTertiary} align="center">
                Reflect & write
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/journal/voice');
              }}
              style={({ pressed }) => [
                styles.quickAccessCard,
                { backgroundColor: '#fff1f2', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#ffe4e6' }]}>
                <Ionicons name="mic-outline" size={22} color={colors.accent} />
              </View>
              <ZText variant="label" color={colors.textPrimary}>
                Voice Diary
              </ZText>
              <ZText variant="caption" color={colors.textTertiary} align="center">
                Record thoughts
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/tasks');
              }}
              style={({ pressed }) => [
                styles.quickAccessCard,
                { backgroundColor: '#f0fdf4', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-done-outline" size={22} color={colors.sage} />
              </View>
              <ZText variant="label" color={colors.textPrimary}>
                Tasks
              </ZText>
              <ZText variant="caption" color={colors.textTertiary} align="center">
                Daily priorities
              </ZText>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/(tabs)/calendar');
              }}
              style={({ pressed }) => [
                styles.quickAccessCard,
                { backgroundColor: '#f0f9ff', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="calendar-outline" size={22} color={colors.sky} />
              </View>
              <ZText variant="label" color={colors.textPrimary}>
                Calendar
              </ZText>
              <ZText variant="caption" color={colors.textTertiary} align="center">
                Milestones & dates
              </ZText>
            </Pressable>
          </View>

          {/* ── 2. Daily Focus Card (Today's Priorities) ────────────────── */}
          <ZCard style={styles.focusCard} elevation="sm" radius={radii['2xl']}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  Daily Focus
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Today's essential intentions
                </ZText>
              </View>
              {tasks.length > 0 && (
                <ZBadge
                  label={`${completedTasksCount}/${tasks.length} done`}
                  color={completedTasksCount === tasks.length ? colors.sage : colors.primary}
                  backgroundColor={completedTasksCount === tasks.length ? colors.sageSubtle : colors.primarySubtle}
                />
              )}
            </View>

            {todayPriorities.length === 0 ? (
              <View style={styles.emptySectionBox}>
                <ZText style={{ fontSize: 28 }}>🌿</ZText>
                <ZText variant="bodySmall" color={colors.textSecondary} align="center">
                  Your slate is open and tranquil today.
                </ZText>
                <ZButton
                  label="+ Add a priority"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    triggerHaptic();
                    router.push('/(tabs)/calendar');
                  }}
                />
              </View>
            ) : (
              <View style={styles.taskList}>
                {todayPriorities.map((task: Task) => (
                  <Pressable
                    key={task.id}
                    onPress={() => {
                      triggerHaptic();
                      toggleTask(task.id);
                    }}
                    style={({ pressed }) => [
                      styles.taskRowItem,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <View style={[styles.checkbox, task.is_completed && styles.checkboxChecked]}>
                      {task.is_completed && (
                        <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <ZText
                        variant="bodySmall"
                        color={task.is_completed ? colors.textTertiary : colors.textPrimary}
                        style={task.is_completed ? styles.strikethrough : undefined}
                      >
                        {task.title}
                      </ZText>
                      {task.description && (
                        <ZText variant="caption" color={colors.textTertiary}>
                          {task.description}
                        </ZText>
                      )}
                    </View>
                    {task.priority === 'high' && (
                      <ZBadge label="High" color={colors.accent} backgroundColor="#ffe4e6" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/tasks');
              }}
              style={styles.cardFooterLink}
            >
              <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                View and manage all tasks →
              </ZText>
            </Pressable>
          </ZCard>

          {/* ── 5. Habit Streak & Weekly Progress Card ──────────────────── */}
          <ZCard style={styles.habitStreakCard} elevation="sm" radius={radii['2xl']}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/habits');
              }}
              style={styles.cardHeaderRow}
              accessibilityRole="button"
              accessibilityLabel="Open Habit Tracker"
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ZText variant="headingSmall" color={colors.textPrimary}>
                    Habits & Rituals
                  </ZText>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
                <ZText variant="caption" color={colors.textSecondary}>
                  Calculated from your logged wellness habits
                </ZText>
              </View>
              <View style={styles.streakBadge}>
                <ZText style={{ fontSize: 16 }}>🔥</ZText>
                <ZText variant="bodySmall" color={colors.primaryDark} style={{ fontWeight: '700' }}>
                  {maxStreak} {maxStreak === 1 ? 'day' : 'days'}
                </ZText>
              </View>
            </Pressable>

            {/* Weekly 7-Day Progress Strip */}
            <View style={styles.weeklyStrip}>
              {weekDays.map((w) => (
                <View
                  key={w.dateStr}
                  style={[
                    styles.weekDayPill,
                    w.isToday && styles.weekDayPillToday,
                  ]}
                >
                  <ZText
                    variant="caption"
                    color={w.isToday ? colors.primary : colors.textTertiary}
                    style={w.isToday ? { fontWeight: '700' } : undefined}
                  >
                    {w.dayShort}
                  </ZText>
                  <View
                    style={[
                      styles.weekDot,
                      w.hasCompleted
                        ? styles.weekDotCompleted
                        : w.isToday
                        ? styles.weekDotToday
                        : styles.weekDotEmpty,
                    ]}
                  >
                    {w.hasCompleted ? (
                      <Ionicons name="checkmark" size={11} color="#ffffff" />
                    ) : (
                      <ZText
                        variant="caption"
                        color={w.isToday ? colors.primary : colors.textTertiary}
                        style={{ fontSize: 10 }}
                      >
                        {w.dayNum}
                      </ZText>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Primary Habit Quick-Check or Empty Prompt */}
            {primaryHabit ? (
              <View style={styles.primaryHabitRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    toggleHabitToday(primaryHabit.id);
                  }}
                  style={({ pressed }) => [
                    styles.habitCheckRow,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.habitCheckbox,
                      isPrimaryHabitDone && styles.habitCheckboxDone,
                    ]}
                  >
                    {isPrimaryHabitDone && (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <ZText
                      variant="bodySmall"
                      color={isPrimaryHabitDone ? colors.textTertiary : colors.textPrimary}
                      style={isPrimaryHabitDone ? styles.strikethrough : undefined}
                    >
                      {primaryHabit.title}
                    </ZText>
                    <ZText variant="caption" color={colors.textTertiary}>
                      {primaryHabit.streak_count} day streak • Tap to {isPrimaryHabitDone ? 'undo' : 'complete today'}
                    </ZText>
                  </View>
                  <ZBadge
                    label={isPrimaryHabitDone ? 'Completed' : 'Today'}
                    color={isPrimaryHabitDone ? colors.sage : colors.primary}
                    backgroundColor={isPrimaryHabitDone ? colors.sageSubtle : colors.primarySubtle}
                  />
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptySectionBox}>
                <ZText style={{ fontSize: 24 }}>🌱</ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center">
                  Start your first daily ritual to build a gentle streak.
                </ZText>
                <ZButton
                  label="Create a habit"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    triggerHaptic();
                    router.push('/habits');
                  }}
                />
              </View>
            )}
          </ZCard>

          {/* ── 6. Upcoming Reminders & Important Dates ─────────────────── */}
          <ZCard style={styles.eventsCard} elevation="sm" radius={radii['2xl']}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  Upcoming Milestones
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Gentle reminders & celebrated dates
                </ZText>
              </View>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/(tabs)/calendar');
                }}
                hitSlop={8}
              >
                <Ionicons name="arrow-forward-outline" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {upcomingEvents.length === 0 ? (
              <View style={styles.emptySectionBox}>
                <ZText style={{ fontSize: 24 }}>🕊️</ZText>
                <ZText variant="caption" color={colors.textSecondary} align="center">
                  No upcoming reminders or events scheduled for this week.
                </ZText>
                <ZButton
                  label="+ Add milestone"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    triggerHaptic();
                    router.push('/(tabs)/calendar');
                  }}
                />
              </View>
            ) : (
              <View style={styles.eventsList}>
                {upcomingEvents.map((evt: CalendarEvent) => {
                  const evtDate = new Date(evt.event_date);
                  const isToday = evtDate.toDateString() === now.toDateString();
                  const dateLabel = isToday
                    ? 'Today'
                    : evtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  return (
                    <Pressable
                      key={evt.id}
                      onPress={() => {
                        triggerHaptic();
                        router.push('/(tabs)/calendar');
                      }}
                      style={({ pressed }) => [
                        styles.eventRowItem,
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                    >
                      <View style={[styles.eventBadgeIcon, { backgroundColor: evt.color ? `${evt.color}25` : '#f3e8ff' }]}>
                        <Ionicons
                          name={
                            evt.event_type === 'birthday'
                              ? 'gift-outline'
                              : evt.event_type === 'reminder'
                              ? 'alarm-outline'
                              : 'sparkles-outline'
                          }
                          size={18}
                          color={evt.color || colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <ZText variant="bodySmall" color={colors.textPrimary} style={{ fontWeight: '600' }}>
                          {evt.title}
                        </ZText>
                        {evt.description && (
                          <ZText variant="caption" color={colors.textTertiary}>
                            {evt.description}
                          </ZText>
                        )}
                      </View>
                      <ZBadge
                        label={dateLabel}
                        color={isToday ? colors.accent : colors.primary}
                        backgroundColor={isToday ? '#ffe4e6' : colors.primarySubtle}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ZCard>

          {/* ── 7. Recent Memories / Journal Entries ────────────────────── */}
          <ZCard style={styles.memoriesCard} elevation="sm" radius={radii['2xl']}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  Recent Reflections
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Memories and thoughts captured in your sanctuary
                </ZText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    router.push('/memories');
                  }}
                  hitSlop={8}
                >
                  <ZBadge label="Memories 📷" color={colors.primary} backgroundColor={colors.primarySubtle} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    router.push('/(tabs)/journal');
                  }}
                  hitSlop={8}
                >
                  <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                    Journal ({entries.length})
                  </ZText>
                </Pressable>
              </View>
            </View>

            {recentEntries.length === 0 ? (
              <View style={styles.emptySectionBox}>
                <ZText style={{ fontSize: 28 }}>🌸</ZText>
                <ZText variant="bodySmall" color={colors.textSecondary} align="center">
                  Your sanctuary awaits its first reflection.
                </ZText>
                <ZButton
                  label="Write first entry ✨"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    triggerHaptic();
                    router.push('/(tabs)/create');
                  }}
                />
              </View>
            ) : (
              <View style={styles.entriesList}>
                {recentEntries.map((entry: JournalEntry) => {
                  const isFav = Boolean(favorites[entry.id]);
                  const entryDate = new Date(entry.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        triggerHaptic();
                        router.push('/(tabs)/journal');
                      }}
                      style={({ pressed }) => [
                        styles.entryCardItem,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <View style={styles.entryHeaderRow}>
                        <View style={styles.entryTypeTag}>
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
                            {entry.type === 'voice' ? 'Voice Diary' : entry.type === 'photo' ? 'Memory' : 'Journal'}
                          </ZText>
                        </View>
                        <ZText variant="caption" color={colors.textTertiary}>
                          {entryDate}
                        </ZText>
                        <Pressable
                          onPress={() => {
                            triggerHaptic();
                            toggleFavorite(entry.id);
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={16}
                            color={isFav ? '#e879f9' : colors.textTertiary}
                          />
                        </Pressable>
                      </View>

                      <ZText
                        variant="bodySmall"
                        color={colors.textPrimary}
                        numberOfLines={1}
                        style={{ fontWeight: '600' }}
                      >
                        {entry.title || 'Untitled reflection'}
                      </ZText>
                      {entry.content && (
                        <ZText
                          variant="caption"
                          color={colors.textSecondary}
                          numberOfLines={2}
                          style={styles.entryContentPreview}
                        >
                          {entry.content}
                        </ZText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ZCard>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[3],
    paddingBottom: spacing[12],
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing[4],
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[1],
  },
  headerTextGroup: {
    flex: 1,
    gap: spacing[1],
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySubtle,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2.5],
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  greetingTitle: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 28,
    color: colors.primaryDark,
    letterSpacing: -0.4,
  },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    ...shadows.xs,
  },
  avatarEmoji: {
    fontSize: 26,
  },

  // 8. Gentle Motivational Message
  quoteCard: {
    padding: spacing[3.5],
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  quoteIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteText: {
    fontFamily: fontFamilies.sans,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  refreshIconBtn: {
    padding: spacing[1],
  },

  // 3. Mood Check-in
  moodCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordedMoodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.backgroundMuted,
    padding: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordedEmojiBadge: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xs,
  },
  moodSelectorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  moodOptionButton: {
    alignItems: 'center',
    gap: spacing[1],
    flex: 1,
  },
  moodEmojiBubble: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xs,
  },
  reflectionPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    paddingTop: spacing[1],
    minHeight: layout.minTouchTarget,
  },

  // 4. Quick Access
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: spacing[2.5],
  },
  quickAccessCard: {
    flex: 1,
    borderRadius: radii.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[1],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...shadows.xs,
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[0.5],
  },

  // 2. Daily Focus
  focusCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  taskList: {
    gap: spacing[2],
  },
  taskRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: layout.minTouchTarget,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  cardFooterLink: {
    alignSelf: 'center',
    paddingTop: spacing[1],
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },

  // 5. Habit Streak
  habitStreakCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },
  weeklyStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundMuted,
    padding: spacing[2.5],
    borderRadius: radii.xl,
  },
  weekDayPill: {
    alignItems: 'center',
    gap: spacing[1],
    flex: 1,
  },
  weekDayPillToday: {
    backgroundColor: '#ffffff',
    borderRadius: radii.lg,
    paddingVertical: 2,
    ...shadows.xs,
  },
  weekDot: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDotCompleted: {
    backgroundColor: colors.sage,
  },
  weekDotToday: {
    backgroundColor: colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  weekDotEmpty: {
    backgroundColor: 'transparent',
  },
  primaryHabitRow: {
    backgroundColor: '#faf8f5',
    borderRadius: radii.lg,
    padding: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: layout.minTouchTarget,
  },
  habitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitCheckboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // 6. Events
  eventsCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  eventsList: {
    gap: spacing[2],
  },
  eventRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: layout.minTouchTarget,
  },
  eventBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 7. Recent Memories
  memoriesCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  entriesList: {
    gap: spacing[2.5],
  },
  entryCardItem: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: radii.xl,
    padding: spacing[3],
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[0.5],
  },
  entryTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryContentPreview: {
    lineHeight: 18,
  },

  // Empty state container inside cards
  emptySectionBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },

  bottomSpacer: {
    height: spacing[10],
  },
});
