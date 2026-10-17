import { where, orderBy } from 'firebase/firestore';
import { DbService } from '../db';
import { IHabitRepository } from './interfaces';
import { Habit, HabitLog } from '../../../types/models';

export const HabitRepository: IHabitRepository = {
  /**
   * Fetch a single habit by ID.
   */
  async getHabit(userId: string, habitId: string): Promise<Habit | null> {
    try {
      return await DbService.getUserDocument<Habit>(userId, 'habits', habitId);
    } catch (error) {
      throw new Error(`HabitRepository.getHabit failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a habit definition.
   */
  async saveHabit(habit: Habit): Promise<void> {
    try {
      await DbService.saveUserDocument<Habit>(habit.userId, 'habits', habit.id, habit);
    } catch (error) {
      throw new Error(`HabitRepository.saveHabit failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a habit definition.
   */
  async deleteHabit(userId: string, habitId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'habits', habitId);
    } catch (error) {
      throw new Error(`HabitRepository.deleteHabit failed: ${(error as Error).message}`);
    }
  },

  /**
   * Get all habits definitions for a user.
   */
  async getHabits(userId: string): Promise<Habit[]> {
    try {
      const constraints = [orderBy('createdAt', 'desc')];
      return await DbService.queryUserDocuments<Habit>(userId, 'habits', constraints);
    } catch (error) {
      throw new Error(`HabitRepository.getHabits failed: ${(error as Error).message}`);
    }
  },

  /**
   * Get all habit logs (progress reports) checked in on a specific date.
   */
  async getHabitLogsForDate(userId: string, date: string): Promise<HabitLog[]> {
    try {
      const constraints = [where('date', '==', date)];
      return await DbService.queryUserDocuments<HabitLog>(userId, 'habitLogs', constraints);
    } catch (error) {
      throw new Error(`HabitRepository.getHabitLogsForDate failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a habit progress log (e.g. check off or update hydration count).
   */
  async saveHabitLog(log: HabitLog): Promise<void> {
    try {
      await DbService.saveUserDocument<HabitLog>(log.userId, 'habitLogs', log.id, log);
    } catch (error) {
      throw new Error(`HabitRepository.saveHabitLog failed: ${(error as Error).message}`);
    }
  },
};

export default HabitRepository;
