/**
 * Zeona — Calendar & Schedule
 *
 * Full-featured monthly calendar with:
 * - Monthly navigation with previous/next and "Today" shortcut
 * - Accurate month boundaries, leap years, and local date handling
 * - Clear selected-day styling and today indicator
 * - Category-colored indicator dots for days containing events or reminders
 * - Selected date agenda with events and daily tasks
 * - Detailed event cards with time, category badge, and in-app reminder status
 * - Add, edit, and delete event modals with validation and duplicate-submission protection
 * - Important dates filter (birthdays, anniversaries, exams, and milestones)
 * - Calming empty state when no events exist on selected date
 * - Responsive web and mobile layout adhering to Zeona's lavender/cream aesthetic
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZCard, ZBadge, ZButton, ZEmptyState } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useCalendarStore, EVENT_CATEGORY_CONFIG } from '@/store/calendarStore';
import { triggerHaptic } from '@/utils/haptics';
import type { CalendarEvent, CalendarEventType } from '@/types';

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TIME_PRESETS = ['All day', '09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:30 PM'];

const REMINDER_PRESETS: { value: string; label: string }[] = [
  { value: 'at_event_time', label: 'At event time' },
  { value: '15_min_before', label: '15 min before' },
  { value: '1_hour_before', label: '1 hour before' },
  { value: '1_day_before', label: '1 day before' },
];

/**
 * Returns number of days in month (handling leap years seamlessly: Feb 29 in 2024/2028).
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns Sunday-indexed first day of month (0 to 6).
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Formats local year, month (0-indexed), and day to "YYYY-MM-DD" without timezone shifts.
 */
function toISODateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parses "YYYY-MM-DD" into local { year, month: 0-indexed, day }.
 */
function parseISODate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: (m || 1) - 1, day: d || 1 };
}

/**
 * Formats a date nicely for human display: "Saturday, Oct 17, 2026".
 */
function formatPrettyDate(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Main Calendar Screen ─────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const {
    tasks,
    events,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleTask,
    selectedDate,
    setSelectedDate,
    isLoading,
  } = useCalendarStore();

  // Local calendar state initialized to current local time
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Active filter tab for below the calendar: 'agenda' (selected day) or 'milestones' (month's important dates)
  const [filterView, setFilterView] = useState<'agenda' | 'milestones'>('agenda');

  // Modal states
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // Form input states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEventType>('event');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('All day');
  const [formHasReminder, setFormHasReminder] = useState(false);
  const [formReminderTime, setFormReminderTime] = useState('15_min_before');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Derived date calculations
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const isCurrentMonthToday =
    currentYear === now.getFullYear() && currentMonth === now.getMonth();
  const todayNumber = now.getDate();
  const todayISOString = toISODateString(now.getFullYear(), now.getMonth(), now.getDate());

  // Computed map of date string -> CalendarEvent[] for the indicator dots
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events) {
      if (!map[evt.event_date]) {
        map[evt.event_date] = [];
      }
      map[evt.event_date].push(evt);
    }
    return map;
  }, [events]);

  // Selected date ISO string
  const currentSelectedDateISO = toISODateString(currentYear, currentMonth, selectedDay);

  // Events on the currently selected day
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[currentSelectedDateISO] || [];
  }, [eventsByDate, currentSelectedDateISO]);

  // Tasks for the currently selected day
  const selectedDayTasks = useMemo(() => {
    return tasks.filter((t) => t.due_date === currentSelectedDateISO);
  }, [tasks, currentSelectedDateISO]);

  // Important dates in current month (birthdays, anniversaries, exams, milestones)
  const monthImportantDates = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return events.filter(
      (evt) =>
        evt.event_date.startsWith(monthPrefix) &&
        ['birthday', 'anniversary', 'exam', 'milestone'].includes(evt.event_type)
    );
  }, [events, currentYear, currentMonth]);

  // Month navigation
  const handlePrevMonth = () => {
    triggerHaptic();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(1);
    setSelectedDate(toISODateString(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(1);
    setSelectedDate(toISODateString(currentMonth === 11 ? currentYear + 1 : currentYear, currentMonth === 11 ? 0 : currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    triggerHaptic();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDay(todayDay);
    const dateStr = toISODateString(todayYear, todayMonth, todayDay);
    setSelectedDate(dateStr);
  };

  const handleSelectDay = (day: number) => {
    triggerHaptic();
    setSelectedDay(day);
    const dateStr = toISODateString(currentYear, currentMonth, day);
    setSelectedDate(dateStr);
  };

  // Build grid calendar cells with blank pads for alignment
  const calendarCells: (number | null)[] = useMemo(() => {
    const list: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      list.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(d);
    }
    while (list.length % 7 !== 0) {
      list.push(null);
    }
    return list;
  }, [firstDay, daysInMonth]);

  // ─── Modal Openers ─────────────────────────────────────────────────────────

  const openAddEventModal = (defaultDate?: string) => {
    triggerHaptic();
    setEditingEvent(null);
    setFormTitle('');
    setFormCategory('event');
    setFormDate(defaultDate || currentSelectedDateISO);
    setFormTime('All day');
    setFormHasReminder(false);
    setFormReminderTime('15_min_before');
    setFormNotes('');
    setFormError(null);
    setIsFormModalVisible(true);
  };

  const openEditEventModal = (event: CalendarEvent) => {
    triggerHaptic();
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormCategory(event.event_type);
    setFormDate(event.event_date);
    setFormTime(event.event_time || 'All day');
    setFormHasReminder(Boolean(event.has_reminder));
    setFormReminderTime(event.reminder_time || '15_min_before');
    setFormNotes(event.description || '');
    setFormError(null);
    setIsFormModalVisible(true);
  };

  const openDeleteModal = (event: CalendarEvent) => {
    triggerHaptic();
    setEventToDelete(event);
    setIsDeleteModalVisible(true);
  };

  // ─── Form Submission ───────────────────────────────────────────────────────

  const handleSaveEvent = async () => {
    if (isSaving) return;
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a title for the event.');
      return;
    }
    if (!formDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setFormError('Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const config = EVENT_CATEGORY_CONFIG[formCategory];
    const eventPayload: Partial<CalendarEvent> = {
      title: trimmedTitle,
      event_type: formCategory,
      event_date: formDate,
      event_time: formTime === 'All day' ? null : formTime,
      has_reminder: formHasReminder,
      reminder_time: formHasReminder ? formReminderTime : null,
      description: formNotes.trim() || null,
      color: config.color,
      is_recurring: ['birthday', 'anniversary'].includes(formCategory),
      recurrence_rule: ['birthday', 'anniversary'].includes(formCategory) ? 'yearly' : null,
    };

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventPayload);
      } else {
        await addEvent(eventPayload);
      }

      // If user scheduled event on different date, navigate calendar to that date
      const parsed = parseISODate(formDate);
      setCurrentYear(parsed.year);
      setCurrentMonth(parsed.month);
      setSelectedDay(parsed.day);
      setSelectedDate(formDate);

      triggerHaptic();
      setIsFormModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Could not save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.id);
      triggerHaptic();
      setIsDeleteModalVisible(false);
      setEventToDelete(null);
    } catch {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* ── Header Bar ─────────────────────────────────────────────── */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }}>
              <ZText variant="headingLarge" color={colors.textBrand} style={styles.headerTitle}>
                Calendar
              </ZText>
              <ZText variant="caption" color={colors.textSecondary}>
                Important dates, gentle reminders & daily rhythms
              </ZText>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={handleJumpToToday}
                hitSlop={8}
                style={styles.todayShortcutBtn}
                accessibilityRole="button"
                accessibilityLabel="Jump to today's date"
              >
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <ZText variant="label" color={colors.primary} style={{ fontSize: 13, fontWeight: '700' }}>
                  Today
                </ZText>
              </Pressable>

              <Pressable
                onPress={() => openAddEventModal()}
                hitSlop={8}
                style={styles.primaryAddBtn}
                accessibilityRole="button"
                accessibilityLabel="Schedule an event"
              >
                <Ionicons name="add" size={18} color={colors.textInverse} />
                <ZText variant="label" color={colors.textInverse} style={{ fontSize: 13, fontWeight: '700' }}>
                  Add
                </ZText>
              </Pressable>
            </View>
          </View>

          {/* ── Month Navigation Card ───────────────────────────────────── */}
          <ZCard elevation="sm" style={styles.calCard} radius={radii['2xl']}>
            <View style={styles.monthNavRow}>
              <Pressable
                onPress={handlePrevMonth}
                hitSlop={12}
                style={styles.navArrow}
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.monthTitleWrapper}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <ZText variant="headingMedium" color={colors.textBrand} style={{ fontWeight: '700' }}>
                  {MONTHS[currentMonth]} {currentYear}
                </ZText>
              </View>

              <Pressable
                onPress={handleNextMonth}
                hitSlop={12}
                style={styles.navArrow}
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekRow}>
              {DAYS_SHORT.map((d, index) => (
                <ZText
                  key={d}
                  variant="caption"
                  color={index === 0 || index === 6 ? colors.primary : colors.textTertiary}
                  align="center"
                  style={styles.dayHeader}
                >
                  {d}
                </ZText>
              ))}
            </View>

            {/* Calendar Grid Cells */}
            {Array.from({ length: calendarCells.length / 7 }, (_, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {calendarCells.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => {
                  if (day === null) {
                    return <View key={`blank-${colIndex}`} style={styles.dayCell} />;
                  }

                  const isToday = isCurrentMonthToday && day === todayNumber;
                  const isSelected = day === selectedDay;
                  const dateKey = toISODateString(currentYear, currentMonth, day);
                  const dayEvents = eventsByDate[dateKey] || [];

                  return (
                    <Pressable
                      key={`day-${day}`}
                      style={styles.dayCell}
                      onPress={() => handleSelectDay(day)}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatPrettyDate(currentYear, currentMonth, day)}, ${dayEvents.length} events`}
                    >
                      <View
                        style={[
                          styles.dayNumWrapper,
                          isSelected && styles.dayNumSelected,
                          isToday && !isSelected && styles.dayNumToday,
                        ]}
                      >
                        <ZText
                          variant="bodySmall"
                          color={
                            isSelected
                              ? colors.textInverse
                              : isToday
                              ? colors.primary
                              : colors.textPrimary
                          }
                          align="center"
                          style={{
                            fontWeight: isSelected || isToday ? '700' : '500',
                            fontSize: 14,
                          }}
                        >
                          {day}
                        </ZText>
                      </View>

                      {/* Day Event Indicators (colored dots) */}
                      <View style={styles.indicatorsRow}>
                        {dayEvents.slice(0, 3).map((evt, idx) => (
                          <View
                            key={evt.id || idx}
                            style={[
                              styles.indicatorDot,
                              { backgroundColor: evt.color || colors.primary },
                              isSelected && { borderColor: colors.surface },
                            ]}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <View
                            style={[
                              styles.indicatorDot,
                              { backgroundColor: colors.textTertiary },
                            ]}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ZCard>

          {/* ── Sub Navigation / Filter Chips ───────────────────────────── */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                setFilterView('agenda');
              }}
              style={[
                styles.filterChip,
                filterView === 'agenda' && styles.filterChipActive,
              ]}
            >
              <Ionicons
                name="today-outline"
                size={16}
                color={filterView === 'agenda' ? colors.textInverse : colors.textSecondary}
              />
              <ZText
                variant="label"
                color={filterView === 'agenda' ? colors.textInverse : colors.textSecondary}
              >
                Selected Day Agenda
              </ZText>
              {selectedDayEvents.length > 0 && (
                <View
                  style={[
                    styles.chipBadge,
                    filterView === 'agenda'
                      ? { backgroundColor: colors.primarySubtle }
                      : { backgroundColor: colors.primarySubtle },
                  ]}
                >
                  <ZText
                    variant="caption"
                    color={colors.primary}
                    style={{ fontSize: 11, fontWeight: '700' }}
                  >
                    {selectedDayEvents.length}
                  </ZText>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic();
                setFilterView('milestones');
              }}
              style={[
                styles.filterChip,
                filterView === 'milestones' && styles.filterChipActive,
              ]}
            >
              <Ionicons
                name="ribbon-outline"
                size={16}
                color={filterView === 'milestones' ? colors.textInverse : colors.textSecondary}
              />
              <ZText
                variant="label"
                color={filterView === 'milestones' ? colors.textInverse : colors.textSecondary}
              >
                Month Milestones
              </ZText>
              {monthImportantDates.length > 0 && (
                <View style={styles.chipBadge}>
                  <ZText
                    variant="caption"
                    color={colors.primary}
                    style={{ fontSize: 11, fontWeight: '700' }}
                  >
                    {monthImportantDates.length}
                  </ZText>
                </View>
              )}
            </Pressable>
          </View>

          {/* ── VIEW: SELECTED DAY AGENDA ─────────────────────────────────── */}
          {filterView === 'agenda' && (
            <View style={styles.agendaContainer}>
              {/* Agenda Day Header */}
              <View style={styles.agendaHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ZText variant="headingSmall" color={colors.textPrimary}>
                    {formatPrettyDate(currentYear, currentMonth, selectedDay)}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>
                    {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
                    {selectedDayTasks.length > 0 ? ` • ${selectedDayTasks.length} daily tasks` : ''}
                  </ZText>
                </View>

                <Pressable
                  onPress={() => openAddEventModal(currentSelectedDateISO)}
                  style={styles.addEventInlineBtn}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <ZText variant="label" color={colors.primary} style={{ fontSize: 13 }}>
                    New Event
                  </ZText>
                </Pressable>
              </View>

              {/* Event Cards on Selected Date */}
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => {
                  const categoryConfig =
                    EVENT_CATEGORY_CONFIG[event.event_type] || EVENT_CATEGORY_CONFIG.event;

                  return (
                    <ZCard
                      key={event.id}
                      elevation="xs"
                      style={styles.eventCard}
                      radius={radii.xl}
                    >
                      {/* Left accent bar */}
                      <View
                        style={[
                          styles.eventAccentBar,
                          { backgroundColor: event.color || categoryConfig.color },
                        ]}
                      />

                      <View style={styles.eventContent}>
                        {/* Badges row: category + time */}
                        <View style={styles.eventBadgeRow}>
                          <View
                            style={[
                              styles.categoryPill,
                              {
                                backgroundColor: categoryConfig.bg,
                                borderColor: categoryConfig.borderColor,
                              },
                            ]}
                          >
                            <Ionicons
                              name={categoryConfig.icon as any}
                              size={13}
                              color={categoryConfig.color}
                              style={{ marginRight: 4 }}
                            />
                            <ZText
                              variant="caption"
                              color={categoryConfig.color}
                              style={{ fontWeight: '700', fontSize: 11 }}
                            >
                              {categoryConfig.label}
                            </ZText>
                          </View>

                          <View style={styles.timePill}>
                            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                            <ZText variant="caption" color={colors.textSecondary} style={{ fontSize: 12 }}>
                              {event.event_time || 'All day'}
                            </ZText>
                          </View>
                        </View>

                        {/* Event Title & Description */}
                        <ZText variant="headingSmall" color={colors.textPrimary} style={{ marginTop: 2 }}>
                          {event.title}
                        </ZText>
                        {event.description && (
                          <ZText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                            {event.description}
                          </ZText>
                        )}

                        {/* Reminder Notice */}
                        {event.has_reminder && (
                          <View style={styles.reminderBanner}>
                            <Ionicons name="alarm-outline" size={14} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                              <ZText
                                variant="caption"
                                color={colors.primary}
                                style={{ fontWeight: '600', fontSize: 11.5 }}
                              >
                                In-App Reminder: {event.reminder_time?.replace(/_/g, ' ') || '15 min before'}
                              </ZText>
                              <ZText variant="caption" color={colors.textTertiary} style={{ fontSize: 10.5 }}>
                                Active in Zeona. System push connects when device notifications are enabled.
                              </ZText>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Action buttons (Edit & Delete) */}
                      <View style={styles.eventActionsCol}>
                        <Pressable
                          onPress={() => openEditEventModal(event)}
                          style={styles.iconActionBtn}
                          hitSlop={8}
                          accessibilityLabel="Edit event"
                        >
                          <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => openDeleteModal(event)}
                          style={styles.iconActionBtn}
                          hitSlop={8}
                          accessibilityLabel="Delete event"
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </Pressable>
                      </View>
                    </ZCard>
                  );
                })
              ) : (
                /* Empty state for selected date */
                <ZCard elevation="xs" style={styles.emptyCard} radius={radii.xl}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="calendar-outline" size={32} color={colors.primary} />
                  </View>
                  <ZText variant="headingSmall" color={colors.textPrimary} align="center">
                    No events scheduled
                  </ZText>
                  <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ maxWidth: 320 }}>
                    A peaceful, open day with nothing on the schedule. Plan a milestone, birthday, or gentle reminder.
                  </ZText>
                  <ZButton
                    label="Schedule Event"
                    variant="primary"
                    size="sm"
                    leftIcon={<Ionicons name="add" size={16} color={colors.textInverse} />}
                    onPress={() => openAddEventModal(currentSelectedDateISO)}
                    style={{ marginTop: spacing[2] }}
                  />
                </ZCard>
              )}

              {/* Tasks for this day */}
              {selectedDayTasks.length > 0 && (
                <View style={{ gap: spacing[2], marginTop: spacing[3] }}>
                  <ZText variant="label" color={colors.textSecondary}>
                    Tasks on this day ({selectedDayTasks.length})
                  </ZText>
                  {selectedDayTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => {
                        triggerHaptic();
                        toggleTask(task.id);
                      }}
                      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                    >
                      <ZCard style={styles.taskCard} elevation="xs" radius={radii.lg}>
                        <View style={[styles.checkbox, task.is_completed && styles.checkboxDone]}>
                          {task.is_completed && <Ionicons name="checkmark" size={13} color={colors.textInverse} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <ZText
                            variant="bodySmall"
                            color={task.is_completed ? colors.textTertiary : colors.textPrimary}
                            style={task.is_completed ? styles.strikethrough : undefined}
                          >
                            {task.title}
                          </ZText>
                        </View>
                        <ZBadge
                          label={task.priority}
                          color={task.is_completed ? colors.sage : colors.textTertiary}
                          backgroundColor={task.is_completed ? colors.sageSubtle : colors.backgroundMuted}
                        />
                      </ZCard>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── VIEW: MONTH MILESTONES & IMPORTANT DATES ───────────────────── */}
          {filterView === 'milestones' && (
            <View style={styles.milestonesContainer}>
              <View style={styles.agendaHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ZText variant="headingSmall" color={colors.textPrimary}>
                    Milestones in {MONTHS[currentMonth]}
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>
                    Birthdays, anniversaries, exams & milestones
                  </ZText>
                </View>
                <Pressable
                  onPress={() => openAddEventModal()}
                  style={styles.addEventInlineBtn}
                  hitSlop={8}
                >
                  <Ionicons name="gift-outline" size={16} color={colors.primary} />
                  <ZText variant="label" color={colors.primary} style={{ fontSize: 13 }}>
                    Add Milestone
                  </ZText>
                </Pressable>
              </View>

              {monthImportantDates.length > 0 ? (
                monthImportantDates.map((evt) => {
                  const cfg = EVENT_CATEGORY_CONFIG[evt.event_type] || EVENT_CATEGORY_CONFIG.milestone;
                  const parsed = parseISODate(evt.event_date);
                  return (
                    <Pressable
                      key={evt.id}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedDay(parsed.day);
                        setSelectedDate(evt.event_date);
                        setFilterView('agenda');
                      }}
                    >
                      <ZCard elevation="xs" style={styles.milestoneCard} radius={radii.xl}>
                        <View style={[styles.milestoneIconWrap, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ZText variant="label" color={colors.textPrimary} style={{ fontWeight: '700' }}>
                              {evt.title}
                            </ZText>
                            <ZBadge
                              label={cfg.label}
                              color={cfg.color}
                              backgroundColor={cfg.bg}
                            />
                          </View>
                          {evt.description && (
                            <ZText variant="caption" color={colors.textSecondary}>
                              {evt.description}
                            </ZText>
                          )}
                          <ZText variant="caption" color={colors.textTertiary}>
                            📅 {formatPrettyDate(parsed.year, parsed.month, parsed.day)}
                            {evt.event_time ? ` at ${evt.event_time}` : ''}
                          </ZText>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                      </ZCard>
                    </Pressable>
                  );
                })
              ) : (
                <ZCard elevation="xs" style={styles.emptyCard} radius={radii.xl}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
                  </View>
                  <ZText variant="headingSmall" color={colors.textPrimary} align="center">
                    No milestones in {MONTHS[currentMonth]}
                  </ZText>
                  <ZText variant="bodySmall" color={colors.textSecondary} align="center">
                    Keep track of loved ones' birthdays, school exams, or personal celebrations.
                  </ZText>
                  <ZButton
                    label="Add Important Date"
                    variant="primary"
                    size="sm"
                    onPress={() => openAddEventModal()}
                    style={{ marginTop: spacing[2] }}
                  />
                </ZCard>
              )}
            </View>
          )}

          <View style={{ height: spacing[12] }} />
        </View>
      </ScrollView>

      {/* ── ADD / EDIT EVENT MODAL ────────────────────────────────────────── */}
      <Modal
        visible={isFormModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !isSaving && setIsFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <ZText variant="headingMedium" color={colors.textBrand}>
                  {editingEvent ? 'Edit Event' : 'Schedule Event'}
                </ZText>
                <ZText variant="caption" color={colors.textSecondary}>
                  {editingEvent ? 'Update details and notifications' : 'Add to your calendar and agenda'}
                </ZText>
              </View>
              <Pressable
                onPress={() => !isSaving && setIsFormModalVisible(false)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[4] }}
              showsVerticalScrollIndicator={false}
            >
              {/* Validation Error banner */}
              {formError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <ZText variant="caption" color={colors.error} style={{ flex: 1, fontWeight: '600' }}>
                    {formError}
                  </ZText>
                </View>
              )}

              {/* Title Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Event Title *
                </ZText>
                <TextInput
                  value={formTitle}
                  onChangeText={(text) => {
                    setFormTitle(text);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Birthday Dinner, Final Exam, Spa Day"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.textInput}
                />
              </View>

              {/* Category Picker */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Category
                </ZText>
                <View style={styles.categoryChipsGrid}>
                  {(Object.keys(EVENT_CATEGORY_CONFIG) as CalendarEventType[]).map((catKey) => {
                    const cfg = EVENT_CATEGORY_CONFIG[catKey];
                    const isSelected = formCategory === catKey;
                    return (
                      <Pressable
                        key={catKey}
                        onPress={() => {
                          triggerHaptic();
                          setFormCategory(catKey);
                        }}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isSelected ? cfg.color : cfg.bg,
                            borderColor: cfg.borderColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name={cfg.icon as any}
                          size={14}
                          color={isSelected ? colors.textInverse : cfg.color}
                          style={{ marginRight: 4 }}
                        />
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.textInverse : cfg.color}
                          style={{ fontWeight: isSelected ? '700' : '600', fontSize: 12 }}
                        >
                          {cfg.label}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date Input */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Date (YYYY-MM-DD) *
                </ZText>
                <View style={styles.dateInputRow}>
                  <TextInput
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.textInput, { flex: 1 }]}
                  />
                  <Pressable
                    onPress={() => setFormDate(todayISOString)}
                    style={styles.dateHelperBtn}
                  >
                    <ZText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                      Today
                    </ZText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const tmrw = new Date(Date.now() + 86400000);
                      setFormDate(toISODateString(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate()));
                    }}
                    style={styles.dateHelperBtn}
                  >
                    <ZText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                      Tomorrow
                    </ZText>
                  </Pressable>
                </View>
              </View>

              {/* Time Selector */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Time
                </ZText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeChipsRow}>
                  {TIME_PRESETS.map((t) => {
                    const isSelected = formTime === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => {
                          triggerHaptic();
                          setFormTime(t);
                        }}
                        style={[styles.timeChip, isSelected && styles.timeChipActive]}
                      >
                        <ZText
                          variant="caption"
                          color={isSelected ? colors.textInverse : colors.textSecondary}
                          style={{ fontWeight: isSelected ? '700' : '500' }}
                        >
                          {t}
                        </ZText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Reminder Section */}
              <View style={styles.reminderCard}>
                <View style={styles.reminderToggleRow}>
                  <View style={{ flex: 1 }}>
                    <ZText variant="label" color={colors.textPrimary}>
                      In-App Reminder
                    </ZText>
                    <ZText variant="caption" color={colors.textSecondary}>
                      Notify me before this event occurs
                    </ZText>
                  </View>
                  <Switch
                    value={formHasReminder}
                    onValueChange={(val) => {
                      triggerHaptic();
                      setFormHasReminder(val);
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>

                {formHasReminder && (
                  <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                    <ZText variant="caption" color={colors.textTertiary}>
                      When should we remind you?
                    </ZText>
                    <View style={styles.reminderPillsGrid}>
                      {REMINDER_PRESETS.map((preset) => {
                        const isSelected = formReminderTime === preset.value;
                        return (
                          <Pressable
                            key={preset.value}
                            onPress={() => {
                              triggerHaptic();
                              setFormReminderTime(preset.value);
                            }}
                            style={[
                              styles.reminderPill,
                              isSelected && styles.reminderPillActive,
                            ]}
                          >
                            <ZText
                              variant="caption"
                              color={isSelected ? colors.textInverse : colors.textSecondary}
                              style={{ fontWeight: isSelected ? '700' : '500', fontSize: 11.5 }}
                            >
                              {preset.label}
                            </ZText>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.reminderNoticeBox}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                      <ZText variant="caption" color={colors.textSecondary} style={{ flex: 1, fontSize: 11 }}>
                        Stored as an in-app reminder in Zeona. System push notifications trigger once device permissions are active.
                      </ZText>
                    </View>
                  </View>
                )}
              </View>

              {/* Description / Notes */}
              <View style={styles.formGroup}>
                <ZText variant="label" color={colors.textPrimary}>
                  Notes / Details (Optional)
                </ZText>
                <TextInput
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Add location, gift ideas, or study chapters..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, styles.textArea]}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalBtnRow}>
              <ZButton
                label="Cancel"
                variant="ghost"
                size="md"
                onPress={() => !isSaving && setIsFormModalVisible(false)}
                disabled={isSaving}
                style={{ flex: 1 }}
              />
              <ZButton
                label={editingEvent ? 'Update Event' : 'Save Event'}
                variant="primary"
                size="md"
                isLoading={isSaving}
                onPress={handleSaveEvent}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 420 }]}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={28} color={colors.error} />
            </View>

            <ZText variant="headingMedium" color={colors.textPrimary} align="center">
              Delete Event?
            </ZText>
            <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={{ marginTop: 4 }}>
              Are you sure you want to remove "{eventToDelete?.title}"? This event will be removed from your calendar.
            </ZText>

            <View style={[styles.modalBtnRow, { marginTop: spacing[4] }]}>
              <ZButton
                label="Keep Event"
                variant="secondary"
                size="md"
                onPress={() => setIsDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <ZButton
                label="Delete"
                variant="danger"
                size="md"
                onPress={handleConfirmDelete}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing[4],
  },

  /* Header */
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  todayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    ...shadows.xs,
  },

  /* Calendar Card */
  calCard: {
    padding: spacing[4],
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  dayHeader: {
    flex: 1,
    paddingVertical: spacing[1],
    fontWeight: '700',
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  dayNumWrapper: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumSelected: {
    backgroundColor: colors.primary,
    ...shadows.xs,
  },
  dayNumToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  indicatorsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  /* Filter Chips */
  filterRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },

  /* Agenda Section */
  agendaContainer: {
    gap: spacing[3],
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  addEventInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
  },

  /* Event Cards */
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3.5],
    overflow: 'hidden',
  },
  eventAccentBar: {
    width: 4,
    height: '100%',
    borderRadius: radii.full,
    minHeight: 56,
    marginRight: spacing[3],
  },
  eventContent: {
    flex: 1,
    gap: 3,
  },
  eventBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.md,
    marginTop: 4,
  },
  eventActionsCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing[2],
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },

  /* Empty Card */
  emptyCard: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },

  /* Tasks on agenda */
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },

  /* Milestones Section */
  milestonesContainer: {
    gap: spacing[3],
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3.5],
  },
  milestoneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 20, 37, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: spacing[2.5],
    borderRadius: radii.lg,
  },
  formGroup: {
    gap: spacing[1.5],
  },
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3.5],
    fontSize: 15,
    fontFamily: fontFamilies.sans,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  textArea: {
    height: 80,
    paddingTop: spacing[2.5],
    textAlignVertical: 'top',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dateHelperBtn: {
    paddingHorizontal: spacing[3],
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  timeChipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reminderCard: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing[3.5],
  },
  reminderToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  reminderPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reminderNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    padding: spacing[2],
    borderRadius: radii.md,
    marginTop: spacing[1],
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
});
