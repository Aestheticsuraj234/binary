import {ROUTING_MODE_INFO, type Room} from '@binary/shared';
import {useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {CharacterAvatar} from '@/components/character-face';
import {EmptyNote, TabScreen} from '@/components/tab-screen';
import {COLORS} from '@/lib/theme';
import {useApi} from '@/lib/use-api';

/** Rooms: your teams of characters. */
export default function RoomsScreen() {
  const router = useRouter();
  const {data, error, isLoading, reload} = useApi<{rooms: Room[]}>(
    '/api/rooms',
  );
  const rooms = data?.rooms ?? [];

  return (
    <TabScreen
      title="Rooms"
      subtitle="Several characters in one chat. @Mention who should answer."
      isLoading={isLoading}
      error={error}
      onRefresh={reload}
    >
      {rooms.length === 0 ? (
        <EmptyNote>
          No rooms yet. Create one in the web app with two or more of your
          characters.
        </EmptyNote>
      ) : (
        rooms.map((room) => (
          <Pressable
            key={room.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${room.name}`}
            onPress={() => router.push(`/rooms/${room.id}`)}
            style={({pressed}) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>
                {room.name}
              </Text>
              <Text style={styles.badge}>
                {ROUTING_MODE_INFO[room.routingMode].label}
              </Text>
            </View>
            <View style={styles.faces}>
              {room.members.map((member, index) => (
                <View
                  key={member.id}
                  style={[styles.face, index > 0 && styles.overlap]}
                >
                  <CharacterAvatar avatar={member.avatar} size={36} />
                </View>
              ))}
            </View>
            <Text style={styles.members} numberOfLines={1}>
              {room.members.map((member) => member.name).join(', ')}
            </Text>
          </Pressable>
        ))
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: COLORS.card,
  },
  pressed: {opacity: 0.75},
  top: {flexDirection: 'row', alignItems: 'center', gap: 8},
  name: {flex: 1, color: COLORS.foreground, fontSize: 18, fontWeight: '600'},
  badge: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  faces: {flexDirection: 'row'},
  face: {borderRadius: 20, borderWidth: 2, borderColor: COLORS.card},
  overlap: {marginLeft: -10},
  members: {color: COLORS.mutedForeground, fontSize: 14},
});
