/**
 * Zeona — Forgot Password Screen
 * Initiates Supabase password recovery email with validation & reassuring feedback.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { ZText, ZButton, ZInput, ZCard, ZDivider } from '@/components/ui';
import { colors, spacing, radii, fontFamilies } from '@/constants/theme';
import { layout } from '@/constants/spacing';
import { useAuthStore } from '@/store/authStore';
import { triggerHaptic } from '@/utils/haptics';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/validation/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPasswordForEmail, isLoading, error: authStoreError, clearError } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    triggerHaptic();
    setErrorMessage(null);
    clearError();

    const result = await resetPasswordForEmail(data.email);

    if (!result.success) {
      setErrorMessage(result.error ?? 'Failed to send password reset email.');
      return;
    }

    setEmailSentTo(data.email);
  };

  const displayError = errorMessage || authStoreError;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#faf8f5', '#faf5ff', '#ede9fe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.responsiveContainer}>
            {/* ── Top Bar ─────────────────────────────────────────────────── */}
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.back();
              }}
              style={styles.backButton}
              hitSlop={8}
              accessibilityLabel="Back to sign in"
            >
              <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
              <ZText variant="bodySmall" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                Back
              </ZText>
            </Pressable>

            {/* ── Brand Header ───────────────────────────────────────────── */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Ionicons name="key-outline" size={28} color={colors.primary} />
              </View>
              <ZText style={styles.wordmark}>Zeona</ZText>
              <ZText variant="bodyLarge" color={colors.textSecondary} align="center">
                Recover your sanctuary access
              </ZText>
            </View>

            {/* ── Main Card ──────────────────────────────────────────────── */}
            {emailSentTo ? (
              <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
                <View style={styles.successIconWrapper}>
                  <Ionicons name="paper-plane-outline" size={32} color={colors.primary} />
                </View>
                <ZText variant="headingMedium" color={colors.textPrimary} align="center">
                  Reset Link Sent 💌
                </ZText>
                <ZText variant="bodyMedium" color={colors.textSecondary} align="center">
                  We've sent recovery instructions to:
                </ZText>
                <View style={styles.emailHighlightBox}>
                  <ZText variant="bodyMedium" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                    {emailSentTo}
                  </ZText>
                </View>
                <ZText variant="caption" color={colors.textTertiary} align="center">
                  Please check your inbox (and spam folder) and click the link to choose a new password.
                </ZText>

                <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                  <ZButton
                    variant="primary"
                    size="lg"
                    label="Return to Sign In 🌸"
                    fullWidth
                    onPress={() => {
                      triggerHaptic();
                      router.replace('/(auth)/login');
                    }}
                  />
                  <ZButton
                    variant="ghost"
                    size="md"
                    label="Send to another email"
                    fullWidth
                    onPress={() => setEmailSentTo(null)}
                  />
                </View>
              </ZCard>
            ) : (
              <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
                <ZText variant="headingMedium" color={colors.textPrimary}>
                  Forgot Password?
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[1] }}>
                  Enter your email address and we'll send you a link to reset your password.
                </ZText>

                {/* Error Banner */}
                {displayError && (
                  <View style={styles.errorBox} accessibilityRole="alert">
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <ZText variant="caption" color={colors.error} style={{ flex: 1 }}>
                      {displayError}
                    </ZText>
                  </View>
                )}

                {/* Email Field */}
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ZInput
                      label="Email address"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      value={value}
                      onChangeText={(val) => {
                        onChange(val);
                        if (displayError) {
                          setErrorMessage(null);
                          clearError();
                        }
                      }}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textTertiary} />}
                    />
                  )}
                />

                {/* Submit Action */}
                <View style={{ marginTop: spacing[2] }}>
                  <ZButton
                    variant="primary"
                    size="lg"
                    label="Send Reset Link 🌸"
                    fullWidth
                    isLoading={isLoading}
                    onPress={handleSubmit(onSubmit)}
                  />
                </View>

                <ZDivider marginV={spacing[2]} />

                <ZButton
                  variant="ghost"
                  size="md"
                  label="Remember password? Sign In"
                  fullWidth
                  onPress={() => {
                    triggerHaptic();
                    router.push('/(auth)/login');
                  }}
                />
              </ZCard>
            )}

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/(auth)/register');
                }}
                style={styles.linkRow}
              >
                <ZText variant="bodySmall" color={colors.textSecondary}>
                  Need a new account?{' '}
                  <ZText variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
                    Create Sanctuary
                  </ZText>
                </ZText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
    justifyContent: 'center',
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: spacing[4],
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing[1],
  },

  brandHeader: {
    alignItems: 'center',
    gap: spacing[1],
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing[1],
  },
  wordmark: {
    fontSize: 42,
    fontFamily: fontFamilies.serifBold,
    color: colors.primaryDark,
    letterSpacing: -0.6,
  },

  card: {
    gap: spacing[3],
    padding: spacing[5],
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.errorSubtle,
    padding: spacing[3],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },

  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primarySubtle,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },

  emailHighlightBox: {
    alignSelf: 'center',
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
  },

  footer: {
    alignItems: 'center',
    marginTop: spacing[2],
  },
  linkRow: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
});
