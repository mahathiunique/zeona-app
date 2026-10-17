import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';

// Keep the splash screen visible while loading resources
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments() as string[];
  const router = useRouter();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  // Check local onboarding status on startup
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(value === 'true');
      } catch {
        setHasOnboarded(false);
      }
    };
    checkOnboarding();
  }, []);

  const isAppLoading = authLoading || hasOnboarded === null;

  // Handle redirects based on authentication and onboarding state
  useEffect(() => {
    if (isAppLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentScreen = segments[1];

    if (!hasOnboarded) {
      if (currentScreen !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (!isAuthenticated) {
      if (inAuthGroup) {
        // Allow user to stay on login, register or forgot password screens
        const allowedScreens = ['login', 'register', 'forgot-password'];
        if (currentScreen && !allowedScreens.includes(currentScreen)) {
          router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(auth)/login');
      }
    } else {
      // Authenticated user
      if (inAuthGroup) {
        router.replace('/(main)/home');
      }
    }
  }, [isAuthenticated, isAppLoading, hasOnboarded, segments, router]);

  // Hide splash screen when initial loading is done
  useEffect(() => {
    if (!isAppLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAppLoading]);

  if (isAppLoading) {
    // Keep showing layout frame, app/index.tsx acts as the animated splash screen
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primaryDark} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
