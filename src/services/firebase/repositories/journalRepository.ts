import { where, orderBy, limit as firestoreLimit, getDocs, query } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { DbService } from '../db';
import { storage } from '../firebase';
import { IJournalRepository } from './interfaces';
import { JournalEntry, JournalEntryType } from '../../../types/models';

export const JournalRepository: IJournalRepository = {
  /**
   * Fetch a single journal entry by ID.
   */
  async getEntry(userId: string, entryId: string): Promise<JournalEntry | null> {
    try {
      return await DbService.getUserDocument<JournalEntry>(userId, 'journalEntries', entryId);
    } catch (error) {
      throw new Error(`JournalRepository.getEntry failed: ${(error as Error).message}`);
    }
  },

  /**
   * Save a journal entry (create or overwrite).
   */
  async saveEntry(entry: JournalEntry): Promise<void> {
    try {
      await DbService.saveUserDocument<JournalEntry>(entry.userId, 'journalEntries', entry.id, entry);
    } catch (error) {
      throw new Error(`JournalRepository.saveEntry failed: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a journal entry.
   */
  async deleteEntry(userId: string, entryId: string): Promise<void> {
    try {
      await DbService.deleteUserDocument(userId, 'journalEntries', entryId);
    } catch (error) {
      throw new Error(`JournalRepository.deleteEntry failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch journal entries, optionally filtered by type, with an optional limit.
   * Default limit 50 — honest about Firestore's lack of full-text search.
   */
  async getEntries(userId: string, type?: JournalEntryType, limitCount = 50): Promise<JournalEntry[]> {
    try {
      const constraints = [];
      if (type) {
        constraints.push(where('type', '==', type));
      }
      constraints.push(orderBy('date', 'desc'));
      constraints.push(firestoreLimit(limitCount));
      return await DbService.queryUserDocuments<JournalEntry>(userId, 'journalEntries', constraints);
    } catch (error) {
      throw new Error(`JournalRepository.getEntries failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch journal entries within a date range (YYYY-MM-DD).
   */
  async getEntriesForDateRange(userId: string, startDate: string, endDate: string): Promise<JournalEntry[]> {
    try {
      const constraints = [
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc'),
      ];
      return await DbService.queryUserDocuments<JournalEntry>(userId, 'journalEntries', constraints);
    } catch (error) {
      throw new Error(`JournalRepository.getEntriesForDateRange failed: ${(error as Error).message}`);
    }
  },

  /**
   * Fetch only entries that have an associated image (mediaUrl is non-null).
   * NOTE: Firestore does not support != null natively for all SDKs; we use
   * orderBy on mediaUrl which implicitly excludes docs where the field is absent.
   */
  async getEntriesWithImages(userId: string): Promise<JournalEntry[]> {
    try {
      const colRef = DbService.getUserSubcollectionRef(userId, 'journalEntries');
      const q = query(
        colRef,
        where('mediaUrl', '!=', null),
        orderBy('mediaUrl'),   // required when using != filter
        orderBy('date', 'desc'),
        firestoreLimit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as JournalEntry));
    } catch (error) {
      throw new Error(`JournalRepository.getEntriesWithImages failed: ${(error as Error).message}`);
    }
  },

  /**
   * Return the total number of journal entries for this user.
   * We use a lightweight query with a high limit and count the results.
   * For V1 this is acceptable; use a counter document for scale.
   */
  async getTotalCount(userId: string): Promise<number> {
    try {
      const colRef = DbService.getUserSubcollectionRef(userId, 'journalEntries');
      const q = query(colRef, firestoreLimit(500));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      throw new Error(`JournalRepository.getTotalCount failed: ${(error as Error).message}`);
    }
  },

  /**
   * Upload media file to Firebase Storage.
   * path: users/{userId}/journal/{entryId}/{timestamp}
   */
  async uploadMedia(userId: string, entryId: string, localUri: string): Promise<string> {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const fileRef = ref(storage, `users/${userId}/journal/${entryId}/${Date.now()}`);
      await uploadBytes(fileRef, blob);
      return await getDownloadURL(fileRef);
    } catch (error) {
      throw new Error(`JournalRepository.uploadMedia failed: ${(error as Error).message}`);
    }
  },

  /**
   * Upload media with progress callbacks via uploadBytesResumable.
   */
  async uploadMediaWithProgress(
    userId: string,
    entryId: string,
    localUri: string,
    onProgress: (progress: number) => void
  ): Promise<string> {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const fileRef = ref(storage, `users/${userId}/journal/${entryId}/${Date.now()}`);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          onProgress(progress);
        },
        (error) => {
          reject(new Error(`JournalRepository.uploadMediaWithProgress failed: ${error.message}`));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  },
};

export default JournalRepository;
