/**
 * Zeona — ZScreenWrapper
 * Standard page wrapper: gradient background, safe area, scroll, keyboard.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, layout, spacing } from '@/constants/theme';

interface ZScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  gradient?: boolean;
  gradientColors?: [string, string, ...string[]];
  padH?: boolean;
  padV?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ZScreenWrapper({
  children,
  scrollable = false,
  gradient = true,
  gradientColors = [colors.gradientStart, colors.gradientMid, colors.gradientEnd],
  padH = true,
  padV = true,
  style,
  contentStyle,
}: ZScreenWrapperProps) {
  const content = (
    <View
      style={[
        styles.inner,
        padH && styles.padH,
        padV && styles.padV,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const background = gradient ? (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  ) : (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
    />
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top']}>
      {background}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  padH: {
    paddingHorizontal: layout.screenPaddingH,
  },
  padV: {
    paddingTop: spacing[4],
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
});
