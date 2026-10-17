import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing } from '../../constants/theme';
import { AuthCredentialsSchema, AuthCredentials } from '../../types/auth';
import { AuthService } from '../../services/firebase/auth';
import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthCredentials>({
    resolver: zodResolver(AuthCredentialsSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AuthCredentials) => {
    setLoading(true);
    try {
      await AuthService.signIn(data);
      // Success will trigger RootLayout redirect automatically
    } catch (error) {
      Alert.alert('Sign In Failed', (error as Error).message);
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
          <Text variant="h2" color={colors.text}>Welcome Back</Text>
          <Text variant="bodySecondary" color={colors.textSecondary}>
            Sign in to continue your daily companion journey
          </Text>
        </View>

        <Card style={styles.card} variant="elevated">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title="Reset Password"
            variant="ghost"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.resetButton}
          />

          <Button
            title="Sign In"
            variant="primary"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title="Don't have an account? Sign Up"
            variant="ghost"
            onPress={() => router.push('/(auth)/register')}
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
  resetButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingVertical: 0,
    paddingHorizontal: Spacing.xs,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
});
