/**
 * Zeona — Habit Store (Zustand + Supabase + AsyncStorage)
 *
 * Full-lifecycle management for everyday wellness habits:
 * - Reactive state for active and archived habits
 * - Real completion records (HabitLog) with duplicate-submission protection
 * - Local calendar date calculation engine
 * - Persistence to Supabase ('habits' and 'habit_logs') with offline AsyncStorage fallback
 * - Unified streak and weekly consistency statistics
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Habit, HabitLog, HabitFrequency } from '@/types';
import {
  toLocalDateString,
  getCurrentWeekDays,
  calculateCurrentStreak,
  calculateBestStreak,
  calculateWeeklyRate,
  getEncouragingMessage,
} from '@/utils/habitCalculations';

const HABITS_STORAGE_KEY = 'zeona_habits_v2';
const HABIT_LOGS_STORAGE_KEY = 'zeona_habit_logs_v2';

// ─── Preset Seed Data ─────────────────────────────────────────────────────────

function generateInitialSeedLogs(todayDateStr: string): HabitLog[] {
  const logs: HabitLog[] = [];
  const [y, m, d] = todayDateStr.split('-').map(Number);
  const now = new Date(y, (m || 1) - 1, d || 1);

  // Generate 7 consecutive days for habit-1 (Water)
  for (let i = 0; i < 7; i++) {
    const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    logs.push({
      id: `log-seed-1-${i}`,
      habit_id: 'habit-1',
      user_id: 'local-user',
      logged_date: toLocalDateString(past),
      created_at: past.toISOString(),
    });
  }

  // Generate 12 consecutive days for habit-2 (Journaling)
  for (let i = 0; i < 12; i++) {
    const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    logs.push({
      id: `log-seed-2-${i}`,
      habit_id: 'habit-2',
      user_id: 'local-user',
      logged_date: toLocalDateString(past),
      created_at: past.toISOString(),
    });
  }

  // Generate 5 days for habit-3 (Movement)
  for (let i = 0; i < 5; i++) {
    const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    logs.push({
      id: `log-seed-3-${i}`,
      habit_id: 'habit-3',
      user_id: 'local-user',
      logged_date: toLocalDateString(past),
      created_at: past.toISOString(),
    });
  }

  return logs;
}

const SEED_HABITS: Habit[] = [
  {
    id: 'habit-1',
    user_id: 'local-user',
    title: 'Drink 2L water',
    description: 'Keep skin glowing and energy calm & clear',
    frequency: 'daily',
    color: '#0284c7',
    icon: 'water-outline',
    streak_count: 7,
    best_streak: 14,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'habit-2',
    user_id: 'local-user',
    title: 'Daily Journaling',
    description: 'Reflect with gratitude before sleeping',
    frequency: 'daily',
    color: '#8b5cf6',
    icon: 'book-outline',
    streak_count: 12,
    best_streak: 21,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 21).toISOString(),
  },
  {
    id: 'habit-3',
    user_id: 'local-user',
    title: 'Gentle Movement',
    description: 'Yoga, stretching, or evening walk under open skies',
    frequency: 'weekdays',
    color: '#10b981',
    icon: 'fitness-outline',
    streak_count: 5,
    best_streak: 10,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'habit-4',
    user_id: 'local-user',
    title: 'Evening Screen-Free Wind Down',
    description: 'Chamomile tea and gentle stillness',
    frequency: 'daily',
    color: '#f97316',
    icon: 'moon-outline',
    streak_count: 3,
    best_streak: 7,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  weeklyPercentage: number;
  isCompletedToday: boolean;
  message: string;
}

export interface OverallHabitStats {
  bestStreak: number;
  activeStreaksCount: number;
  averageWeeklyRate: number;
  totalCompletions: number;
  activeHabitsCount: number;
}

interface HabitStoreState {
  habits: Habit[];
  logs: HabitLog[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchHabits: () => Promise<void>;
  createHabit: (data: {
    title: string;
    description?: string;
    frequency?: HabitFrequency;
    target_days?: number[];
    color?: string;
    icon?: string;
  }) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<Habit | null>;
  archiveHabit: (id: string) => Promise<void>;
  unarchiveHabit: (id: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitDate: (habitId: string, dateStr: string) => Promise<boolean>;

  // Computed queries
  isHabitCompletedOnDate: (habitId: string, dateStr: string) => boolean;
  getHabitStats: (habitId: string) => HabitStats;
  getOverallStats: () => OverallHabitStats;
  getLogsForHabit: (habitId: string) => Set<string>;
}

export const useHabitStore = create<HabitStoreState>((set, get) => ({
  habits: SEED_HABITS,
  logs: generateInitialSeedLogs(toLocalDateString()),
  isLoading: false,
  error: null,

  initialize: async () => {
    await get().fetchHabits();
  },

  fetchHabits: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const habitsKey = user ? `${HABITS_STORAGE_KEY}_${user.id}` : HABITS_STORAGE_KEY;
    const logsKey = user ? `${HABIT_LOGS_STORAGE_KEY}_${user.id}` : HABIT_LOGS_STORAGE_KEY;

    // 1. Try Supabase if authenticated
    if (supabase && user) {
      try {
        const [habitsRes, logsRes] = await Promise.all([
          supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('habit_logs').select('*').eq('user_id', user.id),
        ]);

        if (!habitsRes.error && habitsRes.data && habitsRes.data.length > 0) {
          const loadedHabits: Habit[] = habitsRes.data;
          const loadedLogs: HabitLog[] = (!logsRes.error && logsRes.data) ? logsRes.data : [];

          set({ habits: loadedHabits, logs: loadedLogs, isLoading: false });
          AsyncStorage.setItem(habitsKey, JSON.stringify(loadedHabits)).catch(() => {});
          AsyncStorage.setItem(logsKey, JSON.stringify(loadedLogs)).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[Zeona Habits] Supabase query notice:', err);
      }
    }

    // 2. Fallback to AsyncStorage
    try {
      const [savedHabitsJson, savedLogsJson] = await Promise.all([
        AsyncStorage.getItem(habitsKey),
        AsyncStorage.getItem(logsKey),
      ]);

      const habits = savedHabitsJson ? JSON.parse(savedHabitsJson) : SEED_HABITS;
      const logs = savedLogsJson ? JSON.parse(savedLogsJson) : generateInitialSeedLogs(toLocalDateString());

      set({ habits, logs, isLoading: false });
    } catch {
      set({ habits: SEED_HABITS, logs: generateInitialSeedLogs(toLocalDateString()), isLoading: false });
    }
  },

  createHabit: async (data) => {
    const user = useAuthStore.getState().user;
    const habitsKey = user ? `${HABITS_STORAGE_KEY}_${user.id}` : HABITS_STORAGE_KEY;

    const newHabit: Habit = {
      id: `habit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user?.id || 'local-user',
      title: data.title.trim(),
      description: data.description?.trim() || null,
      frequency: data.frequency || 'daily',
      target_days: data.target_days || undefined,
      color: data.color || '#8b5cf6',
      icon: data.icon || 'sparkles-outline',
      streak_count: 0,
      best_streak: 0,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextHabits = [newHabit, ...get().habits];
    set({ habits: nextHabits });
    AsyncStorage.setItem(habitsKey, JSON.stringify(nextHabits)).catch(() => {});

    if (supabase && user) {
      try {
        await supabase.from('habits').insert([newHabit]);
      } catch (err) {
        console.warn('[Zeona Habits] Supabase create notice:', err);
      }
    }

    return newHabit;
  },

  updateHabit: async (id, updates) => {
    const user = useAuthStore.getState().user;
    const habitsKey = user ? `${HABITS_STORAGE_KEY}_${user.id}` : HABITS_STORAGE_KEY;

    let updated: Habit | null = null;
    const nextHabits = get().habits.map((h) => {
      if (h.id === id) {
        updated = {
          ...h,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updated;
      }
      return h;
    });

    if (updated) {
      set({ habits: nextHabits });
      AsyncStorage.setItem(habitsKey, JSON.stringify(nextHabits)).catch(() => {});

      if (supabase && user) {
        try {
          await supabase.from('habits').update(updates).eq('id', id).eq('user_id', user.id);
        } catch (err) {
          console.warn('[Zeona Habits] Supabase update notice:', err);
        }
      }
    }

    return updated;
  },

  archiveHabit: async (id) => {
    await get().updateHabit(id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
    });
  },

  unarchiveHabit: async (id) => {
    await get().updateHabit(id, {
      is_archived: false,
      archived_at: null,
    });
  },

  deleteHabit: async (id) => {
    const user = useAuthStore.getState().user;
    const habitsKey = user ? `${HABITS_STORAGE_KEY}_${user.id}` : HABITS_STORAGE_KEY;
    const logsKey = user ? `${HABIT_LOGS_STORAGE_KEY}_${user.id}` : HABIT_LOGS_STORAGE_KEY;

    const nextHabits = get().habits.filter((h) => h.id !== id);
    const nextLogs = get().logs.filter((l) => l.habit_id !== id);

    set({ habits: nextHabits, logs: nextLogs });
    AsyncStorage.setItem(habitsKey, JSON.stringify(nextHabits)).catch(() => {});
    AsyncStorage.setItem(logsKey, JSON.stringify(nextLogs)).catch(() => {});

    if (supabase && user) {
      try {
        await Promise.all([
          supabase.from('habits').delete().eq('id', id).eq('user_id', user.id),
          supabase.from('habit_logs').delete().eq('habit_id', id).eq('user_id', user.id),
        ]);
      } catch (err) {
        console.warn('[Zeona Habits] Supabase delete notice:', err);
      }
    }
  },

  toggleHabitDate: async (habitId, dateStr) => {
    const user = useAuthStore.getState().user;
    const logsKey = user ? `${HABIT_LOGS_STORAGE_KEY}_${user.id}` : HABIT_LOGS_STORAGE_KEY;
    const habitsKey = user ? `${HABITS_STORAGE_KEY}_${user.id}` : HABITS_STORAGE_KEY;

    const existingLog = get().logs.find(
      (l) => l.habit_id === habitId && l.logged_date === dateStr
    );

    let nextLogs: HabitLog[];
    let isCompletedNow: boolean;

    if (existingLog) {
      // Undo completion
      nextLogs = get().logs.filter((l) => l.id !== existingLog.id);
      isCompletedNow = false;

      if (supabase && user) {
        try {
          await supabase.from('habit_logs').delete().eq('id', existingLog.id);
        } catch (err) {
          console.warn('[Zeona Habits] Supabase undo notice:', err);
        }
      }
    } else {
      // Complete habit — prevent duplicate
      const newLog: HabitLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        habit_id: habitId,
        user_id: user?.id || 'local-user',
        logged_date: dateStr,
        created_at: new Date().toISOString(),
      };
      nextLogs = [...get().logs, newLog];
      isCompletedNow = true;

      if (supabase && user) {
        try {
          await supabase.from('habit_logs').insert([newLog]);
        } catch (err) {
          console.warn('[Zeona Habits] Supabase log notice:', err);
        }
      }
    }

    // Recompute streak for the habit
    const habit = get().habits.find((h) => h.id === habitId);
    let nextHabits = get().habits;
    if (habit) {
      const datesSet = new Set(
        nextLogs.filter((l) => l.habit_id === habitId).map((l) => l.logged_date)
      );
      const currentStreak = calculateCurrentStreak(habit, datesSet);
      const bestStreak = calculateBestStreak(habit, datesSet);

      nextHabits = get().habits.map((h) =>
        h.id === habitId
          ? { ...h, streak_count: currentStreak, best_streak: bestStreak }
          : h
      );
      AsyncStorage.setItem(habitsKey, JSON.stringify(nextHabits)).catch(() => {});
    }

    set({ logs: nextLogs, habits: nextHabits });
    AsyncStorage.setItem(logsKey, JSON.stringify(nextLogs)).catch(() => {});

    return isCompletedNow;
  },

  isHabitCompletedOnDate: (habitId, dateStr) => {
    return get().logs.some(
      (l) => l.habit_id === habitId && l.logged_date === dateStr
    );
  },

  getLogsForHabit: (habitId) => {
    const dates = new Set<string>();
    for (const l of get().logs) {
      if (l.habit_id === habitId) {
        dates.add(l.logged_date);
      }
    }
    return dates;
  },

  getHabitStats: (habitId) => {
    const habit = get().habits.find((h) => h.id === habitId);
    if (!habit) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        weeklyPercentage: 0,
        isCompletedToday: false,
        message: 'A fresh, gentle start today 🌱',
      };
    }

    const todayStr = toLocalDateString();
    const datesSet = get().getLogsForHabit(habitId);
    const isCompletedToday = datesSet.has(todayStr);

    const currentStreak = calculateCurrentStreak(habit, datesSet);
    const bestStreak = calculateBestStreak(habit, datesSet);

    const weekDays = getCurrentWeekDays();
    const weekDateStrings = weekDays.map((d) => d.dateStr);
    const weeklyPercentage = calculateWeeklyRate(habit, datesSet, weekDateStrings);

    const message = getEncouragingMessage(currentStreak, isCompletedToday);

    return {
      currentStreak,
      bestStreak,
      weeklyPercentage,
      isCompletedToday,
      message,
    };
  },

  getOverallStats: () => {
    const activeHabits = get().habits.filter((h) => !h.is_archived);
    const todayStr = toLocalDateString();
    const weekDays = getCurrentWeekDays();
    const weekDateStrings = weekDays.map((d) => d.dateStr);

    let maxBestStreak = 0;
    let activeStreaksCount = 0;
    let totalWeeklyRate = 0;

    for (const h of activeHabits) {
      const datesSet = get().getLogsForHabit(h.id);
      const current = calculateCurrentStreak(h, datesSet);
      const best = calculateBestStreak(h, datesSet);

      if (best > maxBestStreak) maxBestStreak = best;
      if (current > 0) activeStreaksCount += 1;

      const rate = calculateWeeklyRate(h, datesSet, weekDateStrings);
      totalWeeklyRate += rate;
    }

    const averageWeeklyRate =
      activeHabits.length > 0 ? Math.round(totalWeeklyRate / activeHabits.length) : 0;

    return {
      bestStreak: maxBestStreak,
      activeStreaksCount,
      averageWeeklyRate,
      totalCompletions: get().logs.length,
      activeHabitsCount: activeHabits.length,
    };
  },
}));
