/**
 * Zeona — Onboarding Flow
 * Welcome hero screen + 3 guided slides introducing journaling, rhythms, and memories.
 * Features persistent completion via AsyncStorage and navigates to authentication.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ZText, ZButton, ZCard, ZBadge } from '@/components/ui';
import { colors, spacing, radii, shadows, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useOnboardingStore } from '@/store/onboardingStore';
import { triggerHaptic } from '@/utils/haptics';

interface SlideData {
  id: number;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  title: string;
  subtitle: string;
  illustrationEmoji: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  highlights: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; sub: string }[];
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    badge: 'Thoughtful Journaling',
    badgeColor: colors.primary,
    badgeBg: colors.primarySubtle,
    title: 'Capture your thoughts',
    subtitle: 'A gentle sanctuary to pour your feelings into words or voice notes, safe from the noise of the world.',
    illustrationEmoji: '📖',
    icon: 'journal-outline',
    highlights: [
      {
        icon: 'pencil-outline',
        text: 'Written Reflections',
        sub: 'Private, distraction-free writing space',
      },
      {
        icon: 'mic-outline',
        text: 'Voice Diaries',
        sub: 'Speak your heart out with audio recordings',
      },
      {
        icon: 'lock-closed-outline',
        text: 'End-to-End Private',
        sub: 'Your deepest thoughts stay strictly yours',
      },
    ],
  },
  {
    id: 2,
    badge: 'Daily Harmony',
    badgeColor: colors.sage,
    badgeBg: colors.sageSubtle,
    title: 'Find your rhythm',
    subtitle: 'Nurture calm routines with mindful mood check-ins, habit streaks, and gentle daily focus.',
    illustrationEmoji: '🌱',
    icon: 'heart-outline',
    highlights: [
      {
        icon: 'happy-outline',
        text: 'Mood Check-ins',
        sub: 'Understand your emotional patterns with grace',
      },
      {
        icon: 'repeat-outline',
        text: 'Habit Consistency',
        sub: 'Celebrate small wins and growing streaks',
      },
      {
        icon: 'checkmark-circle-outline',
        text: 'Mindful Daily Tasks',
        sub: 'Focus on what truly matters each morning',
      },
    ],
  },
  {
    id: 3,
    badge: 'Milestones & Memories',
    badgeColor: colors.accent,
    badgeBg: '#fff1f2',
    title: 'Keep what matters',
    subtitle: 'Preserve cherished moments, photos, and countdown to meaningful celebrations with the people you love.',
    illustrationEmoji: '🌸',
    icon: 'images-outline',
    highlights: [
      {
        icon: 'images-outline',
        text: 'Photo Milestones',
        sub: 'Capture visual snapshots of life’s beauty',
      },
      {
        icon: 'calendar-outline',
        text: 'Important Dates',
        sub: 'Never miss birthdays, anniversaries & self-care days',
      },
      {
        icon: 'sparkles-outline',
        text: 'Personal Reflections',
        sub: 'Look back and realize how far you have bloomed',
      },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboardingStore();

  // 0: Welcome Hero Screen, 1..3: Slides
  const [currentStep, setCurrentStep] = useState<number>(0);

  const handleFinish = async () => {
    triggerHaptic();
    await completeOnboarding();
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    triggerHaptic();
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    triggerHaptic();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const currentSlide = currentStep > 0 ? SLIDES[currentStep - 1] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#faf8f5', '#faf5ff', '#fce7f3', '#ede9fe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveWrapper}>
          {/* ═══════════════════════════════════════════════════════════════════
              STATE 0: WELCOME HERO SCREEN
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 0 && (
            <View style={styles.welcomeContainer}>
              {/* Top brand header */}
              <View style={styles.brandHeader}>
                <View style={styles.brandBadge}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                  <ZText variant="caption" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                    Personal Life Companion
                  </ZText>
                </View>
                <ZText style={styles.wordmark}>Zeona</ZText>
                <ZText variant="bodyLarge" color={colors.textSecondary} align="center">
                  Your everyday life companion 🌸
                </ZText>
              </View>

              {/* Botanical scene artwork card */}
              <ZCard style={styles.sceneCard} elevation="md" radius={radii['3xl']}>
                <LinearGradient
                  colors={['#fdf4ff', '#faf5ff', '#fff1f2']}
                  style={styles.sceneGradient}
                >
                  <View style={styles.botanicalCircle}>
                    <ZText style={styles.botanicalIcon}>🌿</ZText>
                    <ZText style={styles.botanicalMainEmoji}>✨</ZText>
                    <ZText style={styles.botanicalSubEmoji}>🌸</ZText>
                  </View>

                  <View style={styles.scenePillsRow}>
                    <View style={[styles.floatingChip, { backgroundColor: '#f0fdf4' }]}>
                      <ZText variant="caption" color={colors.sage} style={{ fontWeight: '600' }}>
                        🌱 Calm Habits
                      </ZText>
                    </View>
                    <View style={[styles.floatingChip, { backgroundColor: colors.primarySubtle }]}>
                      <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                        🎙️ Voice Diaries
                      </ZText>
                    </View>
                    <View style={[styles.floatingChip, { backgroundColor: '#fff1f2' }]}>
                      <ZText variant="caption" color={colors.accent} style={{ fontWeight: '600' }}>
                        💖 Safe Haven
                      </ZText>
                    </View>
                  </View>
                </LinearGradient>
              </ZCard>

              {/* Tagline & promise */}
              <View style={styles.welcomeCopy}>
                <ZText variant="headingMedium" color={colors.textPrimary} align="center">
                  A gentle space to reflect, bloom, and remember.
                </ZText>
                <ZText variant="bodySmall" color={colors.textSecondary} align="center" style={styles.welcomeSubtext}>
                  Capture daily thoughts, understand your moods, track healthy rhythms, and keep what matters most.
                </ZText>
              </View>

              {/* Welcome Action Button */}
              <View style={styles.welcomeActions}>
                <ZButton
                  variant="primary"
                  size="lg"
                  label="Get Started ✨"
                  fullWidth
                  onPress={() => {
                    triggerHaptic();
                    setCurrentStep(1);
                  }}
                />
                <Pressable
                  onPress={handleSkip}
                  style={styles.skipWelcomeBtn}
                  hitSlop={12}
                >
                  <ZText variant="caption" color={colors.textTertiary}>
                    Already have an account? Sign in
                  </ZText>
                </Pressable>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STATES 1..3: GUIDED ONBOARDING SLIDES
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep > 0 && currentSlide && (
            <View style={styles.slideContainer}>
              {/* Top Navigation Bar: Back & Skip */}
              <View style={styles.slideTopNav}>
                <Pressable
                  onPress={handleBack}
                  hitSlop={12}
                  style={styles.backBtn}
                  accessibilityLabel="Go back to previous slide"
                >
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                  <ZText variant="label" color={colors.textPrimary}>Back</ZText>
                </Pressable>

                {/* Progress Indicators (Pills) */}
                <View style={styles.progressPillsRow}>
                  {[1, 2, 3].map((step) => {
                    const isActive = step === currentStep;
                    const isDone = step < currentStep;
                    return (
                      <View
                        key={step}
                        style={[
                          styles.progressPill,
                          isActive && styles.progressPillActive,
                          isDone && styles.progressPillDone,
                        ]}
                      />
                    );
                  })}
                </View>

                <Pressable
                  onPress={handleSkip}
                  hitSlop={12}
                  style={styles.skipBtn}
                  accessibilityLabel="Skip onboarding"
                >
                  <ZText variant="label" color={colors.textSecondary}>Skip</ZText>
                </Pressable>
              </View>

              {/* Slide Illustration Card */}
              <ZCard style={styles.slideIllustrationCard} elevation="sm" radius={radii['3xl']}>
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
                  style={styles.slideGradient}
                >
                  <View style={styles.slideEmojiCircle}>
                    <ZText style={styles.slideEmojiText}>
                      {currentSlide.illustrationEmoji}
                    </ZText>
                  </View>

                  <ZBadge
                    label={currentSlide.badge}
                    color={currentSlide.badgeColor}
                    backgroundColor={currentSlide.badgeBg}
                    style={{ alignSelf: 'center', marginTop: spacing[3] }}
                  />
                </LinearGradient>
              </ZCard>

              {/* Slide Title & Subtitle */}
              <View style={styles.slideTextSection}>
                <ZText variant="displayMedium" color={colors.textBrand} align="center">
                  {currentSlide.title}
                </ZText>
                <ZText variant="bodyMedium" color={colors.textSecondary} align="center" style={styles.slideSubtitle}>
                  {currentSlide.subtitle}
                </ZText>
              </View>

              {/* Highlights Feature Cards */}
              <View style={styles.highlightsContainer}>
                {currentSlide.highlights.map((h) => (
                  <ZCard key={h.text} style={styles.highlightRow} elevation="xs" radius={radii.xl}>
                    <View style={styles.highlightIconBubble}>
                      <Ionicons name={h.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <ZText variant="label" color={colors.textPrimary}>{h.text}</ZText>
                      <ZText variant="caption" color={colors.textSecondary}>{h.sub}</ZText>
                    </View>
                  </ZCard>
                ))}
              </View>

              {/* Bottom Action Controls */}
              <View style={styles.slideBottomActions}>
                <ZButton
                  variant="primary"
                  size="lg"
                  label={currentStep === 3 ? 'Begin My Journey ✨' : 'Continue →'}
                  fullWidth
                  onPress={handleNext}
                />

                <ZText variant="caption" color={colors.textTertiary} align="center">
                  Step {currentStep} of 3 • Emotional wellness for your everyday
                </ZText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
    justifyContent: 'center',
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  // ── Welcome Screen Styles ──────────────────────────────────────────────────
  welcomeContainer: {
    gap: spacing[5],
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  brandHeader: {
    alignItems: 'center',
    gap: spacing[1.5],
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  wordmark: {
    fontSize: 48,
    fontFamily: fontFamilies.serifBold,
    color: colors.primaryDark,
    letterSpacing: -0.8,
    marginTop: spacing[1],
  },

  sceneCard: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sceneGradient: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    gap: spacing[4],
  },
  botanicalCircle: {
    width: 130,
    height: 130,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
    position: 'relative',
  },
  botanicalMainEmoji: { fontSize: 44 },
  botanicalIcon: {
    fontSize: 26,
    position: 'absolute',
    top: 10,
    left: 12,
  },
  botanicalSubEmoji: {
    fontSize: 26,
    position: 'absolute',
    bottom: 12,
    right: 14,
  },
  scenePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
  },
  floatingChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    ...shadows.xs,
  },

  welcomeCopy: {
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  welcomeSubtext: {
    lineHeight: 20,
    opacity: 0.85,
  },
  welcomeActions: {
    width: '100%',
    gap: spacing[3],
    marginTop: spacing[2],
    alignItems: 'center',
  },
  skipWelcomeBtn: {
    paddingVertical: spacing[2],
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },

  // ── Slides Styles ──────────────────────────────────────────────────────────
  slideContainer: {
    gap: spacing[4],
  },
  slideTopNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing[1],
  },
  skipBtn: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  progressPillsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  progressPill: {
    width: 14,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.borderStrong,
  },
  progressPillActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
  progressPillDone: {
    backgroundColor: colors.primaryLight,
  },

  slideIllustrationCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slideGradient: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  slideEmojiCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  slideEmojiText: { fontSize: 44 },

  slideTextSection: {
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  slideSubtitle: {
    lineHeight: 22,
    opacity: 0.85,
  },

  highlightsContainer: {
    gap: spacing[2.5],
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3.5],
  },
  highlightIconBubble: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },

  slideBottomActions: {
    gap: spacing[2.5],
    marginTop: spacing[3],
  },
});
