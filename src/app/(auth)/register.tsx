import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../theme/ThemeContext';
import { Spacing } from '../../constants/theme';
import { SignUpSchema, SignUpData } from '../../types/auth';
import { AuthService } from '../../services/firebase/auth';
import { UserRepository } from '../../services/firebase/repositories/userRepository';
import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignUpData) => {
    setLoading(true);
    try {
      const user = await AuthService.signUp({ email: data.email, password: data.password });
      
      // Save profile metadata inside Cloud Firestore users/{uid}
      await UserRepository.saveUserProfile({
        uid: user.uid,
        email: user.email || data.email,
        displayName: data.name,
        photoURL: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Redirects automatically in root layout
    } catch (error) {
      Alert.alert('Registration Failed', (error as Error).message);
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
          <Text variant="h2" color={colors.text}>Create Account</Text>
          <Text variant="bodySecondary" color={colors.textSecondary}>
            Begin your journey towards calm and organized daily living
          </Text>
        </View>

        <Card style={styles.card} variant="elevated">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter your name"
                autoCapitalize="words"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.name?.message}
              />
            )}
          />

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
                placeholder="Choose a password (min 6 chars)"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            title="Sign Up"
            variant="primary"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title="Already have an account? Sign In"
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
