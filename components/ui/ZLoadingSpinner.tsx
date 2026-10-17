/**
 * Zeona — ZLoadingSpinner
 * Centered loading indicator with optional message.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ZText } from './ZText';
import { colors, spacing } from '@/constants/theme';

interface ZLoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function ZLoadingSpinner({
  message,
  size = 'large',
  color = colors.primary,
  fullScreen = false,
}: ZLoadingSpinnerProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <ZText
          variant="bodySmall"
          color={colors.textSecondary}
          align="center"
          style={styles.message}
        >
          {message}
        </ZText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[3],
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing[2],
  },
});
