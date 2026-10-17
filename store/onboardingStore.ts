/**
 * Zeona — Onboarding Store
 * Persists onboarding completion state using AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = 'zeona_onboarding_completed_v1';

interface OnboardingState {
  hasCompletedOnboarding: boolean | null;
  isLoading: boolean;

  // Actions
  initialize: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasCompletedOnboarding: null,
  isLoading: true,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      set({
        hasCompletedOnboarding: stored === 'true',
        isLoading: false,
      });
    } catch {
      set({
        hasCompletedOnboarding: false,
        isLoading: false,
      });
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Ignore
    }
    set({ hasCompletedOnboarding: true });
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // Ignore
    }
    set({ hasCompletedOnboarding: false });
  },
}));
