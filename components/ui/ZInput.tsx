/**
 * Zeona — ZInput
 * Branded text input with label, helper text, and error state.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Pressable,
} from 'react-native';
import { ZText } from './ZText';
import { colors, radii, spacing, fontFamilies, fontSizes } from '@/constants/theme';

interface ZInputProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function ZInput({
  label,
  helper,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...rest
}: ZInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  const borderColor = hasError
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <ZText variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </ZText>
      )}

      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: isFocused
              ? colors.primarySubtle
              : colors.surface,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            rightIcon ? styles.inputWithRight : null,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {rightIcon && (
          <Pressable
            style={styles.iconRight}
            onPress={onRightIconPress}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>

      {(helper || error) && (
        <ZText
          variant="caption"
          color={hasError ? colors.error : colors.textTertiary}
          style={styles.helper}
        >
          {error ?? helper}
        </ZText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[1],
  },
  label: {
    marginBottom: spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.lg,
    height: 52,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing[4],
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.base,
    color: colors.textPrimary,
  },
  inputWithLeft: {
    paddingLeft: spacing[2],
  },
  inputWithRight: {
    paddingRight: spacing[2],
  },
  iconLeft: {
    paddingLeft: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    paddingRight: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  helper: {
    marginTop: spacing[1],
  },
});
