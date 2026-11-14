import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS} from '@/lib/theme';

interface AuthScreenProps {
  title: string;
  subtitle: string;
  error: string;
  children: React.ReactNode;
}

/** Shared frame for the sign-in and sign-up screens. */
export function AuthScreen({
  title,
  subtitle,
  error,
  children,
}: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>01</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
          {error !== '' && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.background},
  flex: {flex: 1},
  content: {flexGrow: 1, justifyContent: 'center', padding: 24, gap: 8},
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {color: COLORS.primaryForeground, fontWeight: '700'},
  title: {color: COLORS.foreground, fontSize: 28, fontWeight: '600'},
  subtitle: {color: COLORS.mutedForeground, fontSize: 15, marginBottom: 24},
  form: {gap: 16},
  error: {color: COLORS.destructive, fontSize: 14, marginTop: 8},
});
