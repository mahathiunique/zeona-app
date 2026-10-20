/**
 * Zeona — Habit Streak & Statistics Engine
 *
 * Calculates streaks, weekly consistency, and encouraging progress notes
 * strictly from actual local calendar completion records (YYYY-MM-DD),
 * accurately handling daily, weekday, weekend, and custom frequency schedules
 * without time zone drift or guilt-inducing messages.
 */

import type { Habit } from '@/types';

/**
 * Returns YYYY-MM-DD from a local Date object.
 */
export function toLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object.
 */
export function parseLocalDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Returns Sunday-indexed day of week (0 = Sun, 1 = Mon, ..., 6 = Sat) for a local date string.
 */
export function getDayOfWeekFromDateString(dateStr: string): number {
  const d = parseLocalDateString(dateStr);
  return d.getDay();
}

/**
 * Checks if a habit is scheduled for a specific calendar date.
 */
export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  const dayOfWeek = getDayOfWeekFromDateString(dateStr);

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      // Default to Sunday (0) or first target day
      return habit.target_days && habit.target_days.length > 0
        ? habit.target_days.includes(dayOfWeek)
        : dayOfWeek === 0;
    case 'custom':
      if (habit.target_days && habit.target_days.length > 0) {
        return habit.target_days.includes(dayOfWeek);
      }
      return true;
    default:
      return true;
  }
}

/**
 * Returns the current calendar week (Monday to Sunday) surrounding anchorDate.
 */
export function getCurrentWeekDays(anchorDate: Date = new Date()): {
  dateStr: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
}[] {
  const todayStr = toLocalDateString(anchorDate);
  const currentDay = anchorDate.getDay(); // 0 is Sun, 1 is Mon...
  // Determine Monday of current week:
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + diffToMonday);

  const days: { dateStr: string; dayLabel: string; dayNumber: number; isToday: boolean }[] = [];
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = toLocalDateString(d);
    days.push({
      dateStr,
      dayLabel: DAY_LABELS[i],
      dayNumber: d.getDate(),
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

/**
 * Calculates the current active streak for a habit from actual completion records.
 */
export function calculateCurrentStreak(
  habit: Habit,
  loggedDates: Set<string>,
  today: Date = new Date()
): number {
  const todayStr = toLocalDateString(today);
  let streak = 0;

  const isTodayScheduled = isHabitScheduledForDate(habit, todayStr);
  const isTodayLogged = loggedDates.has(todayStr);

  let checkDate = new Date(today);

  if (isTodayScheduled) {
    if (isTodayLogged) {
      streak += 1;
      // Step to yesterday
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
    } else {
      // Today is not logged yet. Check if streak is still alive from yesterday!
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
    }
  } else {
    // Today was not scheduled. Start inspecting from yesterday.
    checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
  }

  // Walk backwards up to 365 days
  for (let step = 0; step < 365; step++) {
    const dateStr = toLocalDateString(checkDate);
    const isScheduled = isHabitScheduledForDate(habit, dateStr);

    if (isScheduled) {
      if (loggedDates.has(dateStr)) {
        streak += 1;
      } else {
        // Scheduled day was missed; streak breaks here!
        break;
      }
    }
    // If not scheduled (e.g. weekend on weekday habit), skip without breaking streak

    // Step back one day
    checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
  }

  return streak;
}

/**
 * Calculates the all-time best streak for a habit.
 */
export function calculateBestStreak(
  habit: Habit,
  loggedDates: Set<string>,
  today: Date = new Date()
): number {
  const current = calculateCurrentStreak(habit, loggedDates, today);
  if (loggedDates.size === 0) return 0;

  // Convert all logged dates to sorted array
  const sortedDates = Array.from(loggedDates).sort();
  if (sortedDates.length === 0) return 0;

  const earliest = parseLocalDateString(sortedDates[0]);
  let maxStreak = 0;
  let runningStreak = 0;

  let cursor = new Date(earliest);
  const end = new Date(today);

  while (cursor <= end) {
    const dateStr = toLocalDateString(cursor);
    const isScheduled = isHabitScheduledForDate(habit, dateStr);

    if (isScheduled) {
      if (loggedDates.has(dateStr)) {
        runningStreak += 1;
        if (runningStreak > maxStreak) {
          maxStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }

    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  return Math.max(maxStreak, current, habit.best_streak || 0);
}

/**
 * Calculates the weekly completion percentage for a 7-day window.
 */
export function calculateWeeklyRate(
  habit: Habit,
  loggedDates: Set<string>,
  weekDateStrings: string[]
): number {
  const scheduled = weekDateStrings.filter((d) => isHabitScheduledForDate(habit, d));
  if (scheduled.length === 0) return 0;

  const completed = scheduled.filter((d) => loggedDates.has(d));
  return Math.round((completed.length / scheduled.length) * 100);
}

/**
 * Returns a gentle, encouraging message tailored to the habit's current streak.
 * Adheres strictly to Zeona's supportive, non-guilt tone.
 */
export function getEncouragingMessage(
  currentStreak: number,
  isCompletedToday: boolean
): string {
  if (isCompletedToday) {
    if (currentStreak >= 10) return 'Incredible dedication and mindful consistency 💜';
    if (currentStreak >= 5) return 'Wonderful flow! Nurturing yourself each day 🌸';
    if (currentStreak >= 2) return 'A beautiful rhythm in motion ✨';
    return 'Completed today! Every step counts 🌱';
  }

  // Not completed today yet
  if (currentStreak >= 7) return 'Your streak is alive! A gentle check-in awaits 🔥';
  if (currentStreak >= 3) return 'Keep your lovely momentum going today ✨';
  if (currentStreak === 1) return 'One step taken yesterday — ready when you are 🌿';
  return 'A fresh, gentle start today 🌱 Progress over perfection.';
}
