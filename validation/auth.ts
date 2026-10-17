/**
 * Zeona — Auth Validation Schemas (Zod)
 * Validates inputs for Sign In, Sign Up, Forgot Password, and Reset Password.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password cannot exceed 72 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .transform((val) => val.trim()),
    email: z
      .string()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address')
      .transform((val) => val.trim().toLowerCase()),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase()),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
