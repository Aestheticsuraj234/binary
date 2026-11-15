import {signInSchema} from '@binary/shared';
import {Link} from 'expo-router';
import {useState} from 'react';
import {StyleSheet, Text} from 'react-native';

import {AuthScreen} from '@/components/auth-screen';
import {PrimaryButton} from '@/components/primary-button';
import {TextField} from '@/components/text-field';
import {authClient} from '@/lib/auth-client';
import {COLORS} from '@/lib/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSignIn() {
    setError('');
    const parsed = signInSchema.safeParse({email, password});
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }

    setIsPending(true);
    // `.catch(() => null)` turns "the server is down" into a normal failure.
    const result = await authClient.signIn.email(parsed.data).catch(() => null);
    setIsPending(false);

    if (!result) {
      setError('Could not reach the server. Is the API running?');
      return;
    }
    if (result.error) {
      setError(result.error.message ?? 'Could not sign in.');
      return;
    }
    // Signed in: the root layout now shows the app instead.
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to your Binary workspace."
      error={error}
    >
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
        autoComplete="current-password"
      />
      <PrimaryButton
        title={isPending ? 'Signing in…' : 'Sign in'}
        onPress={handleSignIn}
        disabled={isPending}
      />
      <Link href="/sign-up" style={styles.link}>
        New to Binary? <Text style={styles.linkStrong}>Create an account</Text>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  link: {color: COLORS.mutedForeground, textAlign: 'center', marginTop: 8},
  linkStrong: {color: COLORS.foreground},
});
