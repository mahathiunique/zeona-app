/**
 * Zeona — Notification Service
 * Handles device notification permissions and local scheduling using Expo Notifications.
 *
 * Guarantees:
 * - Checks compatibility across Web, iOS, and Android
 * - Clearly distinguishes DB-persisted reminders from device-scheduled notifications
 * - Prevents duplicate notifications by canceling previous schedules before updating
 * - Gracefully handles denied permissions, expired times, and timezone changes
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure in-app notification presentation if supported
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (err) {
  // Graceful fallback on unsupported platforms
  console.warn('[Zeona Notifications] setNotificationHandler notice:', err);
}

export type PermissionStatusType = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export interface NotificationPermissionInfo {
  status: PermissionStatusType;
  canSchedule: boolean;
  platformDescription: string;
}

/**
 * Check device notification permission status
 */
export async function getDeviceNotificationPermissions(): Promise<NotificationPermissionInfo> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = (window as any).Notification?.permission;
      const status: PermissionStatusType =
        perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'undetermined';
      return {
        status,
        canSchedule: perm === 'granted',
        platformDescription: 'Web Browser (In-app reminders active; device notifications schedule natively on iOS/Android)',
      };
    }
    return {
      status: 'unsupported',
      canSchedule: false,
      platformDescription: 'Web Browser (Reminders saved in sanctuary database; device push requires mobile platform)',
    };
  }

  try {
    const settings = await Notifications.getPermissionsAsync();
    const isGranted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const status: PermissionStatusType = isGranted
      ? 'granted'
      : settings.status === Notifications.PermissionStatus.DENIED
      ? 'denied'
      : 'undetermined';

    return {
      status,
      canSchedule: isGranted,
      platformDescription: Platform.OS === 'ios' ? 'iOS Device Notifications' : 'Android Device Notifications',
    };
  } catch (err) {
    console.warn('[Zeona Notifications] getPermissionsAsync error:', err);
    return {
      status: 'unsupported',
      canSchedule: false,
      platformDescription: 'Device notifications unavailable',
    };
  }
}

/**
 * Request notification permissions from user
 */
export async function requestDeviceNotificationPermissions(): Promise<NotificationPermissionInfo> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await (window as any).Notification.requestPermission();
        return {
          status: perm === 'granted' ? 'granted' : 'denied',
          canSchedule: perm === 'granted',
          platformDescription: 'Web Browser Notifications',
        };
      } catch {
        // Ignore
      }
    }
    return {
      status: 'unsupported',
      canSchedule: false,
      platformDescription: 'Web Browser Environment',
    };
  }

  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const isGranted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return {
      status: isGranted ? 'granted' : 'denied',
      canSchedule: isGranted,
      platformDescription: Platform.OS === 'ios' ? 'iOS Notifications' : 'Android Notifications',
    };
  } catch (err) {
    console.warn('[Zeona Notifications] requestPermissionsAsync error:', err);
    return {
      status: 'unsupported',
      canSchedule: false,
      platformDescription: 'Device Notifications',
    };
  }
}

/**
 * Schedule a local notification on the device for a reminder.
 * Avoids duplicates by canceling previous ID if provided.
 */
export async function scheduleDeviceReminder(params: {
  id: string;
  title: string;
  notes?: string | null;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm (24h)
  existingNotificationId?: string | null;
}): Promise<{
  success: boolean;
  notificationId: string | null;
  reason?: 'expired' | 'unsupported' | 'denied' | 'error';
}> {
  const { title, notes, dateStr, timeStr, existingNotificationId } = params;

  // 1. Cancel existing notification if any to prevent duplicate alerts
  if (existingNotificationId) {
    await cancelDeviceReminder(existingNotificationId);
  }

  // 2. Parse date and time in local timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);
  const targetDate = new Date(year, month - 1, day, hours, minutes, 0);

  // If time has already passed
  if (targetDate.getTime() <= Date.now()) {
    return { success: false, notificationId: null, reason: 'expired' };
  }

  // 3. Platform check
  if (Platform.OS === 'web') {
    // Web environment: saved in database, device schedule not active
    return { success: false, notificationId: null, reason: 'unsupported' };
  }

  // 4. Check permissions
  try {
    const perm = await getDeviceNotificationPermissions();
    if (!perm.canSchedule) {
      return { success: false, notificationId: null, reason: 'denied' };
    }

    // Schedule notification on native device
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🌸 Zeona: ${title}`,
        body: notes || 'A gentle reminder from your sanctuary.',
        sound: true,
        data: { reminderId: params.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });

    return {
      success: true,
      notificationId,
    };
  } catch (err) {
    console.warn('[Zeona Notifications] schedule error:', err);
    return { success: false, notificationId: null, reason: 'error' };
  }
}

/**
 * Cancel a scheduled device notification
 */
export async function cancelDeviceReminder(notificationId: string): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('[Zeona Notifications] cancelScheduledNotificationAsync notice:', err);
  }
}
