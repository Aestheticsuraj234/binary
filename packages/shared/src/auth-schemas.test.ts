import {describe, expect, it} from 'vitest';

import {signInSchema, signUpSchema} from './auth-schemas';

describe('signUpSchema', () => {
  it('accepts a valid sign-up form', () => {
    const result = signUpSchema.safeParse({
      name: 'Suraj',
      email: 'suraj@example.com',
      password: 'correct-horse',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a short password with a friendly message', () => {
    const result = signUpSchema.safeParse({
      name: 'Suraj',
      email: 'suraj@example.com',
      password: 'short',
    });

    expect(result.error?.issues[0]?.message).toBe(
      'Password must be at least 8 characters.',
    );
  });

  it('rejects an invalid email', () => {
    const result = signUpSchema.safeParse({
      name: 'Suraj',
      email: 'not-an-email',
      password: 'correct-horse',
    });

    expect(result.success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('requires a password', () => {
    const result = signInSchema.safeParse({
      email: 'suraj@example.com',
      password: '',
    });

    expect(result.error?.issues[0]?.message).toBe('Enter your password.');
  });
});
