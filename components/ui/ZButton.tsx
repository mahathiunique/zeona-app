/**
 * Zeona — ZButton
 * Premium button with variants, loading, and haptic feedback.
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { triggerHaptic } from '@/utils/haptics';
import { ZText } from './ZText';
import { colors, radii, spacing, durations } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ZButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<ButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: spacing[3],  fontSize: 13 },
  md: { height: 48, paddingH: spacing[5],  fontSize: 15 },
  lg: { height: 56, paddingH: spacing[6],  fontSize: 17 },
};

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: colors.primary,      text: colors.textInverse },
  secondary: { bg: colors.secondaryLight, text: colors.textBrand },
  ghost:     { bg: 'transparent',       text: colors.primary },
  danger:    { bg: colors.error,        text: colors.textInverse },
  outline:   { bg: 'transparent',       text: colors.primary, border: colors.primary },
};

export function ZButton({
  variant = 'primary',
  size = 'md',
  label,
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  onPress,
  ...rest
}: ZButtonProps) {
  const { height, paddingH, fontSize } = sizeMap[size];
  const { bg, text, border } = variantStyles[variant];
  const isDisabled = disabled ?? isLoading;

  const handlePress = useCallback(
    async (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (isDisabled) return;
      triggerHaptic();
      onPress?.(e);
    },
    [isDisabled, onPress],
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: paddingH,
          backgroundColor: bg,
          borderColor: border ?? 'transparent',
          borderWidth: border ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={text} size="small" />
        ) : (
          <>
            {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
            <ZText
              variant={size === 'sm' ? 'label' : 'bodyMedium'}
              color={text}
              style={{ fontSize, fontWeight: '600' }}
            >
              {label}
            </ZText>
            {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
