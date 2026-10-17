import { where, orderBy } from 'firebase/firestore';
import { DbService } from '../db';
import { IMoodRepository } from './interfaces';
import { Mood } from '../../../types/models';

export const MoodRepository: IMoodRepository = {
  /**
   * Fetch all mood ratings, optionally filtered by start and end dates.
   */
  async getMoods(userId: string, startDate?: string, endDate?: string): Promise<Mood[]> {
    try {
      const constraints = [];
      if (startDate) {
        constraints.push(where('date', '>=', startDate));
      }
      if (endDate) {
        constraints.push(where('date', '<=', endDate));
      }
      constraints.push(orderBy('date', 'desc'));
      return await DbService.queryUserDocuments<Mood>(userId, 'moods', constraints);
    } catch (error) {
      throw new Error(`MoodRepository.getMoods failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a mood check-in (create or overwrite).
   */
  async saveMood(mood: Mood): Promise<void> {
    try {
      await DbService.saveUserDocument<Mood>(mood.userId, 'moods', mood.id, mood);
    } catch (error) {
      throw new Error(`MoodRepository.saveMood failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a mood check-in.
   */
  async deleteMood(userId: string, moodId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'moods', moodId);
    } catch (error) {
      throw new Error(`MoodRepository.deleteMood failed: ${(error as Error).message}`);
    }
  },
};

export default MoodRepository;
