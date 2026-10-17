/**
 * Zeona — ZBadge
 * Small tag / label for moods, categories, status.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ZText } from './ZText';
import { colors, radii, spacing } from '@/constants/theme';

interface ZBadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function ZBadge({
  label,
  color = colors.primary,
  backgroundColor = colors.primarySubtle,
  style,
}: ZBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <ZText variant="caption" color={color} style={styles.text}>
        {label}
      </ZText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[0.5],
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
