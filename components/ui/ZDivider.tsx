/**
 * Zeona — ZDivider
 * A thin separator line.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface ZDividerProps {
  marginV?: number;
  color?: string;
  style?: ViewStyle;
}

export function ZDivider({
  marginV = spacing[4],
  color = colors.border,
  style,
}: ZDividerProps) {
  return (
    <View
      style={[
        styles.divider,
        { marginVertical: marginV, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
