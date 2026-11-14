import {z} from 'zod';

// The web and mobile forms both validate with these schemas, so a user sees
// the same messages on every device.

const email = z.email('Enter a valid email address.');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email,
  password,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
