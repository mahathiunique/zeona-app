import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DbService } from '../db';
import { IUserRepository } from './interfaces';
import { UserProfile, NotificationPreferences } from '../../../types/models';

export const UserRepository: IUserRepository = {
  /**
   * Fetch root user profile from users/{userId}
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { uid: snapshot.id, ...snapshot.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      throw new Error(`UserRepository.getUserProfile failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save root user profile to users/{userId}
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, 'users', profile.uid);
      const data = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, data);
    } catch (error) {
      throw new Error(`UserRepository.saveUserProfile failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch notification preferences from users/{userId}/preferences/notifications
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const prefs = await DbService.getUserDocument<NotificationPreferences>(
        userId,
        'preferences',
        'notifications'
      );
      return prefs;
    } catch (error) {
      throw new Error(`UserRepository.getNotificationPreferences failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save notification preferences to users/{userId}/preferences/notifications
   */
  async saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
    try {
      await DbService.saveUserDocument<NotificationPreferences>(
        prefs.userId,
        'preferences',
        'notifications',
        prefs
      );
    } catch (error) {
      throw new Error(`UserRepository.saveNotificationPreferences failed: ${(error as Error).message}`);
    }
  },
};

export default UserRepository;
