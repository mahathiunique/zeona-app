import { z } from 'zod';

export const AuthCredentialsSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;

export const SignUpSchema = AuthCredentialsSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type SignUpData = z.infer<typeof SignUpSchema>;
