import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { AuthCredentials } from '../../types/auth';

export const AuthService = {
  /**
   * Listen to authentication state changes.
   */
  subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get currently authenticated user.
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  /**
   * Sign up a new user with email and password.
   */
  async signUp({ email, password }: AuthCredentials): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Log in an existing user with email and password.
   */
  async signIn({ email, password }: AuthCredentials): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Sign out the currently authenticated user.
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Send a password reset email.
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Uniform Firebase Auth error handling to present readable messages.
   */
  handleError(error: unknown): Error {
    const err = error as { code?: string; message?: string };
    if (!err.code) {
      return new Error('An unexpected error occurred during authentication.');
    }

    switch (err.code) {
      case 'auth/invalid-email':
        return new Error('The email address is badly formatted.');
      case 'auth/user-disabled':
        return new Error('This user account has been disabled.');
      case 'auth/user-not-found':
        return new Error('No account found with this email.');
      case 'auth/wrong-password':
        return new Error('Incorrect password. Please try again.');
      case 'auth/email-already-in-use':
        return new Error('An account with this email address already exists.');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters.');
      case 'auth/network-request-failed':
        return new Error('Network error. Please check your internet connection.');
      default:
        return new Error(err.message || 'An authentication error occurred.');
    }
  },
};
