/**
 * Zeona — ZCard
 * Rounded, shadowed surface for content grouping.
 */

import React from 'react';
import { StyleSheet, View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';

interface ZCardProps extends ViewProps {
  elevation?: keyof typeof shadows;
  padding?: number;
  radius?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function ZCard({
  elevation = 'sm',
  padding = spacing[4],
  radius = radii.xl,
  backgroundColor = colors.backgroundCard,
  style,
  children,
  ...rest
}: ZCardProps) {
  return (
    <View
      style={[
        styles.base,
        shadows[elevation],
        {
          padding,
          borderRadius: radius,
          backgroundColor,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 0,
    overflow: 'hidden',
  },
});
