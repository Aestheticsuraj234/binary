import {signUpSchema} from '@binary/shared';
import {Link, router} from 'expo-router';
import {useState} from 'react';
import {StyleSheet, Text} from 'react-native';

import {AuthScreen} from '@/components/auth-screen';
import {PrimaryButton} from '@/components/primary-button';
import {TextField} from '@/components/text-field';
import {authClient} from '@/lib/auth-client';
import {COLORS} from '@/lib/theme';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSignUp() {
    setError('');
    const parsed = signUpSchema.safeParse({name, email, password});
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
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Your AI coworkers will be waiting inside."
      error={error}
    >
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        placeholder="Ada Lovelace"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <PrimaryButton
        title={isPending ? 'Creating account…' : 'Create account'}
        onPress={handleSignUp}
        disabled={isPending}
      />
      <Link href="/sign-in" style={styles.link}>
        Already have an account? <Text style={styles.linkStrong}>Sign in</Text>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  link: {color: COLORS.mutedForeground, textAlign: 'center', marginTop: 8},
  linkStrong: {color: COLORS.foreground},
});
