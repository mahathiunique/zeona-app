/**
 * Zeona — Settings & Preferences Store (Zustand + AsyncStorage + Supabase)
 *
 * Full lifecycle management for user preferences:
 * - Appearance & theme (Light, Dark, System)
 * - Notification preferences (mindful cues, quiet hours, sound/haptic toggles)
 * - Privacy & security configurations
 * - Complete sanctuary data export (JSON format)
 * - Secure account deletion with cascading database & private storage file wipe
 */

import { create } from 'zustand';
import { Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { useJournalStore } from '@/store/journalStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useHabitStore } from '@/store/habitStore';
import { useMoodStore } from '@/store/moodStore';
import { useMemoryStore } from '@/store/memoryStore';
import { useReminderStore } from '@/store/reminderStore';
import type { ThemeMode, NotificationPreferences, PrivacyPreferences, UserSettings } from '@/types';

const SETTINGS_STORAGE_KEY = 'zeona_user_settings_v1';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mindfulReminders: true,
  eveningReflection: true,
  habitReminders: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
  hapticsEnabled: true,
};

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  biometricLock: false,
  anonymousAnalytics: false,
  cloudSyncEnabled: true,
};

interface SettingsStoreState {
  themeMode: ThemeMode;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  isLoaded: boolean;
  isExporting: boolean;
  isDeletingAccount: boolean;

  // Actions
  initialize: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  updateNotifications: (updates: Partial<NotificationPreferences>) => Promise<void>;
  updatePrivacy: (updates: Partial<PrivacyPreferences>) => Promise<void>;
  exportSanctuaryData: () => Promise<{
    success: boolean;
    fileName: string;
    recordCounts: {
      journals: number;
      tasks: number;
      events: number;
      habits: number;
      moods: number;
      memories: number;
      reminders: number;
    };
  }>;
  deleteAccountAndWipeData: () => Promise<{ success: boolean; error?: string }>;
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  themeMode: 'system',
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  privacy: DEFAULT_PRIVACY_PREFERENCES,
  isLoaded: false,
  isExporting: false,
  isDeletingAccount: false,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed: UserSettings = JSON.parse(stored);
        set({
          themeMode: parsed.themeMode || 'system',
          notifications: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...(parsed.notifications || {}),
          },
          privacy: {
            ...DEFAULT_PRIVACY_PREFERENCES,
            ...(parsed.privacy || {}),
          },
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    set({ themeMode: mode });
    const current = get();
    const payload: UserSettings = {
      themeMode: mode,
      notifications: current.notifications,
      privacy: current.privacy,
      updated_at: new Date().toISOString(),
    };
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  },

  updateNotifications: async (updates: Partial<NotificationPreferences>) => {
    const next = { ...get().notifications, ...updates };
    set({ notifications: next });
    const payload: UserSettings = {
      themeMode: get().themeMode,
      notifications: next,
      privacy: get().privacy,
      updated_at: new Date().toISOString(),
    };
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  },

  updatePrivacy: async (updates: Partial<PrivacyPreferences>) => {
    const next = { ...get().privacy, ...updates };
    set({ privacy: next });
    const payload: UserSettings = {
      themeMode: get().themeMode,
      notifications: get().notifications,
      privacy: next,
      updated_at: new Date().toISOString(),
    };
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  },

  exportSanctuaryData: async () => {
    set({ isExporting: true });

    try {
      const user = useAuthStore.getState().user;
      const journals = useJournalStore.getState().entries;
      const tasks = useCalendarStore.getState().tasks;
      const events = useCalendarStore.getState().events;
      const habits = useHabitStore.getState().habits;
      const habitLogs = useHabitStore.getState().logs;
      const moods = useMoodStore.getState().entries;
      const memories = useMemoryStore.getState().memories;
      const reminders = useReminderStore.getState().reminders;
      const settings = {
        themeMode: get().themeMode,
        notifications: get().notifications,
        privacy: get().privacy,
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `zeona_sanctuary_export_${dateStr}.json`;

      const exportPayload = {
        app: 'Zeona Sanctuary',
        version: '1.0.0',
        export_date: new Date().toISOString(),
        user: {
          id: user?.id || 'local-user',
          email: user?.email || 'sanctuary_user@zeona.app',
          display_name: user?.user_metadata?.display_name || 'Sanctuary Keeper',
          bio: user?.user_metadata?.bio || null,
        },
        settings,
        summary: {
          journals_count: journals.length,
          tasks_count: tasks.length,
          events_count: events.length,
          habits_count: habits.length,
          habit_logs_count: habitLogs.length,
          mood_reflections_count: moods.length,
          memories_count: memories.length,
          reminders_count: reminders.length,
        },
        data: {
          journals,
          tasks,
          events,
          habits,
          habit_logs: habitLogs,
          mood_entries: moods,
          memories,
          reminders,
        },
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);

      // Web: Direct file download
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } else {
        // Native (iOS/Android): Share JSON text / file
        await Share.share({
          title: 'Zeona Sanctuary Data Export',
          message: jsonString,
        });
      }

      set({ isExporting: false });
      return {
        success: true,
        fileName,
        recordCounts: {
          journals: journals.length,
          tasks: tasks.length,
          events: events.length,
          habits: habits.length,
          moods: moods.length,
          memories: memories.length,
          reminders: reminders.length,
        },
      };
    } catch (err) {
      console.warn('[Zeona Settings] exportSanctuaryData error:', err);
      set({ isExporting: false });
      throw err;
    }
  },

  deleteAccountAndWipeData: async () => {
    set({ isDeletingAccount: true });
    const user = useAuthStore.getState().user;
    const userId = user?.id;

    try {
      // 1. Wipe Supabase records and private storage files if authenticated
      if (supabase && userId && userId !== 'guest-user' && userId !== 'local-user') {
        // A. Remove private storage files in 'memories' bucket
        try {
          const { data: memoryFiles } = await supabase.storage.from('memories').list(userId);
          if (memoryFiles && memoryFiles.length > 0) {
            const paths = memoryFiles.map((f) => `${userId}/${f.name}`);
            await supabase.storage.from('memories').remove(paths);
          }
        } catch (storageErr) {
          console.warn('[Zeona Settings] Memory files removal notice:', storageErr);
        }

        // B. Remove private audio files in 'voice-diaries' bucket
        try {
          const { data: voiceFiles } = await supabase.storage.from('voice-diaries').list(userId);
          if (voiceFiles && voiceFiles.length > 0) {
            const paths = voiceFiles.map((f) => `${userId}/${f.name}`);
            await supabase.storage.from('voice-diaries').remove(paths);
          }
        } catch (storageErr) {
          console.warn('[Zeona Settings] Voice files removal notice:', storageErr);
        }

        // C. Delete all database table records scoped to user
        const userScopedTables = [
          'memories',
          'voice_recordings',
          'journal_entries',
          'tasks',
          'calendar_events',
          'habit_completions',
          'habits',
          'mood_entries',
          'reminders',
        ];

        for (const table of userScopedTables) {
          try {
            await supabase.from(table).delete().eq('user_id', userId);
          } catch (tblErr) {
            console.warn(`[Zeona Settings] Table delete notice (${table}):`, tblErr);
          }
        }

        // D. Delete profile record (scoped by id = userId)
        try {
          await supabase.from('profiles').delete().eq('id', userId);
        } catch (profErr) {
          console.warn('[Zeona Settings] Profile delete notice:', profErr);
        }
      }

      // 2. Wipe all local AsyncStorage keys
      const keysToWipe = [
        SETTINGS_STORAGE_KEY,
        'zeona_journal_entries_v1',
        'zeona_habits_v2',
        'zeona_habit_logs_v2',
        'zeona_memories_v1',
        'zeona_reminders_v1',
        'zeona_mood_entries_v1',
        'zeona_profile_meta_v1',
        'zeona_guest_mode',
      ];

      if (userId) {
        keysToWipe.push(
          `zeona_journal_entries_v1_${userId}`,
          `zeona_habits_v2_${userId}`,
          `zeona_habit_logs_v2_${userId}`,
          `zeona_memories_v1_${userId}`,
          `zeona_reminders_v1_${userId}`,
          `zeona_mood_entries_v1_${userId}`
        );
      }

      await AsyncStorage.multiRemove(keysToWipe);

      // 3. Sign out auth session
      await useAuthStore.getState().signOut();

      set({ isDeletingAccount: false });
      return { success: true };
    } catch (err: any) {
      console.warn('[Zeona Settings] deleteAccountAndWipeData error:', err);
      set({ isDeletingAccount: false });
      return { success: false, error: err?.message || 'Could not complete account deletion' };
    }
  },
}));
