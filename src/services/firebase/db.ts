import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  UpdateData,
} from 'firebase/firestore';
import { db } from './firebase';

export const DbService = {
  /**
   * Helper to get a reference to the user's root document.
   */
  getUserDocRef(userId: string) {
    if (!userId) throw new Error('User ID is required for Firestore operations.');
    return doc(db, 'users', userId);
  },

  /**
   * Helper to get a reference to a subcollection under a specific user.
   * This guarantees that documents are scoped strictly to the authenticated user.
   */
  getUserSubcollectionRef(userId: string, subcollection: string) {
    if (!userId) throw new Error('User ID is required for Firestore operations.');
    return collection(db, 'users', userId, subcollection);
  },

  /**
   * Get a single user document.
   */
  async getUserDocument<T extends DocumentData>(userId: string, subcollection: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(db, 'users', userId, subcollection, docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as unknown as T;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to retrieve document: ${(error as Error).message}`);
    }
  },

  /**
   * Save (create or overwrite) a document scoped to the authenticated user.
   */
  async saveUserDocument<T extends WithFieldValue<DocumentData>>(
    userId: string,
    subcollection: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, subcollection, docId);
      // Automatically add metadata to maintain tracking
      const dataWithMetadata = {
        ...data,
        userId,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, dataWithMetadata);
    } catch (error) {
      throw new Error(`Failed to save document: ${(error as Error).message}`);
    }
  },

  /**
   * Update specific fields of an existing user-scoped document.
   */
  async updateUserDocument<T extends DocumentData>(
    userId: string,
    subcollection: string,
    docId: string,
    data: UpdateData<T>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, subcollection, docId);
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      throw new Error(`Failed to update document: ${(error as Error).message}`);
    }
  },

  /**
   * Delete a user-scoped document. Requires user ID to ensure permission.
   */
  async deleteUserDocument(userId: string, subcollection: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, subcollection, docId);
      await deleteDoc(docRef);
    } catch (error) {
      throw new Error(`Failed to delete document: ${(error as Error).message}`);
    }
  },

  /**
   * Query documents under a user's subcollection with optional search queries.
   */
  async queryUserDocuments<T extends DocumentData>(
    userId: string,
    subcollection: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const colRef = this.getUserSubcollectionRef(userId, subcollection);
      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
    } catch (error) {
      throw new Error(`Query failed: ${(error as Error).message}`);
    }
  },
};
