import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as nativeUseColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

type ColorsType = typeof Colors.light;

interface ThemeContextType {
  colors: ColorsType;
  isDark: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = nativeUseColorScheme() === 'dark' ? 'dark' : 'light';
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

  const activeTheme = themeMode === 'system' ? systemColorScheme : themeMode;
  const colors = Colors[activeTheme];
  const isDark = activeTheme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        colors,
        isDark,
        theme: activeTheme,
        setTheme: setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
