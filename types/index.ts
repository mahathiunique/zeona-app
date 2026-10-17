/**
 * Zeona — Shared application types
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export type JournalEntryType = 'text' | 'voice' | 'photo';
export type MoodTag =
  | 'happy'
  | 'calm'
  | 'neutral'
  | 'anxious'
  | 'sad'
  | 'angry'
  | 'grateful'
  | 'excited';

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  type: JournalEntryType;
  mood: MoodTag | null;
  tags?: string[];
  audio_url: string | null;
  audio_duration?: number;
  image_urls: string[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  color: string;
  icon: string;
  streak_count: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  logged_date: string; // ISO date string YYYY-MM-DD
  created_at: string;
}

// ─── Calendar / Important Dates ───────────────────────────────────────────────

export type CalendarEventType =
  | 'event'
  | 'reminder'
  | 'birthday'
  | 'anniversary'
  | 'exam'
  | 'milestone';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string; // ISO date string YYYY-MM-DD
  event_time?: string | null; // e.g. "10:00 AM" or "14:30"
  event_type: CalendarEventType;
  has_reminder?: boolean;
  reminder_time?: string | null; // e.g. "15_min_before" | "1_hour_before" | "1_day_before"
  is_recurring: boolean;
  recurrence_rule: string | null;
  color: string | null;
  created_at: string;
  updated_at?: string;
}

// ─── Memories ─────────────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  memory_date: string;
  created_at: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
