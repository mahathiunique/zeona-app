/**
 * Zeona — ZText
 * Typed text component that maps to design-system text styles.
 */

import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, textStyles } from '@/constants/theme';

export type TextVariant = keyof typeof textStyles;
export type TextColor = keyof typeof colors;

interface ZTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  italic?: boolean;
}

export function ZText({
  variant = 'bodyMedium',
  color = colors.textPrimary,
  align = 'auto',
  italic = false,
  style,
  children,
  ...rest
}: ZTextProps) {
  return (
    <Text
      style={[
        textStyles[variant],
        { color, textAlign: align },
        italic && styles.italic,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  italic: {
    fontStyle: 'italic',
  },
});
