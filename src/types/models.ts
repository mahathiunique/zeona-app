export interface BaseModel {
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends BaseModel {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  currentStreak?: number;
  longestStreak?: number;
}

export interface Task extends BaseModel {
  id: string;
  userId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  dueDate: string; // ISO date string (YYYY-MM-DD)
}

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface Habit extends BaseModel {
  id: string;
  userId: string;
  name: string;
  description: string;
  frequency: HabitFrequency;
  frequencyDays?: number[]; // e.g. [1, 3, 5] for Mon, Wed, Fri
  targetCount: number; // e.g. 1 time per day, 8 glasses of water
}

export interface HabitLog extends BaseModel {
  id: string;
  userId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  count: number; // Progress towards targetCount
  isCompleted: boolean;
}

export type JournalEntryType = 'text' | 'voice' | 'reflection';

export interface JournalEntry extends BaseModel {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: JournalEntryType;
  date: string;                     // YYYY-MM-DD — enables Firestore date queries
  moodEmoji?: string | null;        // e.g. '😊'
  moodValue?: number | null;        // 1–5 scale matching Mood model
  // Guided reflection fields
  highlight?: string | null;        // "Highlight of the day"
  difficultMoment?: string | null;
  gratitude?: string | null;
  lessonsLearned?: string | null;
  tomorrowIntent?: string | null;   // "What do you want tomorrow to feel like?"
  isReflection: boolean;
  // Media
  mediaUrl?: string | null;         // Firebase Storage URL for audio or image
  audioDuration?: number | null;    // Duration in seconds for voice entries
  imageThumbnailUrl?: string | null; // Smaller thumbnail for memories grid
  // Legacy / search helper
  reflectionPrompt?: string | null;
}

export interface Mood extends BaseModel {
  id: string;
  userId: string;
  value: number; // 1 to 5 scale
  note: string;
  date: string; // YYYY-MM-DD
  timeOfDay: string; // e.g. 'morning', 'afternoon', 'evening', 'night'
}

export type GoalCategory = 'Academic' | 'Career' | 'Fitness' | 'Health' | 'Finance' | 'Reading' | 'Personal' | 'Creative' | 'Other';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal extends BaseModel {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: GoalCategory;
  startDate: string;
  targetDate: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  progress: number; // percentage (0 - 100)
  status: GoalStatus;
}

export interface GoalMilestone extends BaseModel {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
}

export interface Event extends BaseModel {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  category: string; // e.g. 'personal', 'work', 'health'
}

export type SpecialDateType = 'birthday' | 'anniversary' | 'holiday' | 'other';

export interface SpecialDate extends BaseModel {
  id: string;
  userId: string;
  title: string;
  date: string; // MM-DD or YYYY-MM-DD
  type: SpecialDateType;
}

export type AchievementType = 'streak' | 'habit' | 'journal' | 'mood';

export interface Achievement extends BaseModel {
  id: string;
  title: string;
  description: string;
  iconName: string;
  type: AchievementType;
  targetValue: number; // Value needed to unlock (e.g. 7 day streak, 10 journals)
}

export interface UserAchievement extends BaseModel {
  id: string; // userId_achievementId
  userId: string;
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

export interface NotificationPreferences extends BaseModel {
  userId: string;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM
  journalReminderEnabled: boolean;
  habitReminderEnabled: boolean;
}
