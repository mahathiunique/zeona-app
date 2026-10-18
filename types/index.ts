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

export type CoreMood = 'happy' | 'calm' | 'neutral' | 'anxious' | 'sad';

export type MoodTag =
  | CoreMood
  | 'angry'
  | 'grateful'
  | 'excited';

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: CoreMood;
  note: string | null;
  tags: string[];
  logged_date: string; // ISO YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type InsightPeriod = 'week' | 'month' | 'year';

export interface MoodDistributionItem {
  mood: CoreMood;
  count: number;
  percentage: number;
  label: string;
}

export interface PeriodComparison {
  hasSufficientData: boolean;
  previousCount: number;
  currentCount: number;
  deltaCount: number;
  percentChange: number | null; // e.g. +25 or -10
  textSummary: string;
}

export interface MoodPeriodStats {
  period: InsightPeriod;
  startDate: string;
  endDate: string;
  dateRangeFormatted: string;
  totalCheckIns: number;
  daysInPeriod: number;
  checkInRatePercent: number;
  distribution: Record<CoreMood, MoodDistributionItem>;
  dominantMood: CoreMood | null;
  dominantPercentage: number;
  comparison: PeriodComparison;
  topTags: { tag: string; count: number }[];
  entries: MoodEntry[];
}

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
export type TaskCategory = 'personal' | 'wellness' | 'work' | 'home' | 'growth';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: TaskPriority;
  category?: TaskCategory | string | null;
  due_date: string | null; // ISO YYYY-MM-DD
  due_time?: string | null; // e.g. "09:30 AM"
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  target_days?: number[]; // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
  color: string;
  icon: string;
  streak_count?: number;
  best_streak?: number;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at?: string;
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
