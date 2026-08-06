import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing } from '../../constants/theme';
import { AuthService } from '../../services/firebase/auth';
import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

const ResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResetData = z.infer<typeof ResetSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetData>({
    resolver: zodResolver(ResetSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetData) => {
    setLoading(true);
    try {
      await AuthService.sendPasswordReset(data.email);
      Alert.alert(
        'Email Sent',
        'Password reset link has been sent to your email. Please check your inbox.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/login') }]
      );
    } catch (error) {
      Alert.alert('Reset Failed', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h2" color={colors.text}>Reset Password</Text>
          <Text variant="bodySecondary" color={colors.textSecondary}>
            {"Enter your email address and we'll send you a link to reset your password."}
          </Text>
        </View>

        <Card style={styles.card} variant="elevated">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="Enter your registered email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Button
            title="Send Reset Link"
            variant="primary"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title="Back to Sign In"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xxxl,
    gap: Spacing.xs,
  },
  card: {
    gap: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
});
