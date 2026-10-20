/**
 * Zeona — Typed Data-Access Layer
 *
 * Centralized, type-safe API for interacting with Supabase tables.
 * Guarantees:
 * - Scoped strictly to authenticated user via Supabase RLS.
 * - Matches the exact database schema: UUIDs, constraints, and timestamps.
 * - Handles offline fallback gracefully.
 * - Zero exposure of service role keys; uses authenticated client session.
 */

import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { isValidUUID } from '@/utils/uuid';
import type {
  JournalEntry,
  MoodEntry,
  Task,
  Habit,
  HabitLog,
  Memory,
  CalendarEvent,
  Reminder,
  UserProfile,
} from '@/types';

export interface DatabaseResult<T> {
  data: T | null;
  error: string | null;
}

export interface DatabaseListResult<T> {
  data: T[];
  error: string | null;
}

export interface VoiceRecordingMetadata {
  id: string;
  user_id: string;
  title: string | null;
  storage_path: string;
  duration_seconds: number;
  file_size_bytes?: number;
  mime_type?: string;
  journal_entry_id?: string | null;
  transcript?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helper: Get Current Authenticated User ID ────────────────────────────────
function getRequiredUserId(): string | null {
  const user = useAuthStore.getState().user;
  if (!user || user.id === 'guest-user' || user.id === 'local-user') {
    return null;
  }
  return user.id;
}

/**
 * Sanitizes insert payloads:
 * Omits client-side temporary non-UUID string IDs (e.g. "entry-...", "task-...")
 * so PostgreSQL generates a genuine UUID via gen_random_uuid() or bigint sequence.
 */
function sanitizePayload<T extends Record<string, any>>(payload: T, isBigintId = false): Record<string, any> {
  const result = { ...payload };
  if (isBigintId) {
    if (typeof result.id === 'string' && !/^\d+$/.test(result.id)) {
      delete result.id;
    }
  } else if (result.id !== undefined) {
    if (!isValidUUID(result.id)) {
      delete result.id;
    }
  }
  return result;
}

// ─── 1. Profiles API ──────────────────────────────────────────────────────────
export const profilesApi = {
  async getProfile(): Promise<DatabaseResult<UserProfile>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error: error?.message || null };
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<DatabaseResult<UserProfile>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error: error?.message || null };
  },
};

// ─── 2. Journal Entries API ───────────────────────────────────────────────────
export const journalApi = {
  async listEntries(): Promise<DatabaseListResult<JournalEntry>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async createEntry(entry: Omit<JournalEntry, 'created_at' | 'updated_at'>): Promise<DatabaseResult<JournalEntry>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...entry, user_id: userId });
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async updateEntry(id: string, updates: Partial<JournalEntry>): Promise<DatabaseResult<JournalEntry>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteEntry(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 3. Mood Entries API ──────────────────────────────────────────────────────
export const moodApi = {
  async listEntries(): Promise<DatabaseListResult<MoodEntry>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async createEntry(entry: Omit<MoodEntry, 'created_at' | 'updated_at'>): Promise<DatabaseResult<MoodEntry>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...entry, user_id: userId }, true);
    const { data, error } = await supabase
      .from('mood_entries')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async updateEntry(id: string, updates: Partial<MoodEntry>): Promise<DatabaseResult<MoodEntry>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('mood_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteEntry(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('mood_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 4. Tasks API ─────────────────────────────────────────────────────────────
export const tasksApi = {
  async listTasks(): Promise<DatabaseListResult<Task>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    return { data: data || [], error: error?.message || null };
  },

  async createTask(task: Omit<Task, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Task>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...task, user_id: userId });
    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<DatabaseResult<Task>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteTask(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 5. Habits & Completions API ──────────────────────────────────────────────
export const habitsApi = {
  async listHabits(): Promise<DatabaseListResult<Habit>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async listCompletions(): Promise<DatabaseListResult<HabitLog>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    // Query backward-compatible view habit_logs
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId);

    return { data: data || [], error: error?.message || null };
  },

  async createHabit(habit: Omit<Habit, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Habit>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...habit, user_id: userId });
    const { data, error } = await supabase
      .from('habits')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async recordCompletion(habitId: string, dateStr: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    // Insert into habit_completions with UNIQUE(habit_id, completed_date) protection
    const { error } = await supabase
      .from('habit_completions')
      .insert([
        {
          habit_id: habitId,
          user_id: userId,
          completed_date: dateStr,
        },
      ]);

    return { success: !error, error: error?.message || null };
  },

  async deleteCompletion(habitId: string, dateStr: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_date', dateStr)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 6. Memories API ──────────────────────────────────────────────────────────
export const memoriesApi = {
  async listMemories(): Promise<DatabaseListResult<Memory>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('memory_date', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async createMemory(memory: Omit<Memory, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Memory>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...memory, user_id: userId });
    const { data, error } = await supabase
      .from('memories')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteMemory(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 7. Calendar Events API ───────────────────────────────────────────────────
export const eventsApi = {
  async listEvents(): Promise<DatabaseListResult<CalendarEvent>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  async createEvent(event: Omit<CalendarEvent, 'created_at' | 'updated_at'>): Promise<DatabaseResult<CalendarEvent>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...event, user_id: userId });
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteEvent(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 8. Reminders API ─────────────────────────────────────────────────────────
export const remindersApi = {
  async listReminders(): Promise<DatabaseListResult<Reminder>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_date', { ascending: true })
      .order('reminder_time', { ascending: true });

    return { data: data || [], error: error?.message || null };
  },

  async createReminder(reminder: Omit<Reminder, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Reminder>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...reminder, user_id: userId });
    const { data, error } = await supabase
      .from('reminders')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<DatabaseResult<Reminder>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteReminder(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};

// ─── 9. Voice Recordings Metadata API ─────────────────────────────────────────
export const voiceRecordingsApi = {
  async listRecordings(): Promise<DatabaseListResult<VoiceRecordingMetadata>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('voice_recordings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error: error?.message || null };
  },

  async createRecording(metadata: Omit<VoiceRecordingMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<VoiceRecordingMetadata>> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { data: null, error: 'User not authenticated' };

    const payload = sanitizePayload({ ...metadata, user_id: userId });
    const { data, error } = await supabase
      .from('voice_recordings')
      .insert([payload])
      .select()
      .single();

    return { data, error: error?.message || null };
  },

  async deleteRecording(id: string): Promise<{ success: boolean; error: string | null }> {
    const userId = getRequiredUserId();
    if (!supabase || !userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('voice_recordings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return { success: !error, error: error?.message || null };
  },
};
