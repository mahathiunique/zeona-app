import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { BorderRadius, Spacing } from '../../constants/theme';
import Text from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!disabled && !loading) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  // Compute theme styles
  const getButtonStyles = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      borderRadius: BorderRadius.md,
      minHeight: 52,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: colors.primary,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.backgroundSecondary,
        };
      case 'accent':
        return {
          ...base,
          backgroundColor: colors.accentPink,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
        };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted;
    
    switch (variant) {
      case 'primary':
        return '#1E1C1A'; // Darker color for high contrast on light blue primary
      case 'secondary':
        return colors.text;
      case 'accent':
        return '#1E1C1A';
      case 'outline':
        return colors.text;
      case 'ghost':
        return colors.primaryDark;
    }
  };

  const isButtonDisabled = disabled || loading;
  const textColor = getTextColor();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isButtonDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isButtonDisabled, busy: loading }}
      style={[
        getButtonStyles(),
        disabled && { opacity: 0.5 },
        animatedStyle,
        style as any,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <React.Fragment>
              {icon}
              <Animated.View style={{ width: Spacing.sm }} />
            </React.Fragment>
          )}
          
          <Text
            variant="button"
            color={textColor}
            style={styles.text}
          >
            {title}
          </Text>

          {icon && iconPosition === 'right' && (
            <React.Fragment>
              <Animated.View style={{ width: Spacing.sm }} />
              {icon}
            </React.Fragment>
          )}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  text: {
    letterSpacing: 0.2,
  },
});

export default Button;
