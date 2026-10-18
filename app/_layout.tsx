/**
 * Zeona — Root Layout
 * Initializes fonts, splash screen, auth, onboarding status, and root navigator.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { useZeonaFonts } from '@/hooks/useFonts';
import { useAuthStore } from '@/store/authStore';
import { useJournalStore } from '@/store/journalStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ZLoadingSpinner } from '@/components/ui';
import { colors } from '@/constants/theme';

// Keep splash screen visible while fonts and auth load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const { fontsLoaded, fontError } = useZeonaFonts();
  const {
    session,
    isInitialized,
    isGuest,
    isPasswordRecovery,
    initialize,
  } = useAuthStore();
  const initJournal = useJournalStore((s) => s.initialize);
  const initCalendar = useCalendarStore((s) => s.initialize);
  const {
    hasCompletedOnboarding,
    isLoading: isOnboardingLoading,
    initialize: initOnboarding,
  } = useOnboardingStore();

  useEffect(() => {
    initialize();
    initJournal();
    initCalendar();
    initOnboarding();
  }, [initialize, initJournal, initCalendar, initOnboarding]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && isInitialized && !isOnboardingLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isInitialized, isOnboardingLoading]);

  // Route protection and authentication gating
  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (!isInitialized || isOnboardingLoading) return;

    // 1. First-time users see onboarding
    if (hasCompletedOnboarding === false) {
      if (segments[0] !== 'onboarding' && segments[0] !== '(auth)') {
        router.replace('/onboarding');
      }
      return;
    }

    const segs = segments as string[];

    // 2. Password recovery mode directs to reset password screen
    if (isPasswordRecovery && segs[1] !== 'reset-password') {
      router.replace('/(auth)/reset-password');
      return;
    }

    // 3. Unauthenticated users (no session and not guest) cannot access protected tabs
    const isAuthed = Boolean(session || isGuest);
    if (!isAuthed) {
      if (segs[0] === '(tabs)' || !segs[0] || segs[0] === 'journal' || segs[0] === 'tasks' || segs[0] === 'habits') {
        router.replace('/(auth)/login');
      }
    } else if (session) {
      // 4. Authenticated users on login/register should go to tabs
      if (segs[0] === '(auth)' && segs[1] !== 'reset-password') {
        router.replace('/(tabs)');
      }
    }
  }, [
    isInitialized,
    isOnboardingLoading,
    hasCompletedOnboarding,
    session,
    isGuest,
    isPasswordRecovery,
    segments,
    router,
  ]);

  if (!fontsLoaded && !fontError) {
    return null; // Splash screen still visible
  }

  if (!isInitialized || isOnboardingLoading) {
    return <ZLoadingSpinner fullScreen message="Starting Zeona…" />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="journal/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="journal/editor" options={{ headerShown: false }} />
          <Stack.Screen name="journal/voice" options={{ headerShown: false }} />
          <Stack.Screen name="tasks/index" options={{ headerShown: false }} />
          <Stack.Screen name="habits/index" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
