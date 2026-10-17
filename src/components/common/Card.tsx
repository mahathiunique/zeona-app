import { View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface CardProps extends ViewProps {
  variant?: 'flat' | 'elevated' | 'outlined';
  paddingSize?: keyof typeof Spacing;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'elevated',
  paddingSize = 'lg',
  style,
  ...props
}: CardProps) {
  const { colors, isDark } = useTheme();

  const getCardStyles = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: BorderRadius.md,
      padding: Spacing[paddingSize],
      backgroundColor: colors.backgroundCard,
    };

    switch (variant) {
      case 'flat':
        return {
          ...base,
          backgroundColor: colors.backgroundSecondary,
        };
      case 'elevated':
        return {
          ...base,
          ...(isDark
            ? {
                borderWidth: 1,
                borderColor: colors.border,
              }
            : Shadows.soft),
        };
      case 'outlined':
        return {
          ...base,
          borderWidth: 1.5,
          borderColor: colors.border,
        };
    }
  };

  return (
    <View
      style={[getCardStyles(), style]}
      {...props}
    >
      {children}
    </View>
  );
}

export default Card;
