import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { BorderRadius, Spacing, Typography } from '../../constants/theme';
import Text from './Text';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  icon,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const showSecureToggle = secureTextEntry;
  const shouldSecureText = secureTextEntry && !isPasswordVisible;

  // Determine styles dynamically based on states
  const borderCol = error
    ? colors.error
    : isFocused
    ? colors.primaryDark
    : colors.border;

  const backgroundCol = isFocused ? colors.backgroundCard : colors.backgroundSecondary;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          variant="caption"
          color={error ? colors.error : colors.textSecondary}
          style={styles.label}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: borderCol,
            backgroundColor: backgroundCol,
          },
          inputStyle,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.text,
            },
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={shouldSecureText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessible={true}
          accessibilityLabel={label || props.placeholder}
          aria-invalid={!!error}
          {...props}
        />

        {showSecureToggle && (
          <Pressable
            onPress={togglePasswordVisibility}
            style={styles.secureToggle}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide Password' : 'Show Password'}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={colors.textSecondary} />
            ) : (
              <Eye size={20} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>

      {(error || helperText) && (
        <Text
          variant="caption"
          color={error ? colors.error : colors.textMuted}
          style={styles.feedbackText}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  iconContainer: {
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: '100%',
    ...Typography.body,
    padding: 0, // Reset default padding
  },
  secureToggle: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackText: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

export default Input;
