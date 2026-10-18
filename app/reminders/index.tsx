/**
 * Zeona — Reminders Screen
 *
 * Full lifecycle management for mindful reminders & sanctuary cues:
 * - List upcoming, completed, and all reminders
 * - Create, edit, complete, and delete reminders
 * - Date, time, title, notes, and link to Tasks, Calendar Events, or Habits
 * - Enable / disable toggle with automated device schedule cancellation
 * - Real-time device notification permission status banner
 * - Clear visual distinction between Database-persisted records and Device-scheduled notifications
 * - Graceful handling of expired times, denied permissions, and timezone dates
 * - Duplicate notification scheduling prevention
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZCard, ZBadge, ZButton } from '@/components/ui';
import { colors, palette, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useReminderStore } from '@/store/reminderStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useHabitStore } from '@/store/habitStore';
import { triggerHaptic } from '@/utils/haptics';
import type { Reminder, ReminderFilter, ReminderRelatedType } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function getTomorrowISO(): string {
  const tmrw = new Date(Date.now() + 86400000);
  return `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(
    tmrw.getDate()
  ).padStart(2, '0')}`;
}

function getInDaysISO(days: number): string {
  const d = new Date(Date.now() + 86400000 * days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function formatReminderDate(dateStr: string): string {
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function format12HourTime(timeStr: string): string {
  if (!timeStr) return '09:00 AM';
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' should be '12'
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function isReminderExpired(dateStr: string, timeStr: string): boolean {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);
    const targetDate = new Date(year, month - 1, day, hours, minutes, 0);
    return targetDate.getTime() < Date.now();
  } catch {
    return false;
  }
}

const TIME_PRESETS = [
  { label: '08:00 AM', value: '08:00' },
  { label: '09:30 AM', value: '09:30' },
  { label: '12:00 PM', value: '12:00' },
  { label: '03:00 PM', value: '15:00' },
  { label: '06:30 PM', value: '18:30' },
  { label: '08:30 PM', value: '20:30' },
  { label: '09:45 PM', value: '21:45' },
];

export default function RemindersScreen() {
  const router = useRouter();

  // Stores
  const {
    reminders,
    isLoading,
    permissionInfo,
    initialize,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminderEnabled,
    toggleReminderCompleted,
    requestPermissions,
  } = useReminderStore();

  const { tasks, events } = useCalendarStore();
  const { habits } = useHabitStore();

  // Local state
  const [activeTab, setActiveTab] = useState<ReminderFilter>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(getTodayISO());
  const [formTime, setFormTime] = useState('09:00');
  const [formRelatedType, setFormRelatedType] = useState<ReminderRelatedType>('none');
  const [formRelatedId, setFormRelatedId] = useState<string | null>(null);
  const [formRelatedTitle, setFormRelatedTitle] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Status feedback toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 2800);
  };

  // ─── Filtered Reminders ────────────────────────────────────────────────────

  const filteredReminders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return reminders.filter((item) => {
      // 1. Search Query
      if (query) {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query) ?? false;
        const matchesRelated = item.related_title?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesNotes && !matchesRelated) return false;
      }

      // 2. Tab Filter
      if (activeTab === 'completed') {
        return item.is_completed;
      }

      if (activeTab === 'upcoming') {
        // Upcoming = not completed and (enabled or disabled, but in future/today)
        return !item.is_completed;
      }

      // 'all' tab shows everything
      return true;
    });
  }, [reminders, activeTab, searchQuery]);

  // ─── Counts for Tabs ───────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const upcoming = reminders.filter((r) => !r.is_completed).length;
    const completed = reminders.filter((r) => r.is_completed).length;
    return { upcoming, completed, all: reminders.length };
  }, [reminders]);

  // ─── Form Management ───────────────────────────────────────────────────────

  const openCreateModal = () => {
    triggerHaptic();
    setEditingReminder(null);
    setFormTitle('');
    setFormNotes('');
    setFormDate(getTomorrowISO());
    setFormTime('09:00');
    setFormRelatedType('none');
    setFormRelatedId(null);
    setFormRelatedTitle(null);
    setFormError(null);
    setIsFormVisible(true);
  };

  const openEditModal = (reminder: Reminder) => {
    triggerHaptic();
    setEditingReminder(reminder);
    setFormTitle(reminder.title);
    setFormNotes(reminder.notes || '');
    setFormDate(reminder.reminder_date);
    setFormTime(reminder.reminder_time);
    setFormRelatedType(reminder.related_type || 'none');
    setFormRelatedId(reminder.related_id ?? null);
    setFormRelatedTitle(reminder.related_title ?? null);
    setFormError(null);
    setIsFormVisible(true);
  };

  const handleSaveReminder = async () => {
    if (!formTitle.trim()) {
      setFormError('Please enter a reminder title');
      triggerHaptic();
      return;
    }

    if (!formDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setFormError('Date must be in YYYY-MM-DD format');
      triggerHaptic();
      return;
    }

    if (!formTime.match(/^\d{2}:\d{2}$/)) {
      setFormError('Time must be in HH:mm format');
      triggerHaptic();
      return;
    }

    setIsSaving(true);
    triggerHaptic();

    try {
      if (editingReminder) {
        await updateReminder(editingReminder.id, {
          title: formTitle.trim(),
          notes: formNotes.trim() || null,
          reminder_date: formDate,
          reminder_time: formTime,
          related_type: formRelatedType,
          related_id: formRelatedId,
          related_title: formRelatedTitle,
        });
        showToast('Reminder updated ✨');
      } else {
        await addReminder({
          title: formTitle.trim(),
          notes: formNotes.trim() || null,
          reminder_date: formDate,
          reminder_time: formTime,
          related_type: formRelatedType,
          related_id: formRelatedId,
          related_title: formRelatedTitle,
        });
        showToast('Reminder saved in sanctuary 🌸');
      }

      setIsFormVisible(false);
      setIsSaving(false);
    } catch {
      setFormError('Could not save reminder. Please try again.');
      setIsSaving(false);
    }
  };

  // ─── Delete Flow ───────────────────────────────────────────────────────────

  const confirmDelete = (reminder: Reminder) => {
    triggerHaptic();
    setReminderToDelete(reminder);
    setIsDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;
    triggerHaptic();
    await deleteReminder(reminderToDelete.id);
    setIsDeleteModalVisible(false);
    setReminderToDelete(null);
    showToast('Reminder removed 🌿');
  };

  // ─── Permission Request ────────────────────────────────────────────────────

  const handleRequestPermissions = async () => {
    triggerHaptic();
    const info = await requestPermissions();
    if (info.canSchedule) {
      showToast('Notifications enabled on this device! 🔔');
    } else {
      showToast('Saved for database reminders ☁️');
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

      {/* ── Screen Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTitles}>
            <ZText variant="displayMedium" color={colors.textBrand} style={{ fontWeight: '800' }}>
              Reminders
            </ZText>
            <ZText variant="caption" color={colors.textSecondary}>
              Mindful cues & sanctuary notifications
            </ZText>
          </View>

          <Pressable
            onPress={openCreateModal}
            style={styles.headerAddButton}
            accessibilityLabel="Add new reminder"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={palette.white} />
          </Pressable>
        </View>
      </View>

      {/* ── Main Scroll View ──────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* ── Feedback Toast ──────────────────────────────────────────────── */}
          {feedbackToast && (
            <View style={styles.toastContainer}>
              <View style={styles.toastCard}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <ZText variant="label" color={colors.textPrimary} style={{ marginLeft: spacing[2] }}>
                  {feedbackToast}
                </ZText>
              </View>
            </View>
          )}

          {/* ── Permission & Platform Capabilities Card ─────────────────────── */}
          <ZCard elevation="sm" style={styles.permissionCard} radius={radii.xl}>
            <View style={styles.permissionRow}>
              <View
                style={[
                  styles.permissionIconBadge,
                  {
                    backgroundColor:
                      permissionInfo.status === 'granted'
                        ? '#ecfdf5'
                        : permissionInfo.status === 'denied'
                        ? '#fef2f2'
                        : '#eff6ff',
                  },
                ]}
              >
                <Ionicons
                  name={
                    permissionInfo.status === 'granted'
                      ? 'notifications'
                      : permissionInfo.status === 'denied'
                      ? 'notifications-off'
                      : 'information-circle'
                  }
                  size={20}
                  color={
                    permissionInfo.status === 'granted'
                      ? '#059669'
                      : permissionInfo.status === 'denied'
                      ? '#dc2626'
                      : colors.primary
                  }
                />
              </View>

              <View style={styles.permissionContent}>
                <View style={styles.permissionHeaderLine}>
                  <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700' }}>
                    {Platform.OS === 'web'
                      ? 'Cloud Sanctuary Sync'
                      : permissionInfo.status === 'granted'
                      ? 'Device Notifications Active'
                      : permissionInfo.status === 'denied'
                      ? 'Notifications Muted'
                      : 'Enable Device Notifications'}
                  </ZText>

                  <ZBadge
                    label={
                      Platform.OS === 'web'
                        ? 'Web Environment'
                        : permissionInfo.status === 'granted'
                        ? 'Ready'
                        : permissionInfo.status === 'denied'
                        ? 'Denied'
                        : 'Action Needed'
                    }
                    color={
                      permissionInfo.status === 'granted'
                        ? '#059669'
                        : permissionInfo.status === 'denied'
                        ? '#dc2626'
                        : colors.primary
                    }
                    backgroundColor={
                      permissionInfo.status === 'granted'
                        ? '#ecfdf5'
                        : permissionInfo.status === 'denied'
                        ? '#fef2f2'
                        : colors.primarySubtle
                    }
                  />
                </View>

                <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {permissionInfo.platformDescription}
                </ZText>

                <View style={styles.permissionExplainer}>
                  <ZText variant="caption" color={colors.textTertiary}>
                    {Platform.OS === 'web'
                      ? '☁️ All reminders are preserved securely in your Supabase sanctuary and will trigger native audio/push alerts when opened on iOS or Android devices.'
                      : permissionInfo.status === 'granted'
                      ? '🌸 Scheduled alerts will ring on this device even when the app is closed.'
                      : 'Tap below to authorize push alerts so you never miss a mindful ritual.'}
                  </ZText>
                </View>
              </View>
            </View>

            {permissionInfo.status !== 'granted' && Platform.OS !== 'web' && (
              <View style={styles.permissionActionRow}>
                <ZButton
                  label="Allow Notifications"
                  size="sm"
                  variant="primary"
                  leftIcon={<Ionicons name="notifications-outline" size={16} color={palette.white} style={{ marginRight: 6 }} />}
                  onPress={handleRequestPermissions}
                />
              </View>
            )}
          </ZCard>

          {/* ── Search Bar ──────────────────────────────────────────────────── */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reminders, notes, or linked items…"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
          <View style={styles.tabsContainer}>
            {(['upcoming', 'completed', 'all'] as ReminderFilter[]).map((tab) => {
              const isActive = activeTab === tab;
              const count = counts[tab];
              const label = tab.charAt(0).toUpperCase() + tab.slice(1);

              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    triggerHaptic();
                    setActiveTab(tab);
                  }}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <ZText
                    variant="label"
                    color={isActive ? colors.primary : colors.textSecondary}
                    style={{ fontWeight: isActive ? '700' : '500' }}
                  >
                    {label}
                  </ZText>
                  <View
                    style={[
                      styles.tabBadge,
                      { backgroundColor: isActive ? colors.primarySubtle : palette.gray100 },
                    ]}
                  >
                    <ZText
                      variant="caption"
                      color={isActive ? colors.primaryDark : colors.textTertiary}
                      style={{ fontWeight: '600' }}
                    >
                      {count}
                    </ZText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* ── Reminders List ──────────────────────────────────────────────── */}
          {filteredReminders.length === 0 ? (
            <ZCard elevation="none" style={styles.emptyStateCard} radius={radii['2xl']}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={
                    searchQuery
                      ? 'search'
                      : activeTab === 'completed'
                      ? 'checkmark-done-circle'
                      : 'notifications-circle'
                  }
                  size={42}
                  color={colors.primary}
                />
              </View>

              <ZText variant="headingSmall" color={colors.textPrimary} align="center" style={{ fontWeight: '700' }}>
                {searchQuery
                  ? 'No matching reminders'
                  : activeTab === 'completed'
                  ? 'No completed reminders yet'
                  : 'Your sanctuary is peaceful'}
              </ZText>

              <ZText
                variant="bodyMedium"
                color={colors.textSecondary}
                align="center"
                style={{ marginTop: spacing[1], maxWidth: 320 }}
              >
                {searchQuery
                  ? `No reminders match "${searchQuery}". Clear your search to see all reminders.`
                  : activeTab === 'completed'
                  ? 'Reminders you mark complete will be safely archived here.'
                  : 'Set gentle cues for your evening tea, medication, reflection, or important tasks.'}
              </ZText>

              {!searchQuery && activeTab !== 'completed' && (
                <View style={{ marginTop: spacing[4] }}>
                  <ZButton
                    label="Create a Reminder"
                    variant="primary"
                    leftIcon={<Ionicons name="add" size={18} color={palette.white} style={{ marginRight: 6 }} />}
                    onPress={openCreateModal}
                  />
                </View>
              )}
            </ZCard>
          ) : (
            <View style={styles.remindersList}>
              {filteredReminders.map((reminder) => {
                const expired = isReminderExpired(reminder.reminder_date, reminder.reminder_time);
                const isCompleted = reminder.is_completed;
                const isEnabled = reminder.is_enabled;

                return (
                  <ZCard
                    key={reminder.id}
                    elevation="sm"
                    style={[
                      styles.reminderCard,
                      isCompleted && styles.reminderCardCompleted,
                      !isEnabled && !isCompleted && styles.reminderCardDisabled,
                    ]}
                    radius={radii.xl}
                  >
                    {/* Top Row: Checkbox, Title, Enable Switch */}
                    <View style={styles.reminderTopRow}>
                      {/* Completion Checkbox */}
                      <Pressable
                        onPress={() => {
                          triggerHaptic();
                          toggleReminderCompleted(reminder.id);
                        }}
                        style={[
                          styles.checkbox,
                          isCompleted && styles.checkboxCompleted,
                        ]}
                        accessibilityLabel={`Mark ${reminder.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isCompleted }}
                      >
                        {isCompleted && <Ionicons name="checkmark" size={16} color={palette.white} />}
                      </Pressable>

                      {/* Title & Notes */}
                      <View style={styles.reminderTitleArea}>
                        <ZText
                          variant="label"
                          color={isCompleted ? colors.textTertiary : colors.textPrimary}
                          style={[
                            styles.reminderTitle,
                            isCompleted && styles.textStrikethrough,
                            !isEnabled && !isCompleted && { color: colors.textSecondary },
                          ]}
                        >
                          {reminder.title}
                        </ZText>

                        {reminder.notes ? (
                          <ZText
                            variant="caption"
                            color={isCompleted ? colors.textTertiary : colors.textSecondary}
                            style={[styles.reminderNotes, isCompleted && styles.textStrikethrough]}
                            numberOfLines={2}
                          >
                            {reminder.notes}
                          </ZText>
                        ) : null}
                      </View>

                      {/* Enable/Disable Toggle Switch */}
                      <View style={styles.switchWrapper}>
                        <Switch
                          value={isEnabled}
                          onValueChange={() => {
                            triggerHaptic();
                            toggleReminderEnabled(reminder.id);
                          }}
                          trackColor={{ false: palette.gray200, true: colors.primary }}
                          thumbColor={Platform.OS === 'ios' ? undefined : palette.white}
                          ios_backgroundColor={palette.gray200}
                          accessibilityLabel={`Toggle reminder alert for ${reminder.title}`}
                        />
                      </View>
                    </View>

                    {/* Middle Row: Schedule Info & Related Link */}
                    <View style={styles.reminderMetaRow}>
                      <View style={styles.timeTag}>
                        <Ionicons name="time-outline" size={14} color={colors.primary} />
                        <ZText variant="caption" color={colors.textPrimary} style={{ fontWeight: '600', marginLeft: 4 }}>
                          {formatReminderDate(reminder.reminder_date)} • {format12HourTime(reminder.reminder_time)}
                        </ZText>
                      </View>

                      {/* Linked Task, Event or Habit */}
                      {reminder.related_type !== 'none' && reminder.related_title && (
                        <View style={styles.relatedBadge}>
                          <Ionicons
                            name={
                              reminder.related_type === 'task'
                                ? 'checkbox-outline'
                                : reminder.related_type === 'event'
                                ? 'calendar-outline'
                                : 'repeat-outline'
                            }
                            size={12}
                            color={
                              reminder.related_type === 'task'
                                ? '#059669'
                                : reminder.related_type === 'event'
                                ? '#7c3aed'
                                : '#d97706'
                            }
                          />
                          <ZText
                            variant="caption"
                            color={colors.textSecondary}
                            style={{ marginLeft: 4, fontWeight: '500' }}
                            numberOfLines={1}
                          >
                            {(reminder.related_type || 'none').toUpperCase()}: {reminder.related_title}
                          </ZText>
                        </View>
                      )}
                    </View>

                    {/* Bottom Row: Clear Status Indicators & Action Buttons */}
                    <View style={styles.reminderBottomRow}>
                      {/* Status Badges: Distinctly separating DB storage from Device scheduling */}
                      <View style={styles.statusBadgesGroup}>
                        {/* 1. Database Persistence Badge */}
                        <View style={styles.statusPillDb}>
                          <Ionicons name="cloud-done-outline" size={11} color={colors.primary} />
                          <ZText variant="caption" color={colors.primaryDark} style={styles.statusPillText}>
                            Sanctuary Cloud
                          </ZText>
                        </View>

                        {/* 2. Device Notification Scheduling Badge */}
                        {isCompleted ? (
                          <View style={styles.statusPillCompleted}>
                            <Ionicons name="checkmark-done" size={11} color="#059669" />
                            <ZText variant="caption" color="#059669" style={styles.statusPillText}>
                              Completed
                            </ZText>
                          </View>
                        ) : !isEnabled ? (
                          <View style={styles.statusPillMuted}>
                            <Ionicons name="volume-mute-outline" size={11} color={colors.textTertiary} />
                            <ZText variant="caption" color={colors.textTertiary} style={styles.statusPillText}>
                              Alert Muted
                            </ZText>
                          </View>
                        ) : expired ? (
                          <View style={styles.statusPillExpired}>
                            <Ionicons name="hourglass-outline" size={11} color="#b45309" />
                            <ZText variant="caption" color="#b45309" style={styles.statusPillText}>
                              Past Due
                            </ZText>
                          </View>
                        ) : reminder.is_scheduled_on_device ? (
                          <View style={styles.statusPillScheduled}>
                            <Ionicons name="notifications" size={11} color="#059669" />
                            <ZText variant="caption" color="#059669" style={styles.statusPillText}>
                              Device Active
                            </ZText>
                          </View>
                        ) : (
                          <View style={styles.statusPillInApp}>
                            <Ionicons name="information-circle-outline" size={11} color={colors.textTertiary} />
                            <ZText variant="caption" color={colors.textTertiary} style={styles.statusPillText}>
                              In-App Cue
                            </ZText>
                          </View>
                        )}
                      </View>

                      {/* Edit & Delete Action Buttons */}
                      <View style={styles.actionsRow}>
                        <Pressable
                          onPress={() => openEditModal(reminder)}
                          style={styles.actionIconButton}
                          accessibilityLabel={`Edit reminder ${reminder.title}`}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                        </Pressable>

                        <Pressable
                          onPress={() => confirmDelete(reminder)}
                          style={styles.actionIconButton}
                          accessibilityLabel={`Delete reminder ${reminder.title}`}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  </ZCard>
                );
              })}
            </View>
          )}

          {/* ── Guidance & Settings Link Card ───────────────────────────────── */}
          <ZCard elevation="none" style={styles.guidanceCard} radius={radii.xl}>
            <View style={styles.guidanceRow}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing[3] }}>
                <ZText variant="label" color={colors.textPrimary}>
                  Sanctuary Notification Settings
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Adjust audio cues, quiet hours, and mindfulness intervals in your profile settings.
                </ZText>
              </View>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/(tabs)/profile');
                }}
                style={styles.guidanceNavButton}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </ZCard>
        </View>
      </ScrollView>

      {/* ── Create / Edit Reminder Modal ──────────────────────────────────── */}
      <Modal
        visible={isFormVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFormVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <ZText variant="headingSmall" color={colors.textBrand} style={{ fontWeight: '800' }}>
                  {editingReminder ? 'Edit Reminder' : 'New Reminder'}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  Saved to sanctuary cloud • Scheduled on device
                </ZText>
              </View>
              <Pressable
                onPress={() => setIsFormVisible(false)}
                style={styles.modalCloseButton}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Error Message */}
              {formError && (
                <View style={styles.formErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#dc2626" />
                  <ZText variant="caption" color="#dc2626" style={{ marginLeft: 6, flex: 1 }}>
                    {formError}
                  </ZText>
                </View>
              )}

              {/* Title Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Reminder Title *
                </ZText>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Evening Chamomile Tea, Drink water, Call mom…"
                  placeholderTextColor={colors.textTertiary}
                  value={formTitle}
                  onChangeText={(text) => {
                    setFormTitle(text);
                    if (formError) setFormError(null);
                  }}
                  autoFocus={!editingReminder}
                />
              </View>

              {/* Notes Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Notes / Gentle Intention (Optional)
                </ZText>
                <TextInput
                  style={[styles.modalTextInput, styles.modalTextArea]}
                  placeholder="Add gentle context, steps, or warm encouragement…"
                  placeholderTextColor={colors.textTertiary}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Date Presets & Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Reminder Date
                </ZText>
                <View style={styles.chipRow}>
                  {[
                    { label: 'Today', value: getTodayISO() },
                    { label: 'Tomorrow', value: getTomorrowISO() },
                    { label: 'In 3 Days', value: getInDaysISO(3) },
                    { label: 'Next Week', value: getInDaysISO(7) },
                  ].map((preset) => {
                    const isSelected = formDate === preset.value;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() => {
                          triggerHaptic();
                          setFormDate(preset.value);
                        }}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      >
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.primaryDark : colors.textSecondary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {preset.label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  style={[styles.modalTextInput, { marginTop: spacing[2] }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  value={formDate}
                  onChangeText={setFormDate}
                />
              </View>

              {/* Time Presets & Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Reminder Time
                </ZText>
                <View style={styles.chipRow}>
                  {TIME_PRESETS.map((preset) => {
                    const isSelected = formTime === preset.value;
                    return (
                      <Pressable
                        key={preset.value}
                        onPress={() => {
                          triggerHaptic();
                          setFormTime(preset.value);
                        }}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      >
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.primaryDark : colors.textSecondary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {preset.label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  style={[styles.modalTextInput, { marginTop: spacing[2] }]}
                  placeholder="HH:mm (e.g. 09:30 or 20:00)"
                  placeholderTextColor={colors.textTertiary}
                  value={formTime}
                  onChangeText={setFormTime}
                />
              </View>

              {/* Link to Task, Event, or Habit */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary} style={styles.fieldLabel}>
                  Link to Sanctuary Item (Optional)
                </ZText>
                <View style={styles.chipRow}>
                  {(['none', 'task', 'event', 'habit'] as ReminderRelatedType[]).map((type) => {
                    const isSelected = formRelatedType === type;
                    const label = type.charAt(0).toUpperCase() + type.slice(1);
                    return (
                      <Pressable
                        key={type}
                        onPress={() => {
                          triggerHaptic();
                          setFormRelatedType(type);
                          if (type === 'none') {
                            setFormRelatedId(null);
                            setFormRelatedTitle(null);
                          }
                        }}
                        style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      >
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.primaryDark : colors.textSecondary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* If Task chosen: quick picker */}
                {formRelatedType === 'task' && (
                  <View style={styles.relatedPickerBox}>
                    <ZText variant="caption" color={colors.textTertiary} style={{ marginBottom: 4 }}>
                      Choose from your active tasks:
                    </ZText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      {tasks.slice(0, 6).map((task) => {
                        const isMatch = formRelatedId === task.id;
                        return (
                          <Pressable
                            key={task.id}
                            onPress={() => {
                              triggerHaptic();
                              setFormRelatedId(task.id);
                              setFormRelatedTitle(task.title);
                            }}
                            style={[styles.quickPickPill, isMatch && styles.quickPickPillActive]}
                          >
                            <ZText
                              variant="caption"
                              color={isMatch ? colors.primaryDark : colors.textSecondary}
                              style={{ fontWeight: isMatch ? '700' : '500' }}
                            >
                              📋 {task.title}
                            </ZText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* If Event chosen: quick picker */}
                {formRelatedType === 'event' && (
                  <View style={styles.relatedPickerBox}>
                    <ZText variant="caption" color={colors.textTertiary} style={{ marginBottom: 4 }}>
                      Choose from your events:
                    </ZText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      {events.slice(0, 6).map((ev) => {
                        const isMatch = formRelatedId === ev.id;
                        return (
                          <Pressable
                            key={ev.id}
                            onPress={() => {
                              triggerHaptic();
                              setFormRelatedId(ev.id);
                              setFormRelatedTitle(ev.title);
                            }}
                            style={[styles.quickPickPill, isMatch && styles.quickPickPillActive]}
                          >
                            <ZText
                              variant="caption"
                              color={isMatch ? colors.primaryDark : colors.textSecondary}
                              style={{ fontWeight: isMatch ? '700' : '500' }}
                            >
                              📅 {ev.title}
                            </ZText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* If Habit chosen: quick picker */}
                {formRelatedType === 'habit' && (
                  <View style={styles.relatedPickerBox}>
                    <ZText variant="caption" color={colors.textTertiary} style={{ marginBottom: 4 }}>
                      Choose from your daily habits:
                    </ZText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      {habits.slice(0, 6).map((h) => {
                        const isMatch = formRelatedId === h.id;
                        return (
                          <Pressable
                            key={h.id}
                            onPress={() => {
                              triggerHaptic();
                              setFormRelatedId(h.id);
                              setFormRelatedTitle(h.title);
                            }}
                            style={[styles.quickPickPill, isMatch && styles.quickPickPillActive]}
                          >
                            <ZText
                              variant="caption"
                              color={isMatch ? colors.primaryDark : colors.textSecondary}
                              style={{ fontWeight: isMatch ? '700' : '500' }}
                            >
                              🌸 {h.title}
                            </ZText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Information Footnote */}
              <View style={styles.modalInfoNotice}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                <ZText variant="caption" color={colors.textSecondary} style={{ marginLeft: 6, flex: 1 }}>
                  Reminders are stored in Supabase with offline cache, and registered with device notifications where authorized.
                </ZText>
              </View>

              {/* Save & Cancel Buttons */}
              <View style={styles.modalActionsRow}>
                <ZButton
                  label="Cancel"
                  variant="outline"
                  onPress={() => setIsFormVisible(false)}
                  style={{ flex: 1, marginRight: spacing[2] }}
                />
                <ZButton
                  label={isSaving ? 'Saving…' : editingReminder ? 'Save Changes' : 'Create Reminder'}
                  variant="primary"
                  onPress={handleSaveReminder}
                  isLoading={isSaving}
                  style={{ flex: 2 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteDialogCard}>
            <View style={styles.deleteDialogIcon}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </View>

            <ZText variant="headingSmall" color={colors.textPrimary} align="center" style={{ fontWeight: '700' }}>
              Delete Reminder?
            </ZText>

            <ZText
              variant="bodyMedium"
              color={colors.textSecondary}
              align="center"
              style={{ marginTop: spacing[2], marginBottom: spacing[4] }}
            >
              Are you sure you want to remove &quot;{reminderToDelete?.title}&quot;? Any scheduled device alert will also be canceled.
            </ZText>

            <View style={styles.modalActionsRow}>
              <ZButton
                label="Cancel"
                variant="outline"
                onPress={() => setIsDeleteModalVisible(false)}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
              <ZButton
                label="Delete"
                variant="danger"
                onPress={handleDelete}
                style={{ flex: 1 }}
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
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230, 225, 220, 0.5)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerTitles: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  responsiveContainer: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },

  // Toast
  toastContainer: {
    marginBottom: spacing[3],
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primarySubtle,
    ...shadows.md,
  },

  // Permission Card
  permissionCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 220, 0.7)',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  permissionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionExplainer: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
  },
  permissionActionRow: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: palette.gray100,
    alignItems: 'flex-start',
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 220, 0.8)',
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    outlineStyle: 'none',
  } as any,

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: radii.xl,
    padding: 3,
    marginBottom: spacing[4],
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderRadius: radii.lg,
  },
  tabButtonActive: {
    backgroundColor: palette.white,
    ...shadows.sm,
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },

  // Empty State
  emptyStateCard: {
    padding: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 220, 0.6)',
    marginVertical: spacing[4],
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },

  // Reminders List
  remindersList: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  reminderCard: {
    padding: spacing[4],
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 220, 0.8)',
    ...shadows.sm,
  },
  reminderCardCompleted: {
    backgroundColor: 'rgba(250, 250, 250, 0.85)',
    borderColor: 'rgba(230, 225, 220, 0.4)',
  },
  reminderCardDisabled: {
    backgroundColor: 'rgba(248, 248, 248, 0.85)',
    opacity: 0.85,
  },
  reminderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    marginRight: spacing[3],
    backgroundColor: palette.white,
  },
  checkboxCompleted: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  reminderTitleArea: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '700',
    lineHeight: 20,
  },
  reminderNotes: {
    marginTop: 2,
    lineHeight: 16,
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
  },
  switchWrapper: {
    marginLeft: spacing[2],
  },

  // Meta Row
  reminderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
    marginLeft: 34,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.md,
  },
  relatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 244, 246, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.md,
    maxWidth: 200,
  },

  // Bottom Row
  reminderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(240, 240, 240, 0.7)',
    marginLeft: 34,
  },
  statusBadgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPillDb: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusPillScheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusPillInApp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusPillMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusPillExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusPillCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  actionIconButton: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },

  // Guidance Card
  guidanceCard: {
    padding: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 220, 0.6)',
    marginBottom: spacing[6],
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidanceNavButton: {
    padding: spacing[1],
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContainer: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    backgroundColor: palette.white,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
    marginBottom: spacing[3],
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: palette.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 520,
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: spacing[3],
    borderRadius: radii.lg,
    marginBottom: spacing[3],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  fieldLabel: {
    marginBottom: spacing[1],
    fontWeight: '700',
  },
  modalTextInput: {
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 14,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    outlineStyle: 'none',
  } as any,
  modalTextArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginVertical: spacing[1],
  },
  presetChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: palette.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  relatedPickerBox: {
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: palette.gray100,
    borderRadius: radii.lg,
  },
  quickPickPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: palette.white,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  quickPickPillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  modalInfoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    padding: spacing[3],
    borderRadius: radii.lg,
    marginBottom: spacing[4],
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },

  // Delete Dialog
  deleteDialogCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.white,
    borderRadius: radii['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.lg,
  },
  deleteDialogIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
});
