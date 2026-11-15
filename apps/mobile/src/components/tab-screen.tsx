import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useState} from 'react';

import {COLORS, RADIUS} from '@/lib/theme';

interface TabScreenProps {
  title: string;
  subtitle: string;
  isLoading: boolean;
  error: string;
  /** Pull to refresh. */
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

/** A tab's page: a big title, then content you can pull to refresh. */
export function TabScreen({
  title,
  subtitle,
  isLoading,
  error,
  onRefresh,
  children,
}: TabScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refresh() {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {isLoading ? <ActivityIndicator color={COLORS.primary} /> : children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A section heading inside a tab. */
export function SectionTitle({children}: {children: string}) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A dashed box for "nothing here yet". */
export function EmptyNote({children}: {children: React.ReactNode}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: COLORS.background},
  content: {gap: 16, padding: 16, paddingBottom: 32},
  header: {gap: 4, paddingTop: 8, paddingBottom: 4},
  title: {
    color: COLORS.foreground,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {color: COLORS.mutedForeground, fontSize: 15, lineHeight: 21},
  section: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  error: {color: COLORS.destructive, fontSize: 14},
  empty: {
    padding: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS * 2,
  },
  emptyText: {color: COLORS.mutedForeground, fontSize: 14, lineHeight: 21},
});
