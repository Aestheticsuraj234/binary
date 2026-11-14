'use client';

import {signUpSchema} from '@binary/shared';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

import {FormField} from '@/components/auth/form-field';
import {Button} from '@/components/ui/button';
import {authClient} from '@/lib/auth-client';

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const form = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }

    setIsPending(true);
    // `.catch(() => null)` turns "the server is down" into a normal failure.
    const result = await authClient.signUp.email(parsed.data).catch(() => null);
    setIsPending(false);

    if (!result) {
      setError('Could not reach the server. Is the API running?');
      return;
    }
    if (result.error) {
      setError(result.error.message ?? 'Could not create your account.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Your AI coworkers will be waiting inside.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          name="name"
          label="Name"
          autoComplete="name"
          placeholder="Ada Lovelace"
        />
        <FormField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <FormField
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-10 w-full" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-foreground hover:text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
