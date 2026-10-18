/**
 * Zeona — useTheme Hook
 * Dynamically resolves theme colors based on themeMode preference ('light' | 'dark' | 'system')
 * and the device's system color scheme.
 */

import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, darkColors, palette } from '@/constants/theme';

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const activeColors = isDark ? darkColors : colors;

  return {
    themeMode,
    isDark,
    colors: activeColors,
    palette,
  };
}
