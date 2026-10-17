/**
 * Zeona — Login Screen
 * Accessible, elegant authentication using Supabase Auth with React Hook Form & Zod.
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
import { loginSchema, LoginFormData } from '@/validation/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, continueAsGuest, isLoading, error: authStoreError, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormData) => {
    triggerHaptic();
    setErrorMessage(null);
    clearError();

    const result = await signIn(data.email, data.password);

    if (!result.success) {
      setErrorMessage(result.error ?? 'Invalid email or password.');
      return;
    }

    // Never simulate — navigation only triggers on confirmed Supabase session
    router.replace('/(tabs)');
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
                Welcome back to your calm sanctuary
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
                    Provide EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file to enable live authentication.
                  </ZText>
                </View>
              </View>
            )}

            {/* ── Login Card ─────────────────────────────────────────────── */}
            <ZCard style={styles.card} elevation="sm" radius={radii['2xl']}>
              <ZText variant="headingMedium" color={colors.textPrimary}>
                Sign In
              </ZText>
              <ZText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing[1] }}>
                Continue your daily journey, tasks, and reflections
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

              {/* Email Field with Controller */}
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

              {/* Password Field with Controller & Visibility Toggle */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ZInput
                    label="Password"
                    placeholder="••••••••"
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

              {/* Forgot Password Link */}
              <View style={styles.forgotRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    router.push('/(auth)/forgot-password');
                  }}
                  hitSlop={8}
                >
                  <ZText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                    Forgot password?
                  </ZText>
                </Pressable>
              </View>

              {/* Submit Action */}
              <View style={{ marginTop: spacing[1] }}>
                <ZButton
                  variant="primary"
                  size="lg"
                  label="Sign In ✨"
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

            {/* ── Footer Navigation ──────────────────────────────────────── */}
            <View style={styles.footer}>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/(auth)/register');
                }}
                style={styles.linkRow}
              >
                <ZText variant="bodySmall" color={colors.textSecondary}>
                  Don't have an account?{' '}
                  <ZText variant="bodySmall" color={colors.primary} style={{ fontWeight: '600' }}>
                    Create Sanctuary
                  </ZText>
                </ZText>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/onboarding');
                }}
                style={{ marginTop: spacing[1] }}
                hitSlop={8}
              >
                <ZText variant="caption" color={colors.textTertiary}>
                  Replay welcome & onboarding
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

  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -spacing[1],
  },

  footer: {
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  linkRow: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
});
