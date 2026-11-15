import {Ionicons} from '@expo/vector-icons';
import {
  toolCallImages,
  type ToolCallStatus,
  type ToolCallView,
  type ToolRisk,
} from '@binary/shared';
import {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS, MONO} from '@/lib/theme';

const VERB: Record<ToolCallStatus, string> = {
  pending: 'Waiting to use',
  awaiting_approval: 'Wants to use',
  running: 'Using',
  succeeded: 'Used',
  failed: 'Could not use',
  rejected: 'Blocked',
};

const RISK_LABEL: Record<ToolRisk, string> = {
  read: 'Read',
  write: 'Write',
  computer: 'Computer',
};

/** A plan-only agent's call is blocked; any other "rejected" was the user. */
function wasBlocked(call: ToolCallView) {
  return (
    typeof call.output === 'object' &&
    call.output !== null &&
    Reflect.get(call.output, 'blocked') === true
  );
}

/** Code and commands read better as themselves than as JSON. */
function inputText(call: ToolCallView) {
  const input = call.input;
  if (typeof input === 'object' && input !== null) {
    for (const key of ['code', 'command']) {
      const value = Reflect.get(input, key);
      if (typeof value === 'string') {
        return value;
      }
    }
  }
  return JSON.stringify(input, null, 2) ?? '';
}

function outputText(output: unknown) {
  const text =
    typeof output === 'string'
      ? output
      : (JSON.stringify(output, null, 2) ?? '');
  // Screenshots and charts are shown as pictures, not as base64.
  return text.replace(/"[A-Za-z0-9+/=]{200,}"/g, '"…"').slice(0, 1500);
}

interface ToolCallRowProps {
  call: ToolCallView;
  /** Approve or reject a waiting call. Without it, no buttons are shown. */
  onDecide?: (
    approvalId: string,
    decision: 'approve' | 'reject',
  ) => Promise<void>;
}

/**
 * One tool the agent used, inside its answer: one line closed, the input
 * and result open. A call waiting for approval starts open, with Approve
 * and Reject.
 */
export function ToolCallRow({call, onDecide}: ToolCallRowProps) {
  const waiting = call.status === 'awaiting_approval';
  const [isOpen, setIsOpen] = useState(waiting);
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const working = call.status === 'running' || call.status === 'pending';
  const name = call.toolName.replaceAll('_', ' ');
  const verb =
    call.status === 'rejected' && !wasBlocked(call)
      ? 'You said no to'
      : VERB[call.status];
  const images = toolCallImages(call);

  async function decide(decision: 'approve' | 'reject') {
    if (call.approvalId && onDecide) {
      setDeciding(decision);
      await onDecide(call.approvalId, decision);
      setDeciding(null);
    }
  }

  return (
    <View style={[styles.box, waiting && styles.waiting]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: isOpen}}
        onPress={() => setIsOpen((open) => !open)}
        style={styles.summary}
      >
        <Ionicons
          name="construct-outline"
          size={13}
          color={COLORS.mutedForeground}
        />
        <Text style={styles.line} numberOfLines={1}>
          <Text style={styles.muted}>{verb} </Text>
          {name}
        </Text>
        <Text style={styles.risk}>{RISK_LABEL[call.risk]}</Text>
        {working ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons
            name={isOpen ? 'chevron-down' : 'chevron-forward'}
            size={13}
            color={COLORS.mutedForeground}
          />
        )}
      </Pressable>
      {isOpen && (
        <View style={styles.details}>
          <Text style={styles.label}>Input</Text>
          <Text style={styles.code} selectable>
            {inputText(call)}
          </Text>
          {!waiting && !working && (
            <>
              <Text style={styles.label}>Result</Text>
              <Text style={styles.code} selectable numberOfLines={30}>
                {outputText(call.output)}
              </Text>
            </>
          )}
        </View>
      )}
      {images.map((image) => (
        <Image
          key={image.alt}
          source={{uri: image.src}}
          accessibilityLabel={image.alt}
          resizeMode="contain"
          style={styles.image}
        />
      ))}
      {waiting && call.approvalId && onDecide && (
        <View style={styles.actions}>
          <Text style={styles.needsOk}>Needs your OK</Text>
          <DecisionButton
            label="Approve"
            primary
            busy={deciding === 'approve'}
            disabled={deciding !== null}
            onPress={() => void decide('approve')}
          />
          <DecisionButton
            label="Reject"
            busy={deciding === 'reject'}
            disabled={deciding !== null}
            onPress={() => void decide('reject')}
          />
        </View>
      )}
    </View>
  );
}

interface DecisionButtonProps {
  label: string;
  primary?: boolean;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}

/** Approve (filled) or Reject (quiet); also used by the Today inbox. */
export function DecisionButton({
  label,
  primary,
  busy,
  disabled,
  onPress,
}: DecisionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        primary && styles.buttonPrimary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={primary ? COLORS.primaryForeground : COLORS.foreground}
        />
      ) : (
        <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  waiting: {borderColor: `${COLORS.warning}66`},
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  line: {flex: 1, color: COLORS.foreground, fontSize: 13, fontWeight: '500'},
  muted: {color: COLORS.mutedForeground, fontWeight: '400'},
  risk: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  details: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 12,
  },
  label: {color: COLORS.mutedForeground, fontSize: 12},
  code: {
    ...MONO,
    color: COLORS.foreground,
    fontSize: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.muted,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 10,
  },
  needsOk: {flex: 1, color: COLORS.warning, fontSize: 13},
  button: {
    minWidth: 84,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  buttonText: {color: COLORS.foreground, fontSize: 14, fontWeight: '500'},
  buttonTextPrimary: {color: COLORS.primaryForeground, fontWeight: '600'},
  dimmed: {opacity: 0.6},
});
