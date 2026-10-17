/**
 * Zeona — ZEmptyState
 * Placeholder for screens/sections with no content yet.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ZText } from './ZText';
import { ZButton } from './ZButton';
import { colors, spacing } from '@/constants/theme';

interface ZEmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ZEmptyState({
  emoji = '✨',
  title,
  subtitle,
  actionLabel,
  onAction,
}: ZEmptyStateProps) {
  return (
    <View style={styles.container}>
      <ZText style={styles.emoji}>{emoji}</ZText>
      <ZText variant="headingMedium" color={colors.textPrimary} align="center">
        {title}
      </ZText>
      {subtitle && (
        <ZText
          variant="bodyMedium"
          color={colors.textSecondary}
          align="center"
          style={styles.subtitle}
        >
          {subtitle}
        </ZText>
      )}
      {actionLabel && onAction && (
        <ZButton
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing[2],
  },
  subtitle: {
    marginTop: spacing[1],
    maxWidth: 280,
  },
  action: {
    marginTop: spacing[4],
  },
});
