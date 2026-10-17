import {
  UserProfile,
  Task,
  Habit,
  HabitLog,
  JournalEntry,
  JournalEntryType,
  Mood,
  Goal,
  GoalMilestone,
  Event,
  SpecialDate,
  Achievement,
  UserAchievement,
  NotificationPreferences,
} from '../../../types/models';

export interface IUserRepository {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | null>;
  saveNotificationPreferences(prefs: NotificationPreferences): Promise<void>;
}

export interface ITaskRepository {
  getTask(userId: string, taskId: string): Promise<Task | null>;
  saveTask(task: Task): Promise<void>;
  deleteTask(userId: string, taskId: string): Promise<void>;
  getTasksForDate(userId: string, date: string): Promise<Task[]>;
  getTasksForRange(userId: string, startDate: string, endDate: string): Promise<Task[]>;
}

export interface IHabitRepository {
  getHabit(userId: string, habitId: string): Promise<Habit | null>;
  saveHabit(habit: Habit): Promise<void>;
  deleteHabit(userId: string, habitId: string): Promise<void>;
  getHabits(userId: string): Promise<Habit[]>;
  getHabitLogsForDate(userId: string, date: string): Promise<HabitLog[]>;
  saveHabitLog(log: HabitLog): Promise<void>;
}

export interface IJournalRepository {
  getEntry(userId: string, entryId: string): Promise<JournalEntry | null>;
  saveEntry(entry: JournalEntry): Promise<void>;
  deleteEntry(userId: string, entryId: string): Promise<void>;
  getEntries(userId: string, type?: JournalEntryType, limit?: number): Promise<JournalEntry[]>;
  getEntriesForDateRange(userId: string, startDate: string, endDate: string): Promise<JournalEntry[]>;
  getEntriesWithImages(userId: string): Promise<JournalEntry[]>;
  getTotalCount(userId: string): Promise<number>;
  uploadMedia(userId: string, entryId: string, localUri: string): Promise<string>;
  uploadMediaWithProgress(
    userId: string,
    entryId: string,
    localUri: string,
    onProgress: (progress: number) => void
  ): Promise<string>;
}

export interface IMoodRepository {
  getMoods(userId: string, startDate?: string, endDate?: string): Promise<Mood[]>;
  saveMood(mood: Mood): Promise<void>;
  deleteMood(userId: string, moodId: string): Promise<void>;
}

export interface IGoalRepository {
  getGoal(userId: string, goalId: string): Promise<Goal | null>;
  saveGoal(goal: Goal): Promise<void>;
  deleteGoal(userId: string, goalId: string): Promise<void>;
  getGoals(userId: string): Promise<Goal[]>;
  getMilestones(userId: string, goalId: string): Promise<GoalMilestone[]>;
  saveMilestone(milestone: GoalMilestone): Promise<void>;
  deleteMilestone(userId: string, goalId: string, milestoneId: string): Promise<void>;
}

export interface IEventRepository {
  getEventsForRange(userId: string, startDate: string, endDate: string): Promise<Event[]>;
  saveEvent(event: Event): Promise<void>;
  deleteEvent(userId: string, eventId: string): Promise<void>;
  getSpecialDates(userId: string): Promise<SpecialDate[]>;
  saveSpecialDate(date: SpecialDate): Promise<void>;
  deleteSpecialDate(userId: string, dateId: string): Promise<void>;
}

export interface IAchievementRepository {
  getAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  saveUserAchievement(ach: UserAchievement): Promise<void>;
}
