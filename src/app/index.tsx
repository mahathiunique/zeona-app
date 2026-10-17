import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { Spacing } from '../constants/theme';
import Text from '../components/common/Text';

export default function IndexRedirectScreen() {
  const { colors } = useTheme();

  // Entrance shared values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  // Trigger subtle animations on mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1200 });
    scale.value = withTiming(1, { duration: 1200 });
  }, [opacity, scale]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.logoBox, animatedStyles]}>
        <Text variant="h1" align="center" color={colors.primaryDark} style={styles.brandName}>
          ZEONA
        </Text>
        <Text variant="subtitle" align="center" color={colors.textSecondary} style={styles.tagline}>
          Your Daily Life Companion
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  brandName: {
    letterSpacing: 3,
    fontWeight: '800',
  },
  tagline: {
    letterSpacing: 0.5,
  },
});
