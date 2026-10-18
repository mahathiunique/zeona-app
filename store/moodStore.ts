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
import type { CoreMood, MoodEntry } from '@/types';

const MOOD_STORAGE_KEY = 'zeona_mood_entries_v1';

// ── Helper: Local YYYY-MM-DD ──────────────────────────────────────────────────
export function getLocalTodayDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Initial Seed Data (Gentle historical context) ─────────────────────────────
function generateSeedMoods(): MoodEntry[] {
  const today = new Date();

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // 2 days ago
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  // 3 days ago
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  return [
    {
      id: 'mood-seed-1',
      user_id: 'local-user',
      mood: 'calm',
      note: 'Took a slow stroll under the evening trees. The air was cool and crisp.',
      tags: ['Nature', 'Solitude', 'Rest'],
      logged_date: getLocalTodayDateString(yesterday),
      created_at: yesterday.toISOString(),
      updated_at: yesterday.toISOString(),
    },
    {
      id: 'mood-seed-2',
      user_id: 'local-user',
      mood: 'happy',
      note: 'Finished my quarterly reading goal and made warm chamomile tea.',
      tags: ['Creativity', 'Rest', 'Growth'],
      logged_date: getLocalTodayDateString(twoDaysAgo),
      created_at: twoDaysAgo.toISOString(),
      updated_at: twoDaysAgo.toISOString(),
    },
    {
      id: 'mood-seed-3',
      user_id: 'local-user',
      mood: 'neutral',
      note: 'A quiet, ordinary Tuesday. Just moving through tasks with steady breath.',
      tags: ['Work', 'Health'],
      logged_date: getLocalTodayDateString(threeDaysAgo),
      created_at: threeDaysAgo.toISOString(),
      updated_at: threeDaysAgo.toISOString(),
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
