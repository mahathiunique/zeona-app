/**
 * Zeona — Journal Store (Zustand + Supabase + AsyncStorage)
 * Manages user's real journal entries, draft auto-save, search, filter, and sorting.
 * Strictly adheres to real user data — never generates fake historical entries.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { generateUUID } from '@/utils/uuid';
import type { JournalEntry, JournalEntryType, MoodTag } from '@/types';

const DRAFT_STORAGE_KEY = 'zeona_journal_draft_v1';
const FAVORITES_STORAGE_KEY = 'zeona_journal_favorites_v1';

export interface JournalDraft {
  title: string;
  content: string;
  mood: MoodTag | null;
  tags?: string[];
  type: JournalEntryType;
  updatedAt: string | null;
}

const INITIAL_DRAFT: JournalDraft = {
  title: '',
  content: '',
  mood: 'calm',
  tags: [],
  type: 'text',
  updatedAt: null,
};

export type JournalFilter = 'All' | 'Text' | 'Voice' | 'Photos' | 'Favs';
export type JournalSort = 'newest' | 'oldest';

interface JournalState {
  entries: JournalEntry[];
  draft: JournalDraft;
  hasUnsavedDraft: boolean;
  searchQuery: string;
  activeFilter: JournalFilter;
  sortBy: JournalSort;
  favorites: Record<string, boolean>;
  todayMood: MoodTag | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchEntries: () => Promise<void>;
  setTodayMood: (mood: MoodTag) => void;
  updateDraft: (updates: Partial<JournalDraft>) => void;
  saveDraftToStorage: () => Promise<void>;
  discardDraft: () => Promise<void>;
  publishEntry: () => Promise<JournalEntry | null>;
  createEntry: (entryData: Partial<JournalEntry>) => Promise<JournalEntry | null>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<JournalEntry | null>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (filter: JournalFilter) => void;
  setSortBy: (sort: JournalSort) => void;
  clearError: () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  draft: INITIAL_DRAFT,
  hasUnsavedDraft: false,
  searchQuery: '',
  activeFilter: 'All',
  sortBy: 'newest',
  favorites: {},
  todayMood: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    // Restore today's mood
    try {
      const todayKey = `zeona_today_mood_${new Date().toISOString().split('T')[0]}`;
      const savedMood = await AsyncStorage.getItem(todayKey);
      if (savedMood) {
        set({ todayMood: savedMood as MoodTag });
      }

      // Restore favorites
      const savedFavs = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (savedFavs) {
        set({ favorites: JSON.parse(savedFavs) });
      }

      // Restore draft if any
      const savedDraftJson = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraftJson) {
        const parsed = JSON.parse(savedDraftJson) as JournalDraft;
        const hasContent = Boolean(parsed.title?.trim() || parsed.content?.trim());
        set({ draft: parsed, hasUnsavedDraft: hasContent });
      }
    } catch {
      // Graceful fallback
    }

    // Fetch entries
    await get().fetchEntries();
  },

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_entries_${user.id}` : 'zeona_guest_entries_v1';

    // 1. If Supabase is configured and user is signed in, query Supabase for authenticated user's entries
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[Zeona Journal] Supabase query notice:', error.message);
          // If remote table is not provisioned or offline, fallback to local user entries
          const localJson = await AsyncStorage.getItem(storageKey);
          const localEntries: JournalEntry[] = localJson ? JSON.parse(localJson) : [];
          set({ entries: localEntries, isLoading: false });
          return;
        }

        // Successfully fetched user's entries from Supabase (empty [] if new user)
        set({ entries: data || [], isLoading: false, error: null });

        // Cache locally for offline availability
        AsyncStorage.setItem(storageKey, JSON.stringify(data || [])).catch(() => {});
        return;
      } catch (err: any) {
        console.warn('[Zeona Journal] fetch error:', err);
        const localJson = await AsyncStorage.getItem(storageKey);
        const localEntries: JournalEntry[] = localJson ? JSON.parse(localJson) : [];
        set({ entries: localEntries, isLoading: false });
        return;
      }
    }

    // 2. Offline / Guest mode: Load from AsyncStorage only (starts clean and empty)
    try {
      const localJson = await AsyncStorage.getItem(storageKey);
      const localEntries: JournalEntry[] = localJson ? JSON.parse(localJson) : [];
      set({ entries: localEntries, isLoading: false, error: null });
    } catch {
      set({ entries: [], isLoading: false, error: 'Failed to load local journal entries.' });
    }
  },

  setTodayMood: (mood: MoodTag) => {
    set({ todayMood: mood });
    const todayKey = `zeona_today_mood_${new Date().toISOString().split('T')[0]}`;
    AsyncStorage.setItem(todayKey, mood).catch(() => {});
    get().updateDraft({ mood });
  },

  updateDraft: (updates: Partial<JournalDraft>) => {
    const nextDraft: JournalDraft = {
      ...get().draft,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const hasContent = Boolean(nextDraft.title.trim() || nextDraft.content.trim());
    set({ draft: nextDraft, hasUnsavedDraft: hasContent });
    AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft)).catch(() => {});
  },

  saveDraftToStorage: async () => {
    try {
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(get().draft));
    } catch {
      // Ignore
    }
  },

  discardDraft: async () => {
    set({ draft: INITIAL_DRAFT, hasUnsavedDraft: false });
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  },

  publishEntry: async () => {
    const { draft } = get();
    if (!draft.title.trim() && !draft.content.trim()) {
      return null;
    }

    return await get().createEntry({
      title: draft.title.trim() || 'Untitled Reflection',
      content: draft.content.trim(),
      type: draft.type,
      mood: draft.mood,
    });
  },

  createEntry: async (entryData: Partial<JournalEntry>) => {
    const user = useAuthStore.getState().user;
    const userId = user ? user.id : 'guest-user';
    const storageKey = user ? `zeona_entries_${user.id}` : 'zeona_guest_entries_v1';

    const newEntry: JournalEntry = {
      id: generateUUID(),
      user_id: userId,
      title: entryData.title?.trim() || 'Untitled Reflection',
      content: entryData.content?.trim() || '',
      type: entryData.type || 'text',
      mood: entryData.mood || 'calm',
      tags: entryData.tags || [],
      audio_url: entryData.audio_url || null,
      audio_duration: entryData.audio_duration,
      image_urls: entryData.image_urls || [],
      is_private: entryData.is_private ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If Supabase is connected and user is authenticated, sync to Supabase table
    if (supabase && user) {
      try {
        const { error } = await supabase.from('journal_entries').insert([newEntry]);
        if (error) {
          console.warn('[Zeona Journal] Supabase insert notice:', error.message);
        }
      } catch (err) {
        console.warn('[Zeona Journal] Supabase insert error:', err);
      }
    }

    const updatedEntries = [newEntry, ...get().entries];
    set({
      entries: updatedEntries,
      draft: INITIAL_DRAFT,
      hasUnsavedDraft: false,
    });

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedEntries));
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }

    return newEntry;
  },

  updateEntry: async (id: string, updates: Partial<JournalEntry>) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_entries_${user.id}` : 'zeona_guest_entries_v1';

    const updatedEntries = get().entries.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
      return e;
    });

    const updated = updatedEntries.find((e) => e.id === id) || null;
    set({ entries: updatedEntries });

    // Sync to Supabase
    if (supabase && user && updated) {
      try {
        await supabase
          .from('journal_entries')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Journal] Supabase update error:', err);
      }
    }

    AsyncStorage.setItem(storageKey, JSON.stringify(updatedEntries)).catch(() => {});
    return updated;
  },

  deleteEntry: async (id: string) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `zeona_entries_${user.id}` : 'zeona_guest_entries_v1';

    const updatedEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: updatedEntries });

    // Sync to Supabase
    if (supabase && user) {
      try {
        await supabase
          .from('journal_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Journal] Supabase delete error:', err);
      }
    }

    AsyncStorage.setItem(storageKey, JSON.stringify(updatedEntries)).catch(() => {});
  },

  toggleFavorite: (id: string) => {
    const current = get().favorites;
    const next = {
      ...current,
      [id]: !current[id],
    };
    set({ favorites: next });
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setActiveFilter: (activeFilter: JournalFilter) => set({ activeFilter }),
  setSortBy: (sortBy: JournalSort) => set({ sortBy }),
  clearError: () => set({ error: null }),
}));
