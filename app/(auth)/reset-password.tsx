/**
 * Zeona — Reset Password Screen
 * Sets a new password using Supabase Auth updateUser with validation & visibility toggles.
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
import { resetPasswordSchema, ResetPasswordFormData } from '@/validation/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, isLoading, error: authStoreError, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    triggerHaptic();
    setErrorMessage(null);
    clearError();

    const result = await updatePassword(data.password);

    if (!result.success) {
      setErrorMessage(result.error ?? 'Failed to update your password. Please try again.');
      return;
    }

    setIsSuccess(true);
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
                <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
              </View>
              <ZText style={styles.wordmark}>Zeona</ZText>
              <ZText variant="bodyLarge" color={colors.textSecondary} align="center">
                Secure your sanctuary
              </ZText>
            </View>

            {/* ── Main Card ──────────────────────────────────────────────── */}
            {isSuccess ? (
              <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
                <View style={styles.successIconWrapper}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
                </View>
                <ZText variant="headingMedium" color={colors.textPrimary} align="center">
                  Password Updated! ✨
                </ZText>
                <ZText variant="bodyMedium" color={colors.textSecondary} align="center">
                  Your new password is now active and your sanctuary is secure.
                </ZText>

                <View style={{ marginTop: spacing[3], gap: spacing[2] }}>
                  <ZButton
                    variant="primary"
                    size="lg"
                    label="Enter Sanctuary 🌸"
                    fullWidth
                    onPress={() => {
                      triggerHaptic();
                      router.replace('/(tabs)');
                    }}
                  />
                  <ZButton
                    variant="outline"
                    size="md"
                    label="Sign In Again"
                    fullWidth
                    onPress={() => {
                      triggerHaptic();
                      router.replace('/(auth)/login');
                    }}
                  />
                </View>
              </ZCard>
            ) : (
              <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
                <ZText variant="headingMedium" color={colors.textPrimary}>
                  Reset Password
                </ZText>
                <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[1] }}>
                  Choose a new strong password for your Zeona account.
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

                {/* New Password Field */}
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ZInput
                      label="New password"
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

                {/* Confirm Password Field */}
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ZInput
                      label="Confirm new password"
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
                    label="Update Password ✨"
                    fullWidth
                    isLoading={isLoading}
                    onPress={handleSubmit(onSubmit)}
                  />
                </View>

                <ZDivider marginV={spacing[2]} />

                <ZButton
                  variant="ghost"
                  size="md"
                  label="Cancel & Back to Sign In"
                  fullWidth
                  onPress={() => {
                    triggerHaptic();
                    router.replace('/(auth)/login');
                  }}
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
                  Remember your password?{' '}
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
    paddingVertical: spacing[4],
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
    backgroundColor: '#dcfce7',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
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
