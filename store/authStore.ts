/**
 * Zeona — Auth store (Zustand)
 * Manages Supabase authentication state, sessions, and recovery across web & native.
 */

import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

const GUEST_STORAGE_KEY = 'zeona_is_guest_v1';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isGuest: boolean;
  error: string | null;
  isPasswordRecovery: boolean;

  // Actions
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => void;
  updateProfile: (data: { displayName?: string; avatarUrl?: string; bio?: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setPasswordRecovery: (active: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  isGuest: false,
  error: null,
  isPasswordRecovery: false,

  initialize: () => {
    if (!supabase) {
      // Supabase is not configured; mark initialized
      set({ isInitialized: true, isLoading: false });
      return;
    }

    set({ isLoading: true });

    // Fetch existing persisted session or guest status
    Promise.all([
      supabase.auth.getSession(),
      AsyncStorage.getItem(GUEST_STORAGE_KEY),
      AsyncStorage.getItem('zeona_profile_meta_v1'),
    ])
      .then(([{ data: { session }, error }, guestVal, localProfileJson]) => {
        if (error) {
          console.warn('[Zeona Auth] Error retrieving session:', error.message);
        }
        const isGuest = Boolean(guestVal === 'true');
        let initialUser = session?.user ?? null;

        if (localProfileJson) {
          try {
            const localMeta = JSON.parse(localProfileJson);
            if (initialUser) {
              initialUser = {
                ...initialUser,
                user_metadata: {
                  ...localMeta,
                  ...initialUser.user_metadata,
                },
              };
            } else if (isGuest) {
              initialUser = {
                id: 'guest-user',
                email: 'guest@zeona.app',
                user_metadata: localMeta,
              } as any;
            }
          } catch {}
        }

        set({
          session,
          user: initialUser,
          isGuest,
          isLoading: false,
          isInitialized: true,
        });
      })
      .catch((err) => {
        console.warn('[Zeona Auth] getSession error:', err);
        set({ isInitialized: true, isLoading: false });
      });

    // Real-time auth listener for login, logout, token refresh, and recovery
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, isGuest: false, isPasswordRecovery: false });
      } else if (event === 'PASSWORD_RECOVERY') {
        set({ session, user: session?.user ?? null, isPasswordRecovery: true });
      } else {
        set({
          session,
          user: session?.user ?? null,
          isGuest: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  signIn: async (email: string, password: string) => {
    if (!supabase) {
      const err = 'Authentication service is not configured. Please check your Supabase credentials.';
      set({ error: err });
      return { success: false, error: err };
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
        isGuest: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred during sign in.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  signUp: async (email: string, password: string, name: string) => {
    if (!supabase) {
      const err = 'Authentication service is not configured. Please check your Supabase credentials.';
      set({ error: err });
      return { success: false, error: err };
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            display_name: name.trim(),
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      // If Supabase has email confirmation enabled, data.session may be null
      const requiresConfirmation = !data.session && Boolean(data.user);

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
        isGuest: false,
        error: null,
      });

      return {
        success: true,
        requiresEmailConfirmation: requiresConfirmation,
      };
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred during sign up.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  resetPasswordForEmail: async (email: string) => {
    if (!supabase) {
      const err = 'Authentication service is not configured. Please check your Supabase credentials.';
      set({ error: err });
      return { success: false, error: err };
    }

    set({ isLoading: true, error: null });

    try {
      const redirectUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      set({ isLoading: false, error: null });
      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to send password reset email.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  updatePassword: async (password: string) => {
    if (!supabase) {
      const err = 'Authentication service is not configured. Please check your Supabase credentials.';
      set({ error: err });
      return { success: false, error: err };
    }

    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      set({ isLoading: false, isPasswordRecovery: false, error: null });
      return { success: true };
    } catch (err: any) {
      const message = err?.message || 'Failed to update password.';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  continueAsGuest: () => {
    set({ isGuest: true, error: null });
    AsyncStorage.setItem(GUEST_STORAGE_KEY, 'true').catch(() => {});
  },

  updateProfile: async (data: { displayName?: string; avatarUrl?: string; bio?: string }) => {
    set({ isLoading: true, error: null });
    const currentUser = get().user;
    const nextMetadata = {
      ...(currentUser?.user_metadata || {}),
      ...(data.displayName !== undefined ? { display_name: data.displayName.trim(), full_name: data.displayName.trim() } : {}),
      ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
      ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
    };

    // Save to local storage for persistence across reloads
    AsyncStorage.setItem('zeona_profile_meta_v1', JSON.stringify(nextMetadata)).catch(() => {});

    if (supabase && currentUser && !get().isGuest) {
      try {
        const { data: updatedData, error } = await supabase.auth.updateUser({
          data: nextMetadata,
        });

        if (!error && updatedData.user) {
          set({ user: updatedData.user, isLoading: false, error: null });
          return { success: true };
        } else if (error) {
          console.warn('[Zeona Auth] updateUser notice:', error.message);
        }
      } catch (err: any) {
        console.warn('[Zeona Auth] updateUser error:', err);
      }
    }

    // Local / guest user state update
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        user_metadata: nextMetadata,
      };
      set({ user: updatedUser as User, isLoading: false, error: null });
    } else {
      const simulatedUser: any = {
        id: 'guest-user',
        email: 'guest@zeona.app',
        user_metadata: nextMetadata,
      };
      set({ user: simulatedUser, isLoading: false, error: null });
    }

    return { success: true };
  },

  signOut: async () => {
    set({ isLoading: true });
    AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[Zeona Auth] signOut error:', err);
      }
    }
    set({
      session: null,
      user: null,
      isGuest: false,
      isLoading: false,
      error: null,
      isPasswordRecovery: false,
    });
  },

  clearError: () => set({ error: null }),
  setPasswordRecovery: (active: boolean) => set({ isPasswordRecovery: active }),
}));
