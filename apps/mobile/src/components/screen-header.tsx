import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {COLORS} from '@/lib/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Shown before the title, e.g. the character's face. */
  leading?: React.ReactNode;
  /** Buttons on the right. */
  children?: React.ReactNode;
}

/** The top bar of a pushed screen: back, who you're talking to, actions. */
export function ScreenHeader({
  title,
  subtitle,
  leading,
  children,
}: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={10}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace('/')
        }
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.foreground} />
      </Pressable>
      {leading}
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A round icon button for the header. */
export function HeaderButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.button, disabled && styles.dimmed]}
    >
      <Ionicons name={icon} size={19} color={COLORS.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titles: {flex: 1, minWidth: 0},
  title: {color: COLORS.foreground, fontSize: 17, fontWeight: '600'},
  subtitle: {color: COLORS.mutedForeground, fontSize: 13},
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  dimmed: {opacity: 0.4},
});
