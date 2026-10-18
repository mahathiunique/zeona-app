/**
 * Zeona — Central Create Screen
 *
 * Four primary action cards:
 * 1. Write a Journal Entry (navigates to /journal/editor)
 * 2. Record a Voice Note (navigates to /journal/voice)
 * 3. Add a Memory (navigates to /journal/editor?type=photo)
 * 4. Add a Task (opens quick task creation modal)
 *
 * Quick actions below:
 * - Mood Check-in (interactive mood logger with immediate persistence)
 * - Important Date (date creation modal synced with calendarStore)
 * - Habit (daily habit builder synced with calendarStore)
 * - Note (quick reflection composer)
 *
 * Inspirational quote card and responsive layout for mobile & web.
 */

import React, { useState } from 'react';
import {
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

import { ZText, ZCard, ZButton, ZBadge } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useJournalStore } from '@/store/journalStore';
import { useCalendarStore } from '@/store/calendarStore';
import { triggerHaptic } from '@/utils/haptics';
import type { MoodTag } from '@/types';

// Curated daily inspirations
const INSPIRATIONAL_MESSAGES = [
  '“Take a gentle breath. Every small reflection, quiet intention, or captured memory enriches your story.”',
  '“Give yourself the space to feel, reflect, and grow at your own natural pace.”',
  '“In the quiet moments of today lies the clarity for tomorrow.”',
  '“Your sanctuary is always here, ready to hold whatever you wish to express.”',
];

const MOODS: { tag: MoodTag; emoji: string; label: string; color: string; desc: string }[] = [
  { tag: 'calm', emoji: '😌', label: 'Calm', color: '#a7f3d0', desc: 'Peaceful & grounded' },
  { tag: 'happy', emoji: '😊', label: 'Happy', color: '#fde68a', desc: 'Joyful & warm' },
  { tag: 'grateful', emoji: '✨', label: 'Grateful', color: '#d8b4fe', desc: 'Thankful for today' },
  { tag: 'neutral', emoji: '🌿', label: 'Neutral', color: '#e2e8f0', desc: 'Balanced & steady' },
  { tag: 'anxious', emoji: '😟', label: 'Anxious', color: '#fca5a5', desc: 'Need gentle care' },
  { tag: 'sad', emoji: '🌧️', label: 'Low', color: '#bfdbfe', desc: 'Holding space for tears' },
];

export default function CreateScreen() {
  const router = useRouter();
  const { todayMood, setTodayMood } = useJournalStore();
  const { addTask, addHabit, addEvent } = useCalendarStore();

  // Active modal state
  type ModalType = 'none' | 'task' | 'mood' | 'date' | 'habit';
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskSuccess, setTaskSuccess] = useState(false);

  // Date form state
  const [dateTitle, setDateTitle] = useState('');
  const [dateType, setDateType] = useState<'birthday' | 'anniversary' | 'reminder'>('reminder');
  const [dateSuccess, setDateSuccess] = useState(false);

  // Habit form state
  const [habitTitle, setHabitTitle] = useState('');
  const [habitSuccess, setHabitSuccess] = useState(false);

  // Mood check-in state
  const [selectedMood, setSelectedMood] = useState<MoodTag | null>(todayMood);
  const [moodSuccess, setMoodSuccess] = useState(false);

  // Daily inspiration
  const inspiration = INSPIRATIONAL_MESSAGES[0];

  // Handlers
  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    triggerHaptic();
    addTask(taskTitle.trim(), taskPriority);
    setTaskSuccess(true);
    setTimeout(() => {
      setTaskSuccess(false);
      setTaskTitle('');
      setActiveModal('none');
    }, 900);
  };

  const handleCreateDate = () => {
    if (!dateTitle.trim()) return;
    triggerHaptic();
    const targetDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    addEvent({
      title: dateTitle.trim(),
      event_date: targetDate,
      event_type: dateType as any,
    });
    setDateSuccess(true);
    setTimeout(() => {
      setDateSuccess(false);
      setDateTitle('');
      setActiveModal('none');
    }, 900);
  };

  const handleCreateHabit = () => {
    if (!habitTitle.trim()) return;
    triggerHaptic();
    addHabit(habitTitle.trim(), 'Daily wellness ritual', '#8b5cf6', 'sparkles-outline');
    setHabitSuccess(true);
    setTimeout(() => {
      setHabitSuccess(false);
      setHabitTitle('');
      setActiveModal('none');
    }, 900);
  };

  const handleSelectMood = (mood: MoodTag) => {
    triggerHaptic();
    setSelectedMood(mood);
    setTodayMood(mood);
    setMoodSuccess(true);
    setTimeout(() => {
      setMoodSuccess(false);
      setActiveModal('none');
    }, 900);
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* ── 1. Screen Header ─────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTextGroup}>
              <ZText variant="displayMedium" color={colors.textBrand}>
                Create
              </ZText>
              <ZText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                Your sanctuary for thoughts, goals, and moments 🌸
              </ZText>
            </View>
          </View>

          {/* ── 2. Inspirational Message Card ───────────────────────────── */}
          <ZCard style={styles.inspirationCard} elevation="xs" radius={radii.xl}>
            <View style={styles.inspirationRow}>
              <View style={styles.inspirationIconBubble}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ZText variant="bodySmall" color={colors.textPrimary} style={styles.inspirationText}>
                  {inspiration}
                </ZText>
              </View>
            </View>
          </ZCard>

          {/* ── 3. Four Primary Action Cards ────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <ZText variant="headingSmall" color={colors.textPrimary}>
              Capture & Create
            </ZText>
            <ZText variant="caption" color={colors.textTertiary}>
              Choose a flow
            </ZText>
          </View>

          <View style={styles.primaryGrid}>
            {/* Card 1: Write a Journal Entry */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/journal/editor');
              }}
              style={({ pressed }) => [styles.gridCardPressable, { opacity: pressed ? 0.88 : 1 }]}
              accessibilityLabel="Write a Journal Entry"
            >
              <ZCard style={[styles.actionCard, styles.journalCard]} elevation="sm" radius={radii['2xl']}>
                <View style={[styles.iconCircle, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="journal-outline" size={26} color={colors.primaryDark} />
                </View>
                <View style={styles.cardContent}>
                  <ZText variant="label" color={colors.textPrimary} style={styles.cardTitle}>
                    Write Reflection
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary} style={styles.cardSubtitle}>
                    Pour out your heart in a distraction-free writing space
                  </ZText>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.tagPill, { backgroundColor: '#f5f3ff' }]}>
                    <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                      Distraction-free
                    </ZText>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
                </View>
              </ZCard>
            </Pressable>

            {/* Card 2: Record a Voice Note */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/journal/voice');
              }}
              style={({ pressed }) => [styles.gridCardPressable, { opacity: pressed ? 0.88 : 1 }]}
              accessibilityLabel="Record a Voice Note"
            >
              <ZCard style={[styles.actionCard, styles.voiceCard]} elevation="sm" radius={radii['2xl']}>
                <View style={[styles.iconCircle, { backgroundColor: '#ffe4e6' }]}>
                  <Ionicons name="mic-outline" size={26} color="#e11d48" />
                </View>
                <View style={styles.cardContent}>
                  <ZText variant="label" color={colors.textPrimary} style={styles.cardTitle}>
                    Record Voice Note
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary} style={styles.cardSubtitle}>
                    Speak freely with live audio waveform and private storage
                  </ZText>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.tagPill, { backgroundColor: '#fff1f2' }]}>
                    <ZText variant="caption" color="#e11d48" style={{ fontWeight: '600' }}>
                      Encrypted Audio
                    </ZText>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={22} color="#e11d48" />
                </View>
              </ZCard>
            </Pressable>

            {/* Card 3: Add a Memory */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push({ pathname: '/journal/editor', params: { type: 'photo' } });
              }}
              style={({ pressed }) => [styles.gridCardPressable, { opacity: pressed ? 0.88 : 1 }]}
              accessibilityLabel="Add a Memory"
            >
              <ZCard style={[styles.actionCard, styles.memoryCard]} elevation="sm" radius={radii['2xl']}>
                <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
                  <Ionicons name="images-outline" size={26} color="#0284c7" />
                </View>
                <View style={styles.cardContent}>
                  <ZText variant="label" color={colors.textPrimary} style={styles.cardTitle}>
                    Add a Memory
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary} style={styles.cardSubtitle}>
                    Preserve photographs, joyous milestones, and celebrations
                  </ZText>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.tagPill, { backgroundColor: '#f0f9ff' }]}>
                    <ZText variant="caption" color="#0284c7" style={{ fontWeight: '600' }}>
                      Photos & Joy
                    </ZText>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={22} color="#0284c7" />
                </View>
              </ZCard>
            </Pressable>

            {/* Card 4: Add a Task */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveModal('task');
              }}
              style={({ pressed }) => [styles.gridCardPressable, { opacity: pressed ? 0.88 : 1 }]}
              accessibilityLabel="Add a Task"
            >
              <ZCard style={[styles.actionCard, styles.taskCard]} elevation="sm" radius={radii['2xl']}>
                <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="checkbox-outline" size={26} color="#059669" />
                </View>
                <View style={styles.cardContent}>
                  <ZText variant="label" color={colors.textPrimary} style={styles.cardTitle}>
                    Add a Task
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary} style={styles.cardSubtitle}>
                    Organize your daily focus, priorities, and self-care steps
                  </ZText>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.tagPill, { backgroundColor: '#ecfdf5' }]}>
                    <ZText variant="caption" color="#059669" style={{ fontWeight: '600' }}>
                      Daily Focus
                    </ZText>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={22} color="#059669" />
                </View>
              </ZCard>
            </Pressable>
          </View>

          {/* ── 4. Quick Actions Row ────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <ZText variant="headingSmall" color={colors.textPrimary}>
              Gentle Actions
            </ZText>
            <ZText variant="caption" color={colors.textTertiary}>
              Instant check-ins
            </ZText>
          </View>

          <View style={styles.quickActionsContainer}>
            {/* Quick Action 1: Mood Check-in */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/mood');
              }}
              style={({ pressed }) => [
                styles.quickActionItem,
                { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel="Mood Check-in"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="happy-outline" size={20} color="#d97706" />
              </View>
              <ZText variant="label" color={colors.textPrimary} style={styles.quickActionText}>
                Mood Check-in
              </ZText>
              <ZText variant="caption" color={colors.textTertiary}>
                {todayMood ? `Today: ${todayMood}` : 'Log feeling'}
              </ZText>
            </Pressable>

            {/* Quick Action 2: Important Date */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveModal('date');
              }}
              style={({ pressed }) => [
                styles.quickActionItem,
                { backgroundColor: '#faf5ff', borderColor: '#f3e8ff' },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel="Important Date"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
              </View>
              <ZText variant="label" color={colors.textPrimary} style={styles.quickActionText}>
                Important Date
              </ZText>
              <ZText variant="caption" color={colors.textTertiary}>
                Birthdays & events
              </ZText>
            </Pressable>

            {/* Quick Action 3: Habit */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                setActiveModal('habit');
              }}
              style={({ pressed }) => [
                styles.quickActionItem,
                { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel="New Habit"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="repeat-outline" size={20} color="#16a34a" />
              </View>
              <ZText variant="label" color={colors.textPrimary} style={styles.quickActionText}>
                Daily Habit
              </ZText>
              <ZText variant="caption" color={colors.textTertiary}>
                Build streaks
              </ZText>
            </Pressable>

            {/* Quick Action 4: Quick Note */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/journal/editor');
              }}
              style={({ pressed }) => [
                styles.quickActionItem,
                { backgroundColor: '#fdf4ff', borderColor: '#fae8ff' },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityLabel="Quick Note"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#fae8ff' }]}>
                <Ionicons name="document-text-outline" size={20} color="#c026d3" />
              </View>
              <ZText variant="label" color={colors.textPrimary} style={styles.quickActionText}>
                Quick Note
              </ZText>
              <ZText variant="caption" color={colors.textTertiary}>
                Write a thought
              </ZText>
            </Pressable>
          </View>

          <View style={styles.bottomPad} />
        </View>
      </ScrollView>

      {/* ── Modal 1: Quick Task Creator ─────────────────────────────────── */}
      <Modal
        visible={activeModal === 'task'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.modalCard} elevation="md" radius={radii['2xl']}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="checkbox-outline" size={20} color="#059669" />
                </View>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  Add New Task
                </ZText>
              </View>
              <Pressable onPress={() => setActiveModal('none')} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 15 minutes evening yoga & lavender tea"
              placeholderTextColor={colors.textTertiary}
              value={taskTitle}
              onChangeText={setTaskTitle}
              autoFocus
            />

            <View style={styles.priorityRow}>
              <ZText variant="caption" color={colors.textSecondary}>
                Priority:
              </ZText>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => {
                    triggerHaptic();
                    setTaskPriority(p);
                  }}
                  style={[
                    styles.priorityChip,
                    taskPriority === p && styles.priorityChipActive,
                  ]}
                >
                  <ZText
                    variant="caption"
                    color={taskPriority === p ? colors.primaryDark : colors.textSecondary}
                    style={{ fontWeight: taskPriority === p ? '700' : '500', textTransform: 'capitalize' }}
                  >
                    {p}
                  </ZText>
                </Pressable>
              ))}
            </View>

            {taskSuccess && (
              <ZBadge
                label="✨ Task added to your daily agenda!"
                color="#059669"
                backgroundColor="#ecfdf5"
              />
            )}

            <View style={styles.modalBtnRow}>
              <ZButton
                variant="primary"
                label="Add Task"
                onPress={handleCreateTask}
                disabled={!taskTitle.trim() || taskSuccess}
                style={{ flex: 1 }}
              />
              <ZButton
                variant="ghost"
                label="Cancel"
                onPress={() => setActiveModal('none')}
              />
            </View>
          </ZCard>
        </View>
      </Modal>

      {/* ── Modal 2: Mood Check-in ───────────────────────────────────────── */}
      <Modal
        visible={activeModal === 'mood'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.modalCard} elevation="md" radius={radii['2xl']}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="happy-outline" size={20} color="#d97706" />
                </View>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  How are you feeling right now?
                </ZText>
              </View>
              <Pressable onPress={() => setActiveModal('none')} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.moodGrid}>
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.tag;
                return (
                  <Pressable
                    key={m.tag}
                    onPress={() => handleSelectMood(m.tag)}
                    style={[
                      styles.moodOptionCard,
                      { backgroundColor: isSelected ? m.color : '#faf5ff' },
                      isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                    ]}
                  >
                    <ZText style={{ fontSize: 28 }}>{m.emoji}</ZText>
                    <ZText
                      variant="label"
                      color={colors.textPrimary}
                      style={{ fontWeight: isSelected ? '700' : '600' }}
                    >
                      {m.label}
                    </ZText>
                    <ZText variant="caption" color={colors.textSecondary} align="center">
                      {m.desc}
                    </ZText>
                  </Pressable>
                );
              })}
            </View>

            {moodSuccess && (
              <ZBadge
                label="🌸 Mood recorded! Your sanctuary is synced."
                color={colors.primaryDark}
                backgroundColor={colors.primarySubtle}
              />
            )}
          </ZCard>
        </View>
      </Modal>

      {/* ── Modal 3: Important Date Creator ─────────────────────────────── */}
      <Modal
        visible={activeModal === 'date'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.modalCard} elevation="md" radius={radii['2xl']}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
                </View>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  Add Important Date
                </ZText>
              </View>
              <Pressable onPress={() => setActiveModal('none')} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Maya's Birthday or Botanical Spa Day"
              placeholderTextColor={colors.textTertiary}
              value={dateTitle}
              onChangeText={setDateTitle}
              autoFocus
            />

            <View style={styles.priorityRow}>
              <ZText variant="caption" color={colors.textSecondary}>
                Type:
              </ZText>
              {(['reminder', 'birthday', 'anniversary'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    triggerHaptic();
                    setDateType(t);
                  }}
                  style={[
                    styles.priorityChip,
                    dateType === t && styles.priorityChipActive,
                  ]}
                >
                  <ZText
                    variant="caption"
                    color={dateType === t ? colors.primaryDark : colors.textSecondary}
                    style={{ fontWeight: dateType === t ? '700' : '500', textTransform: 'capitalize' }}
                  >
                    {t}
                  </ZText>
                </Pressable>
              ))}
            </View>

            {dateSuccess && (
              <ZBadge
                label="✨ Important date saved to your calendar!"
                color="#7c3aed"
                backgroundColor="#ede9fe"
              />
            )}

            <View style={styles.modalBtnRow}>
              <ZButton
                variant="primary"
                label="Save Date"
                onPress={handleCreateDate}
                disabled={!dateTitle.trim() || dateSuccess}
                style={{ flex: 1 }}
              />
              <ZButton
                variant="ghost"
                label="Cancel"
                onPress={() => setActiveModal('none')}
              />
            </View>
          </ZCard>
        </View>
      </Modal>

      {/* ── Modal 4: Habit Creator ───────────────────────────────────────── */}
      <Modal
        visible={activeModal === 'habit'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalBackdrop}>
          <ZCard style={styles.modalCard} elevation="md" radius={radii['2xl']}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="repeat-outline" size={20} color="#16a34a" />
                </View>
                <ZText variant="headingSmall" color={colors.textPrimary}>
                  Build a New Habit
                </ZText>
              </View>
              <Pressable onPress={() => setActiveModal('none')} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 10 pages mindful reading before sleep"
              placeholderTextColor={colors.textTertiary}
              value={habitTitle}
              onChangeText={setHabitTitle}
              autoFocus
            />

            {habitSuccess && (
              <ZBadge
                label="🌱 Habit streak initialized! Track it in Calendar."
                color="#16a34a"
                backgroundColor="#dcfce7"
              />
            )}

            <View style={styles.modalBtnRow}>
              <ZButton
                variant="primary"
                label="Create Habit"
                onPress={handleCreateHabit}
                disabled={!habitTitle.trim() || habitSuccess}
                style={{ flex: 1 }}
              />
              <ZButton
                variant="ghost"
                label="Cancel"
                onPress={() => setActiveModal('none')}
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
  scroll: { flex: 1 },
  scrollContent: { padding: layout.screenPaddingH },
  responsiveContainer: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: spacing[4],
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  headerTextGroup: {
    gap: 2,
  },

  // Inspiration Card
  inspirationCard: {
    padding: spacing[3.5],
    backgroundColor: '#faf8fd',
    borderColor: '#ede7f6',
    borderWidth: 1,
  },
  inspirationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  inspirationIconBubble: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspirationText: {
    fontStyle: 'italic',
    lineHeight: 20,
    color: colors.textSecondary,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },

  // 4 Primary Action Cards Grid
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  gridCardPressable: {
    width: '48%',
    flexGrow: 1,
  },
  actionCard: {
    padding: spacing[4],
    gap: spacing[3],
    justifyContent: 'space-between',
    minHeight: 180,
    borderWidth: 1,
  },
  journalCard: {
    backgroundColor: '#faf8ff',
    borderColor: '#ede9fe',
  },
  voiceCard: {
    backgroundColor: '#fffafb',
    borderColor: '#ffe4e6',
  },
  memoryCard: {
    backgroundColor: '#f8fcff',
    borderColor: '#e0f2fe',
  },
  taskCard: {
    backgroundColor: '#f6fdf9',
    borderColor: '#d1fae5',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    gap: 4,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  tagPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radii.full,
  },

  // Quick Actions Container
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  quickActionItem: {
    flex: 1,
    minWidth: 135,
    padding: spacing[3],
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 6,
    ...shadows.xs,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontWeight: '600',
    fontSize: 13,
  },

  // Modal common styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 20, 35, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    padding: spacing[5],
    gap: spacing[3],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: radii.lg,
    padding: spacing[3],
    fontSize: 15,
    color: colors.textPrimary,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  priorityChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
  },
  priorityChipActive: {
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },

  // Mood Grid in Modal
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  moodOptionCard: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radii.xl,
    gap: 4,
  },

  bottomPad: { height: spacing[12] },
});
