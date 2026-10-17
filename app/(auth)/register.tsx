/**
 * Zeona — Register Screen
 * Create new personal companion account using Supabase Auth with React Hook Form & Zod.
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
import { isSupabaseConfigured } from '@/services/supabase';
import { triggerHaptic } from '@/utils/haptics';
import { signUpSchema, SignUpFormData } from '@/validation/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, continueAsGuest, isLoading, error: authStoreError, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: SignUpFormData) => {
    triggerHaptic();
    setErrorMessage(null);
    clearError();

    const result = await signUp(data.email, data.password, data.name);

    if (!result.success) {
      setErrorMessage(result.error ?? 'Failed to create your account.');
      return;
    }

    if (result.requiresEmailConfirmation) {
      // Supabase email confirmation is enabled; show verification instructions
      setConfirmationSentTo(data.email);
    } else {
      // Direct session granted; proceed to sanctuary
      router.replace('/(tabs)');
    }
  };

  const handleGuestEntry = () => {
    triggerHaptic();
    continueAsGuest();
    router.replace('/(tabs)');
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
            {/* ── Brand Header ───────────────────────────────────────────── */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <ZText style={{ fontSize: 32 }}>🌸</ZText>
              </View>
              <ZText style={styles.wordmark}>Zeona</ZText>
              <ZText variant="bodyLarge" color={colors.textSecondary} align="center">
                Begin your personal journey ✨
              </ZText>
            </View>

            {/* ── Setup Notice if Supabase not connected ─────────────────── */}
            {!isSupabaseConfigured && (
              <View style={styles.configNotice}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ZText variant="bodySmall" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                    Supabase Configuration Required
                  </ZText>
                  <ZText variant="caption" color={colors.textSecondary}>
                    Provide EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file to enable live sign up.
                  </ZText>
                </View>
              </View>
            )}

            {/* ── Confirmation Sent State ─────────────────────────────────── */}
            {confirmationSentTo ? (
              <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
                <View style={styles.successIconWrapper}>
                  <Ionicons name="mail-unread-outline" size={36} color={colors.primary} />
                </View>
                <ZText variant="headingMedium" color={colors.textPrimary} align="center">
                  Verify Your Email
                </ZText>
                <ZText variant="bodyMedium" color={colors.textSecondary} align="center">
                  We sent a confirmation link to:
                </ZText>
                <View style={styles.emailHighlightBox}>
                  <ZText variant="bodyMedium" color={colors.primaryDark} style={{ fontWeight: '600' }}>
                    {confirmationSentTo}
                  </ZText>
                </View>
                <ZText variant="caption" color={colors.textTertiary} align="center">
                  Please tap the link in the email to activate your account and start your journey in Zeona.
                </ZText>

                <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                  <ZButton
                    variant="primary"
                    size="lg"
                    label="Back to Sign In 🌸"
                    fullWidth
                    onPress={() => {
                      triggerHaptic();
                      router.replace('/(auth)/login');
                    }}
                  />
                  <ZButton
                    variant="ghost"
                    size="md"
                    label="Continue as Guest 🌿"
                    fullWidth
                    onPress={handleGuestEntry}
                  />
                </View>
              </ZCard>
            ) : (
              /* ── Register Form Card ─────────────────────────────────────── */
              <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
                <ZText variant="headingMedium" color={colors.textPrimary}>
                  Create Sanctuary
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[1] }}>
                  Your private space for reflections, goals, and inner peace
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

                {/* Name Field */}
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ZInput
                      label="Your name"
                      placeholder="e.g. Mahathi"
                      autoCapitalize="words"
                      autoCorrect={false}
                      value={value}
                      onChangeText={(val) => {
                        onChange(val);
                        if (displayError) {
                          setErrorMessage(null);
                          clearError();
                        }
                      }}
                      onBlur={onBlur}
                      error={errors.name?.message}
                      leftIcon={<Ionicons name="person-outline" size={18} color={colors.textTertiary} />}
                    />
                  )}
                />

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

                {/* Password Field with Toggle */}
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ZInput
                      label="Password"
                      placeholder="At least 6 characters"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={(val) => {
                        onChange(val);
                        if (displayError) {
                          setErrorMessage(null);
                          clearError();
                        }
                      }}
                      onBlur={onBlur}
                      error={errors.password?.message}
                      leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
                      rightIcon={
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={colors.textTertiary}
                        />
                      }
                      onRightIconPress={() => setShowPassword(!showPassword)}
                    />
                  )}
                />

                {/* Confirm Password Field with Toggle */}
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ZInput
                      label="Confirm password"
                      placeholder="Re-enter your password"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={(val) => {
                        onChange(val);
                        if (displayError) {
                          setErrorMessage(null);
                          clearError();
                        }
                      }}
                      onBlur={onBlur}
                      error={errors.confirmPassword?.message}
                      leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textTertiary} />}
                      rightIcon={
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={colors.textTertiary}
                        />
                      }
                      onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  )}
                />

                {/* Submit Action */}
                <View style={{ marginTop: spacing[2] }}>
                  <ZButton
                    variant="primary"
                    size="lg"
                    label="Create Account ✨"
                    fullWidth
                    isLoading={isLoading}
                    onPress={handleSubmit(onSubmit)}
                  />
                </View>

                <ZDivider marginV={spacing[2]} />

                {/* Guest Access Option */}
                <ZButton
                  variant="outline"
                  size="md"
                  label="Continue as Guest 🌿"
                  fullWidth
                  onPress={handleGuestEntry}
                />
              </ZCard>
            )}

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <View style={styles.footer}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/(auth)/login');
                }}
                style={styles.linkRow}
              >
                <ZText variant="bodySmall" color={colors.textSecondary}>
                  Already have an account?{' '}
                  <ZText variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
                    Sign In
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
    paddingVertical: spacing[6],
    justifyContent: 'center',
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: spacing[4],
  },

  brandHeader: {
    alignItems: 'center',
    gap: spacing[1],
  },
  logoBadge: {
    width: 64,
    height: 64,
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

  configNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: radii.lg,
    padding: spacing[3],
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
