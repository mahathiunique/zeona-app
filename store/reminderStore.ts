/**
 * Zeona — Reminder Store (Zustand + Supabase + AsyncStorage + Notifications)
 *
 * Full lifecycle management for reminders:
 * - Scoped to authenticated Supabase user ('reminders' table) with local AsyncStorage fallback
 * - Distinguishes database persistence from device-scheduled notifications
 * - Linkable to Tasks, Calendar Events, or Habits
 * - Enable/disable toggle with automated device schedule cancellation
 * - Real-time permission tracking
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  getDeviceNotificationPermissions,
  requestDeviceNotificationPermissions,
  scheduleDeviceReminder,
  cancelDeviceReminder,
  type NotificationPermissionInfo,
} from '@/services/notificationService';
import { getLocalTodayDateString } from '@/store/moodStore';
import { generateUUID } from '@/utils/uuid';
import type { Reminder, ReminderRelatedType } from '@/types';

const REMINDERS_STORAGE_KEY = 'zeona_reminders_v1';

// ── Initial Seed Reminders ───────────────────────────────────────────────────
function generateSeedReminders(): Reminder[] {
  const today = new Date();

  // Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // In 3 days
  const threeDays = new Date(today);
  threeDays.setDate(today.getDate() + 3);

  return [
    {
      id: 'reminder-seed-1',
      user_id: 'local-user',
      title: 'Evening Chamomile Tea & Reflection',
      notes: 'Brew hot tea, step away from screens, and write in the evening sanctuary.',
      reminder_date: getLocalTodayDateString(today),
      reminder_time: '20:30',
      is_enabled: true,
      is_completed: false,
      related_type: 'habit',
      related_title: 'Evening Journaling',
      notification_id: null,
      is_scheduled_on_device: false,
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
    },
    {
      id: 'reminder-seed-2',
      user_id: 'local-user',
      title: 'Water the Ferns & Balcony Plants',
      notes: 'Check soil moisture and mist leaves gently.',
      reminder_date: getLocalTodayDateString(tomorrow),
      reminder_time: '09:00',
      is_enabled: true,
      is_completed: false,
      related_type: 'task',
      related_title: 'Plant Care',
      notification_id: null,
      is_scheduled_on_device: false,
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
    },
    {
      id: 'reminder-seed-3',
      user_id: 'local-user',
      title: 'Sunday Family Call & Milestone Photos',
      notes: 'Share the weekend memories from the botanical gardens.',
      reminder_date: getLocalTodayDateString(threeDays),
      reminder_time: '16:00',
      is_enabled: true,
      is_completed: false,
      related_type: 'event',
      related_title: 'Family Gathering',
      notification_id: null,
      is_scheduled_on_device: false,
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
    },
  ];
}

interface ReminderStoreState {
  reminders: Reminder[];
  isLoading: boolean;
  permissionInfo: NotificationPermissionInfo;

  // Actions
  initialize: () => Promise<void>;
  fetchReminders: () => Promise<void>;
  addReminder: (data: {
    title: string;
    notes?: string | null;
    reminder_date: string;
    reminder_time: string;
    related_type?: ReminderRelatedType;
    related_id?: string | null;
    related_title?: string | null;
  }) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<Reminder | null>;
  deleteReminder: (id: string) => Promise<void>;
  toggleReminderEnabled: (id: string) => Promise<void>;
  toggleReminderCompleted: (id: string) => Promise<void>;
  checkPermissions: () => Promise<NotificationPermissionInfo>;
  requestPermissions: () => Promise<NotificationPermissionInfo>;
}

export const useReminderStore = create<ReminderStoreState>((set, get) => ({
  reminders: generateSeedReminders(),
  isLoading: false,
  permissionInfo: {
    status: 'undetermined',
    canSchedule: false,
    platformDescription: 'Checking notification capabilities…',
  },

  initialize: async () => {
    await get().checkPermissions();
    await get().fetchReminders();
  },

  checkPermissions: async () => {
    const info = await getDeviceNotificationPermissions();
    set({ permissionInfo: info });
    return info;
  },

  requestPermissions: async () => {
    const info = await requestDeviceNotificationPermissions();
    set({ permissionInfo: info });
    return info;
  },

  fetchReminders: async () => {
    set({ isLoading: true });
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${REMINDERS_STORAGE_KEY}_${user.id}` : REMINDERS_STORAGE_KEY;

    // 1. Try Supabase if authenticated
    if (supabase && user) {
      try {
        const { data, error } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id)
          .order('reminder_date', { ascending: true })
          .order('reminder_time', { ascending: true });

        if (!error && data && data.length > 0) {
          set({ reminders: data, isLoading: false });
          AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[Zeona Reminders] Supabase fetch notice:', err);
      }
    }

    // 2. Fallback to AsyncStorage
    try {
      const localJson = await AsyncStorage.getItem(storageKey);
      if (localJson) {
        const parsed = JSON.parse(localJson);
        set({ reminders: parsed, isLoading: false });
      } else {
        const seed = generateSeedReminders();
        set({ reminders: seed, isLoading: false });
        AsyncStorage.setItem(storageKey, JSON.stringify(seed)).catch(() => {});
      }
    } catch {
      set({ reminders: generateSeedReminders(), isLoading: false });
    }
  },

  addReminder: async (data) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${REMINDERS_STORAGE_KEY}_${user.id}` : REMINDERS_STORAGE_KEY;

    const newId = generateUUID();

    // Try scheduling device notification
    const schedResult = await scheduleDeviceReminder({
      id: newId,
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      dateStr: data.reminder_date,
      timeStr: data.reminder_time,
    });

    const newReminder: Reminder = {
      id: newId,
      user_id: user?.id || 'local-user',
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      reminder_date: data.reminder_date,
      reminder_time: data.reminder_time,
      is_enabled: true,
      is_completed: false,
      related_type: data.related_type || 'none',
      related_id: data.related_id || null,
      related_title: data.related_title || null,
      notification_id: schedResult.notificationId,
      is_scheduled_on_device: schedResult.success,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextReminders = [...get().reminders, newReminder].sort((a, b) => {
      const cmp = a.reminder_date.localeCompare(b.reminder_date);
      return cmp !== 0 ? cmp : a.reminder_time.localeCompare(b.reminder_time);
    });

    set({ reminders: nextReminders });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextReminders)).catch(() => {});

    if (supabase && user) {
      try {
        await supabase.from('reminders').insert([newReminder]);
      } catch (err) {
        console.warn('[Zeona Reminders] Supabase insert notice:', err);
      }
    }

    return newReminder;
  },

  updateReminder: async (id, updates) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${REMINDERS_STORAGE_KEY}_${user.id}` : REMINDERS_STORAGE_KEY;

    const existing = get().reminders.find((r) => r.id === id);
    if (!existing) return null;

    let notificationId = existing.notification_id;
    let isScheduled = existing.is_scheduled_on_device;

    const newDate = updates.reminder_date || existing.reminder_date;
    const newTime = updates.reminder_time || existing.reminder_time;
    const newTitle = updates.title || existing.title;
    const newNotes = updates.notes !== undefined ? updates.notes : existing.notes;
    const isEnabled = updates.is_enabled !== undefined ? updates.is_enabled : existing.is_enabled;
    const isCompleted = updates.is_completed !== undefined ? updates.is_completed : existing.is_completed;

    // If disabled or completed, cancel schedule
    if (!isEnabled || isCompleted) {
      if (existing.notification_id) {
        await cancelDeviceReminder(existing.notification_id);
      }
      notificationId = null;
      isScheduled = false;
    } else if (
      updates.reminder_date ||
      updates.reminder_time ||
      updates.title ||
      updates.notes !== undefined ||
      updates.is_enabled === true
    ) {
      // Re-schedule
      const sched = await scheduleDeviceReminder({
        id,
        title: newTitle,
        notes: newNotes,
        dateStr: newDate,
        timeStr: newTime,
        existingNotificationId: existing.notification_id,
      });
      notificationId = sched.notificationId;
      isScheduled = sched.success;
    }

    let updated: Reminder | null = null;
    const nextReminders = get().reminders.map((r) => {
      if (r.id === id) {
        updated = {
          ...r,
          ...updates,
          notification_id: notificationId,
          is_scheduled_on_device: isScheduled,
          updated_at: new Date().toISOString(),
        };
        return updated;
      }
      return r;
    });

    if (updated) {
      set({ reminders: nextReminders });
      AsyncStorage.setItem(storageKey, JSON.stringify(nextReminders)).catch(() => {});

      if (supabase && user) {
        try {
          await supabase.from('reminders').update(updates).eq('id', id).eq('user_id', user.id);
        } catch (err) {
          console.warn('[Zeona Reminders] Supabase update notice:', err);
        }
      }
    }

    return updated;
  },

  deleteReminder: async (id) => {
    const user = useAuthStore.getState().user;
    const storageKey = user ? `${REMINDERS_STORAGE_KEY}_${user.id}` : REMINDERS_STORAGE_KEY;

    const target = get().reminders.find((r) => r.id === id);
    if (target?.notification_id) {
      await cancelDeviceReminder(target.notification_id);
    }

    const nextReminders = get().reminders.filter((r) => r.id !== id);
    set({ reminders: nextReminders });
    AsyncStorage.setItem(storageKey, JSON.stringify(nextReminders)).catch(() => {});

    if (supabase && user) {
      try {
        await supabase.from('reminders').delete().eq('id', id).eq('user_id', user.id);
      } catch (err) {
        console.warn('[Zeona Reminders] Supabase delete notice:', err);
      }
    }
  },

  toggleReminderEnabled: async (id) => {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) return;
    await get().updateReminder(id, { is_enabled: !target.is_enabled });
  },

  toggleReminderCompleted: async (id) => {
    const target = get().reminders.find((r) => r.id === id);
    if (!target) return;
    const nextCompleted = !target.is_completed;
    await get().updateReminder(id, {
      is_completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
    });
  },
}));
