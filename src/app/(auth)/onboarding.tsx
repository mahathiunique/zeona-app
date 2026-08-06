import { useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/theme';
import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  const onboardingPages = [
    {
      title: 'Plan your day',
      description: 'Quiet your mind. Organize tasks, track daily habits, and review your schedule all in one calm place.',
      color: colors.primaryLight,
      emoji: '🧘',
    },
    {
      title: 'Capture your life',
      description: 'Document your days with written reflections, voice logs, doodles, and key photo memories.',
      color: colors.accentPink,
      emoji: '🎨',
    },
    {
      title: 'Grow every day',
      description: 'Keep up streaks, earn peaceful achievements, and review cozy personal insights about your journey.',
      color: colors.accentYellow,
      emoji: '✨',
    },
  ];

  const handleNext = () => {
    if (currentPage < onboardingPages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      router.replace('/(auth)/login');
    } catch {
      // Safe fallback
      router.replace('/(auth)/login');
    }
  };

  const page = onboardingPages[currentPage];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {currentPage < 2 ? (
          <Button
            title="Skip"
            variant="ghost"
            onPress={completeOnboarding}
            style={styles.skipButton}
          />
        ) : (
          <View style={styles.skipButtonPlaceholder} />
        )}
      </View>

      <View style={styles.carouselContainer}>
        <View style={styles.pageContent}>
          {/* Main Decorative Card */}
          <Card
            variant="flat"
            style={[styles.illustrationCard, { backgroundColor: page.color }]}
          >
            <Text style={styles.emoji}>{page.emoji}</Text>
          </Card>

          {/* Title & Description */}
          <View style={styles.textBox}>
            <Text variant="h2" align="center" style={styles.title}>
              {page.title}
            </Text>
            <Text
              variant="body"
              align="center"
              color={colors.textSecondary}
              style={styles.description}
            >
              {page.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {onboardingPages.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === currentPage ? colors.primaryDark : colors.border,
                  width: idx === currentPage ? 16 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          {currentPage > 0 ? (
            <Button
              title="Back"
              variant="outline"
              onPress={handleBack}
              style={styles.navButton}
            />
          ) : (
            <View style={styles.navButtonPlaceholder} />
          )}

          <Button
            title={currentPage === 2 ? 'Get Started' : 'Next'}
            variant="primary"
            onPress={handleNext}
            style={styles.actionButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  skipButton: {
    minHeight: 40,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: Spacing.md,
  },
  skipButtonPlaceholder: {
    height: 40,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  pageContent: {
    width: width - Spacing.xxxl * 2,
    alignItems: 'center',
    gap: Spacing.xxl,
  },
  illustrationCard: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
    ...Platform.select({
      ios: { lineHeight: 82 },
      android: { lineHeight: 82 },
    }),
  },
  textBox: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontWeight: '800',
  },
  description: {
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.xxl,
    gap: Spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.round,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    flex: 1,
    marginRight: Spacing.md,
  },
  navButtonPlaceholder: {
    flex: 1,
  },
  actionButton: {
    flex: 1,
  },
});
