/**
 * Zeona — Mood Store (Zustand + Supabase + AsyncStorage)
 *
 * Mindful emotional check-ins:
 * - 5 core accessible moods: happy, calm, neutral, anxious, sad
 * - Context tags, optional reflection note, and calendar date
 * - User-scoped persistence to Supabase 'mood_entries' with local AsyncStorage fallback
 * - Full CRUD: create, edit, delete, and view mood history
 * - Immediate sync with Home dashboard and Journal store
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useJournalStore } from '@/store/journalStore';
import type { CoreMood, MoodEntry, InsightPeriod, MoodPeriodStats, MoodDistributionItem } from '@/types';

const MOOD_STORAGE_KEY = 'zeona_mood_entries_v1';

// ── Helper: Local YYYY-MM-DD ──────────────────────────────────────────────────
export function getLocalTodayDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface PeriodRange {
  currentStart: string; // YYYY-MM-DD
  currentEnd: string;   // YYYY-MM-DD
  previousStart: string; // YYYY-MM-DD
  previousEnd: string;   // YYYY-MM-DD
  label: string;
  daysCount: number;
}

export function getPeriodDateRanges(period: InsightPeriod, anchorDate: Date = new Date()): PeriodRange {
  const currentEnd = new Date(anchorDate);
  const currentStart = new Date(anchorDate);
  const prevEnd = new Date(anchorDate);
  const prevStart = new Date(anchorDate);

  if (period === 'week') {
    // Current 7 days (including today)
    currentStart.setDate(currentEnd.getDate() - 6);
    // Prior 7 days
    prevEnd.setDate(currentStart.getDate() - 1);
    prevStart.setDate(prevEnd.getDate() - 6);
    return {
      currentStart: getLocalTodayDateString(currentStart),
      currentEnd: getLocalTodayDateString(currentEnd),
      previousStart: getLocalTodayDateString(prevStart),
      previousEnd: getLocalTodayDateString(prevEnd),
      label: 'Past 7 Days',
      daysCount: 7,
    };
  }

  if (period === 'month') {
    // Current 30 days
    currentStart.setDate(currentEnd.getDate() - 29);
    // Prior 30 days
    prevEnd.setDate(currentStart.getDate() - 1);
    prevStart.setDate(prevEnd.getDate() - 29);
    return {
      currentStart: getLocalTodayDateString(currentStart),
      currentEnd: getLocalTodayDateString(currentEnd),
      previousStart: getLocalTodayDateString(prevStart),
      previousEnd: getLocalTodayDateString(prevEnd),
      label: 'Past 30 Days',
      daysCount: 30,
    };
  }

  // period === 'year' (past 365 days)
  currentStart.setDate(currentEnd.getDate() - 364);
  prevEnd.setDate(currentStart.getDate() - 1);
  prevStart.setDate(prevEnd.getDate() - 364);
  return {
    currentStart: getLocalTodayDateString(currentStart),
    currentEnd: getLocalTodayDateString(currentEnd),
    previousStart: getLocalTodayDateString(prevStart),
    previousEnd: getLocalTodayDateString(prevEnd),
    label: 'Past 12 Months',
    daysCount: 365,
  };
}

export function formatDateRange(startDateStr: string, endDateStr: string): string {
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

  if (sY === eY) {
    if (startMonth === endMonth) {
      return `${startMonth} ${sD} – ${eD}, ${sY}`;
    }
    return `${startMonth} ${sD} – ${endMonth} ${eD}, ${sY}`;
  }
  return `${startMonth} ${sD}, ${sY} – ${endMonth} ${eD}, ${eY}`;
}

export function calculatePeriodStats(
  currentEntries: MoodEntry[],
  previousEntries: MoodEntry[],
  period: InsightPeriod,
  range: PeriodRange
): MoodPeriodStats {
  const distribution: Record<CoreMood, MoodDistributionItem> = {
    happy: { mood: 'happy', count: 0, percentage: 0, label: 'Happy' },
    calm: { mood: 'calm', count: 0, percentage: 0, label: 'Calm' },
    neutral: { mood: 'neutral', count: 0, percentage: 0, label: 'Neutral' },
    anxious: { mood: 'anxious', count: 0, percentage: 0, label: 'Anxious' },
    sad: { mood: 'sad', count: 0, percentage: 0, label: 'Sad' },
  };

  const total = currentEntries.length;
  currentEntries.forEach((entry) => {
    if (distribution[entry.mood]) {
      distribution[entry.mood].count += 1;
    }
  });

  let dominantMood: CoreMood | null = null;
  let maxCount = 0;

  (Object.keys(distribution) as CoreMood[]).forEach((m) => {
    const count = distribution[m].count;
    distribution[m].percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    if (count > maxCount) {
      maxCount = count;
      dominantMood = m;
    }
  });

  const dominantPercentage =
    total > 0 && dominantMood ? (distribution[dominantMood as CoreMood]?.percentage ?? 0) : 0;

  // Distinct logged dates
  const distinctDates = new Set(currentEntries.map((e) => e.logged_date)).size;
  const checkInRatePercent = Math.min(100, Math.round((distinctDates / range.daysCount) * 100));

  // Top context tags
  const tagCounts: Record<string, number> = {};
  currentEntries.forEach((e) => {
    (e.tags || []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // Comparison with previous period
  const prevCount = previousEntries.length;
  const hasSufficientData = prevCount > 0;
  const deltaCount = total - prevCount;
  const percentChange = prevCount > 0 ? Math.round(((total - prevCount) / prevCount) * 100) : null;

  let textSummary = '';
  if (!hasSufficientData) {
    textSummary = 'Insufficient history in the previous period to generate a comparison. Keep checking in to build your timeline.';
  } else if (deltaCount > 0) {
    const pctStr = percentChange !== null && percentChange > 0 ? ` (+${percentChange}%)` : '';
    textSummary = `You logged ${deltaCount} more ${deltaCount === 1 ? 'check-in' : 'check-ins'}${pctStr} compared to the previous ${period} (${prevCount} recorded).`;
  } else if (deltaCount < 0) {
    const pctStr = percentChange !== null ? ` (${percentChange}%)` : '';
    textSummary = `You logged ${Math.abs(deltaCount)} fewer ${Math.abs(deltaCount) === 1 ? 'check-in' : 'check-ins'}${pctStr} compared to the previous ${period} (${prevCount} recorded).`;
  } else {
    textSummary = `Consistent rhythm: check-in frequency matched the previous ${period} exactly (${total} check-ins).`;
  }

  return {
    period,
    startDate: range.currentStart,
    endDate: range.currentEnd,
    dateRangeFormatted: formatDateRange(range.currentStart, range.currentEnd),
    totalCheckIns: total,
    daysInPeriod: range.daysCount,
    checkInRatePercent,
    distribution,
    dominantMood,
    dominantPercentage,
    comparison: {
      hasSufficientData,
      previousCount: prevCount,
      currentCount: total,
      deltaCount,
      percentChange,
      textSummary,
    },
    topTags,
    entries: currentEntries,
  };
}

// ── Initial Seed Data (Rich historical context across 2 weeks) ───────────────
function generateSeedMoods(): MoodEntry[] {
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    return d;
  };

  return [
    {
      id: 'mood-seed-1',
      user_id: 'local-user',
      mood: 'calm',
      note: 'Took a slow stroll under the evening trees. The air was cool and crisp.',
      tags: ['Nature', 'Solitude', 'Rest'],
      logged_date: getLocalTodayDateString(daysAgo(1)),
      created_at: daysAgo(1).toISOString(),
      updated_at: daysAgo(1).toISOString(),
    },
    {
      id: 'mood-seed-2',
      user_id: 'local-user',
      mood: 'happy',
      note: 'Finished my quarterly reading goal and made warm chamomile tea.',
      tags: ['Creativity', 'Rest', 'Growth'],
      logged_date: getLocalTodayDateString(daysAgo(2)),
      created_at: daysAgo(2).toISOString(),
      updated_at: daysAgo(2).toISOString(),
    },
    {
      id: 'mood-seed-3',
      user_id: 'local-user',
      mood: 'neutral',
      note: 'A quiet, ordinary Tuesday. Just moving through tasks with steady breath.',
      tags: ['Work', 'Health'],
      logged_date: getLocalTodayDateString(daysAgo(3)),
      created_at: daysAgo(3).toISOString(),
      updated_at: daysAgo(3).toISOString(),
    },
    {
      id: 'mood-seed-4',
      user_id: 'local-user',
      mood: 'anxious',
      note: 'Felt a bit fluttery before the presentation, but grounded myself with gentle breathing.',
      tags: ['Work', 'Health'],
      logged_date: getLocalTodayDateString(daysAgo(5)),
      created_at: daysAgo(5).toISOString(),
      updated_at: daysAgo(5).toISOString(),
    },
    {
      id: 'mood-seed-5',
      user_id: 'local-user',
      mood: 'happy',
      note: 'Coffee morning with my dear friend. Laughed so much my cheeks hurt.',
      tags: ['Friends', 'Rest'],
      logged_date: getLocalTodayDateString(daysAgo(6)),
      created_at: daysAgo(6).toISOString(),
      updated_at: daysAgo(6).toISOString(),
    },
    {
      id: 'mood-seed-6',
      user_id: 'local-user',
      mood: 'calm',
      note: 'Peaceful Sunday journaling session by the sunny window.',
      tags: ['Creativity', 'Rest'],
      logged_date: getLocalTodayDateString(daysAgo(8)),
      created_at: daysAgo(8).toISOString(),
      updated_at: daysAgo(8).toISOString(),
    },
    {
      id: 'mood-seed-7',
      user_id: 'local-user',
      mood: 'sad',
      note: 'Missing home a little bit today. Wrapping myself in a warm blanket and resting.',
      tags: ['Family', 'Rest'],
      logged_date: getLocalTodayDateString(daysAgo(10)),
      created_at: daysAgo(10).toISOString(),
      updated_at: daysAgo(10).toISOString(),
    },
    {
      id: 'mood-seed-8',
      user_id: 'local-user',
      mood: 'calm',
      note: 'Gentle morning yoga and slow oats.',
      tags: ['Health', 'Nature'],
      logged_date: getLocalTodayDateString(daysAgo(12)),
      created_at: daysAgo(12).toISOString(),
      updated_at: daysAgo(12).toISOString(),
    },
  ];
}

interface MoodStoreState {
  entries: MoodEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchEntries: () => Promise<void>;
  saveCheckIn: (data: {
    mood: CoreMood;
    note?: string;
    tags?: string[];
    logged_date?: string;
  }) => Promise<MoodEntry>;
  updateEntry: (id: string, updates: Partial<MoodEntry>) => Promise<MoodEntry | null>;
  deleteEntry: (id: string) => Promise<void>;
  fetchEntriesForPeriod: (startDate: string, endDate: string) => Promise<MoodEntry[]>;

  // Queries
  getTodayMood: () => MoodEntry | null;
  getLatestMood: () => MoodEntry | null;
  getEntriesByMood: (mood?: CoreMood | 'all') => MoodEntry[];
}

export const useMoodStore = create<MoodStoreState>((set, get) => ({
  entries: generateSeedMoods(),
  isLoading: false,
  error: null,

  initialize: async () => {
    await get().fetchEntries();
  },

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MOOD_STORAGE_KEY}_${user.id}` : MOOD_STORAGE_KEY;

    // 1. Try Supabase if authenticated
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          set({ entries: data, isLoading: false });
          AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});

          // Sync today's mood to journal store if available
          const todayStr = getLocalTodayDateString();
          const todayEntry = data.find((e: MoodEntry) => e.logged_date === todayStr);
          if (todayEntry) {
            useJournalStore.getState().setTodayMood(todayEntry.mood);
          }
          return;
        }
      } catch (err) {
        console.warn('[Zeona Mood] Supabase query notice:', err);
      }
    }

    // 2. Fallback to AsyncStorage
    try {
      const localJson = await AsyncStorage.getItem(storageKey);
      if (localJson) {
        const parsed = JSON.parse(localJson);
        set({ entries: parsed, isLoading: false });

        const todayStr = getLocalTodayDateString();
        const todayEntry = parsed.find((e: MoodEntry) => e.logged_date === todayStr);
        if (todayEntry) {
          useJournalStore.getState().setTodayMood(todayEntry.mood);
        }
      } else {
        const seed = generateSeedMoods();
        set({ entries: seed, isLoading: false });
        AsyncStorage.setItem(storageKey, JSON.stringify(seed)).catch(() => {});
      }
    } catch {
      set({ entries: generateSeedMoods(), isLoading: false });
    }
  },

  saveCheckIn: async (data) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MOOD_STORAGE_KEY}_${user.id}` : MOOD_STORAGE_KEY;
    const todayStr = getLocalTodayDateString();
    const dateToUse = data.logged_date || todayStr;

    // Check if an entry for this date already exists
    const existingIndex = get().entries.findIndex((e) => e.logged_date === dateToUse);

    let nextEntries: MoodEntry[];
    let targetEntry: MoodEntry;

    if (existingIndex !== -1 && (!get().entries[existingIndex].note || (data.note && data.note.trim().length > 0))) {
      targetEntry = {
        ...get().entries[existingIndex],
        mood: data.mood,
        note: data.note?.trim() || get().entries[existingIndex].note || null,
        tags: data.tags && data.tags.length > 0 ? data.tags : get().entries[existingIndex].tags,
        updated_at: new Date().toISOString(),
      };
      nextEntries = [...get().entries];
      nextEntries[existingIndex] = targetEntry;

      if (supabase && user) {
        try {
          await supabase.from('mood_entries').update(targetEntry).eq('id', targetEntry.id);
        } catch (err) {
          console.warn('[Zeona Mood] Supabase update notice:', err);
        }
      }
    } else {
      targetEntry = {
        id: `mood-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: user?.id || 'local-user',
        mood: data.mood,
        note: data.note?.trim() || null,
        tags: data.tags || [],
        logged_date: dateToUse,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      nextEntries = [targetEntry, ...get().entries];

      if (supabase && user) {
        try {
          await supabase.from('mood_entries').insert([targetEntry]);
        } catch (err) {
          console.warn('[Zeona Mood] Supabase insert notice:', err);
        }
      }
    }

    set({ entries: nextEntries });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextEntries)).catch(() => {});

    // Sync with today's mood if date is today
    if (dateToUse === todayStr) {
      useJournalStore.getState().setTodayMood(data.mood);
    }

    return targetEntry;
  },

  updateEntry: async (id, updates) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MOOD_STORAGE_KEY}_${user.id}` : MOOD_STORAGE_KEY;

    let updated: MoodEntry | null = null;
    const nextEntries = get().entries.map((e) => {
      if (e.id === id) {
        updated = {
          ...e,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updated;
      }
      return e;
    });

    if (updated) {
      set({ entries: nextEntries });
      AsyncStorage.setItem(storageKey, JSON.stringify(nextEntries)).catch(() => {});

      // If updating today's entry mood, sync to journal store
      const todayStr = getLocalTodayDateString();
      if ((updated as MoodEntry).logged_date === todayStr && updates.mood) {
        useJournalStore.getState().setTodayMood(updates.mood);
      }

      if (supabase && user) {
        try {
          await supabase.from('mood_entries').update(updates).eq('id', id).eq('user_id', user.id);
        } catch (err) {
          console.warn('[Zeona Mood] Supabase update notice:', err);
        }
      }
    }

    return updated;
  },

  deleteEntry: async (id) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${MOOD_STORAGE_KEY}_${user.id}` : MOOD_STORAGE_KEY;

    const target = get().entries.find((e) => e.id === id);
    const nextEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: nextEntries });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextEntries)).catch(() => {});

    // If deleting today's entry, reset today's mood in journal store
    const todayStr = getLocalTodayDateString();
    if (target && target.logged_date === todayStr) {
      const remainingToday = nextEntries.find((e) => e.logged_date === todayStr);
      if (remainingToday) {
        useJournalStore.getState().setTodayMood(remainingToday.mood);
      }
    }

    if (supabase && user) {
      try {
        await supabase.from('mood_entries').delete().eq('id', id).eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Mood] Supabase delete notice:', err);
      }
    }
  },

  fetchEntriesForPeriod: async (startDate: string, endDate: string) => {
    const user = useAuthStore.getState().user;
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_date', startDate)
          .lte('logged_date', endDate)
          .order('logged_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as MoodEntry[];
        }
      } catch (err) {
        console.warn('[Zeona Mood] Supabase fetchEntriesForPeriod notice:', err);
      }
    }

    // Resilient fallback: filter local entries
    return get().entries.filter(
      (e) => e.logged_date >= startDate && e.logged_date <= endDate
    );
  },

  getTodayMood: () => {
    const todayStr = getLocalTodayDateString();
    const todayEntries = get().entries.filter((e) => e.logged_date === todayStr);
    if (todayEntries.length === 0) return null;
    const withNote = todayEntries.find((e) => e.note && e.note.trim().length > 0);
    return withNote || todayEntries[0];
  },

  getLatestMood: () => {
    if (get().entries.length === 0) return null;
    return get().entries[0];
  },

  getEntriesByMood: (mood = 'all') => {
    if (mood === 'all' || !mood) return get().entries;
    return get().entries.filter((e) => e.mood === mood);
  },
}));
