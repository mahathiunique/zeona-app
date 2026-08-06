import { collection, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DbService } from '../db';
import { IAchievementRepository } from './interfaces';
import { Achievement, UserAchievement } from '../../../types/models';

export const AchievementRepository: IAchievementRepository = {
  /**
   * Fetch all global achievements (static records stored in root 'achievements' collection).
   */
  async getAchievements(): Promise<Achievement[]> {
    try {
      const colRef = collection(db, 'achievements');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Achievement));
    } catch (error) {
      throw new Error(`AchievementRepository.getAchievements failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch user achievement unlock metrics and progress.
   * Stored under users/{userId}/userAchievements.
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const constraints = [orderBy('updatedAt', 'desc')];
      return await DbService.queryUserDocuments<UserAchievement>(
        userId,
        'userAchievements',
        constraints
      );
    } catch (error) {
      throw new Error(`AchievementRepository.getUserAchievements failed: ${(error as Error).message}`);
    }
  },

  /**
   * Update or unlock a user achievement record.
   * Stored under users/{userId}/userAchievements/{achievementId}.
   */
  async saveUserAchievement(ach: UserAchievement): Promise<void> {
    try {
      await DbService.saveUserDocument<UserAchievement>(
        ach.userId,
        'userAchievements',
        ach.achievementId,
        ach
      );
    } catch (error) {
      throw new Error(`AchievementRepository.saveUserAchievement failed: ${(error as Error).message}`);
    }
  },
};

export default AchievementRepository;
