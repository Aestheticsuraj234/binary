import type {Approval, ChatMessage, RoutineRun, ToolRisk} from '@binary/shared';
import {useRouter} from 'expo-router';
import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {CharacterAvatar} from '@/components/character-face';
import {EmptyNote, SectionTitle, TabScreen} from '@/components/tab-screen';
import {DecisionButton} from '@/components/tool-call-row';
import {apiJson} from '@/lib/api';
import {COLORS} from '@/lib/theme';
import {timeAgo} from '@/lib/time';
import {useTodayCount} from '@/lib/today-count';
import {useApi} from '@/lib/use-api';

interface TodayRun extends RoutineRun {
  routine: {id: string; name: string};
  agent: {id: string; name: string; avatar: string | null};
}

const RISK_NOTE: Record<ToolRisk, string> = {
  read: 'Only looks something up.',
  write: 'Changes something outside Binary.',
  computer: 'Controls a computer.',
};

const RUN_LABEL: Record<RoutineRun['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Done',
  failed: 'Failed',
};

/** Where an approval's chat lives: a room's, or a one-to-one chat. */
function chatPath(approval: Approval) {
  return approval.roomId
    ? `/rooms/${approval.roomId}?chat=${approval.threadId}`
    : `/agents/${approval.agent.id}?chat=${approval.threadId}`;
}

/** Today: what your characters need from you, and what they did alone. */
export default function TodayScreen() {
  const router = useRouter();
  const today = useTodayCount();
  const {data, error, isLoading, reload} = useApi<{
    approvals: Approval[];
    runs: TodayRun[];
  }>('/api/today');
  const [deciding, setDeciding] = useState<{id: string; choice: string}>();
  const [notice, setNotice] = useState('');
  const approvals = data?.approvals ?? [];
  const runs = data?.runs ?? [];

  async function decide(approval: Approval, choice: 'approve' | 'reject') {
    setDeciding({id: approval.id, choice});
    setNotice('');
    const result = await apiJson<{reply?: ChatMessage; error?: string}>(
      `/api/approvals/${approval.id}/${choice}`,
      {method: 'POST'},
    );
    const name = approval.agent.name;
    setNotice(
      result.error ??
        result.data?.error ??
        (choice === 'approve'
          ? `Approved. ${name} carried on in the chat.`
          : `Rejected. ${name} knows not to.`),
    );
    setDeciding(undefined);
    await Promise.all([reload(), today.refresh()]);
  }

  return (
    <TabScreen
      title="Today"
      subtitle="What your characters need from you, and what they did on their own."
      isLoading={isLoading}
      error={error}
      onRefresh={async () => {
        await Promise.all([reload(), today.refresh()]);
      }}
    >
      <SectionTitle>Waiting for you</SectionTitle>
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      ) : null}
      {approvals.length === 0 ? (
        <EmptyNote>Nothing is waiting for you. Nice.</EmptyNote>
      ) : (
        approvals.map((approval) => (
          <View key={approval.id} style={styles.card}>
            <View style={styles.who}>
              <CharacterAvatar avatar={approval.agent.avatar} size={36} />
              <View style={styles.flex}>
                <Text style={styles.agent}>{approval.agent.name}</Text>
                <Text style={styles.meta}>
                  {timeAgo(approval.createdAt)} ·{' '}
                  {RISK_NOTE[approval.toolCall.risk]}
                </Text>
              </View>
            </View>
            <Text style={styles.summary}>{approval.summary}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(chatPath(approval))}
                style={styles.flex}
              >
                <Text style={styles.link}>Open chat</Text>
              </Pressable>
              <DecisionButton
                label="Approve"
                primary
                busy={
                  deciding?.id === approval.id && deciding.choice === 'approve'
                }
                disabled={deciding !== undefined}
                onPress={() => void decide(approval, 'approve')}
              />
              <DecisionButton
                label="Reject"
                busy={
                  deciding?.id === approval.id && deciding.choice === 'reject'
                }
                disabled={deciding !== undefined}
                onPress={() => void decide(approval, 'reject')}
              />
            </View>
          </View>
        ))
      )}

      <SectionTitle>Routine runs</SectionTitle>
      {runs.length === 0 ? (
        <EmptyNote>No routine ran in the last 24 hours.</EmptyNote>
      ) : (
        <View style={styles.list}>
          {runs.map((run) => (
            <Pressable
              key={run.id}
              accessibilityRole="button"
              disabled={!run.threadId}
              onPress={() =>
                router.push(`/agents/${run.agent.id}?chat=${run.threadId}`)
              }
              style={styles.row}
            >
              <CharacterAvatar avatar={run.agent.avatar} size={32} />
              <Text style={[styles.flex, styles.runName]} numberOfLines={1}>
                {run.routine.name}
              </Text>
              <Text
                style={[
                  styles.status,
                  run.status === 'failed' && styles.failed,
                ]}
              >
                {RUN_LABEL[run.status]}
              </Text>
              <Text style={styles.meta}>{timeAgo(run.createdAt)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, minWidth: 0},
  notice: {color: COLORS.primary, fontSize: 14},
  card: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.warning}55`,
    borderRadius: 24,
    backgroundColor: COLORS.card,
  },
  who: {flexDirection: 'row', alignItems: 'center', gap: 10},
  agent: {color: COLORS.foreground, fontSize: 15, fontWeight: '600'},
  meta: {color: COLORS.mutedForeground, fontSize: 12},
  summary: {color: COLORS.foreground, fontSize: 15, lineHeight: 22},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  link: {color: COLORS.mutedForeground, fontSize: 14},
  list: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  runName: {color: COLORS.foreground, fontSize: 14, fontWeight: '500'},
  status: {color: COLORS.primary, fontSize: 12},
  failed: {color: COLORS.destructive},
});
