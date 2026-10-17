/**
 * Zeona — Safe Haptics Utility
 * Silently no-ops on web and devices without haptic engines.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function triggerHaptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Graceful no-op
  }
}
