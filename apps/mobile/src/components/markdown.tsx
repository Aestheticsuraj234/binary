import {parseMarkdownBlocks} from '@binary/shared';
import {Linking, StyleSheet, Text, View} from 'react-native';

import {COLORS, MONO} from '@/lib/theme';

// Inline marks: `code`, **bold**, *italic* or _italic_, and [links](url).
const INLINE =
  /(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)\s]+\))/;

function Inline({text}: {text: string}) {
  return text.split(INLINE).map((part, index) => {
    if (index % 2 === 0) {
      return part;
    }
    if (part.startsWith('`')) {
      return (
        <Text key={index} style={styles.inlineCode}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('**')) {
      return (
        <Text key={index} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const url = link[2] ?? '';
      return (
        <Text
          key={index}
          style={styles.link}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(url)}
        >
          {link[1]}
        </Text>
      );
    }
    return (
      <Text key={index} style={styles.italic}>
        {part.slice(1, -1)}
      </Text>
    );
  });
}

/**
 * An agent's answer. A small renderer for what models write most: headings,
 * lists, quotes, code and inline marks. Tables and math show as text.
 */
export function Markdown({children}: {children: string}) {
  return (
    <View style={styles.blocks}>
      {parseMarkdownBlocks(children).map((block, index) => {
        switch (block.kind) {
          case 'code':
            return (
              <Text key={index} style={styles.codeBlock} selectable>
                {block.text}
              </Text>
            );
          case 'heading':
            return (
              <Text key={index} style={[styles.text, styles.heading]}>
                <Inline text={block.text} />
              </Text>
            );
          case 'quote':
            return (
              <Text key={index} style={[styles.text, styles.quote]}>
                <Inline text={block.text} />
              </Text>
            );
          case 'item':
            return (
              <View key={index} style={styles.item}>
                <Text style={[styles.text, styles.marker]}>{block.marker}</Text>
                <Text style={[styles.text, styles.itemText]}>
                  <Inline text={block.text} />
                </Text>
              </View>
            );
          default:
            return (
              <Text key={index} style={styles.text} selectable>
                <Inline text={block.text} />
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: {gap: 8},
  text: {color: COLORS.foreground, fontSize: 15, lineHeight: 22},
  heading: {fontSize: 16, fontWeight: '600'},
  quote: {
    color: COLORS.mutedForeground,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    paddingLeft: 10,
  },
  item: {flexDirection: 'row', gap: 8, paddingLeft: 4},
  marker: {color: COLORS.mutedForeground, minWidth: 14},
  itemText: {flex: 1},
  bold: {fontWeight: '600'},
  italic: {fontStyle: 'italic'},
  link: {color: COLORS.primary, textDecorationLine: 'underline'},
  inlineCode: {...MONO, fontSize: 13, backgroundColor: COLORS.muted},
  codeBlock: {
    ...MONO,
    color: COLORS.foreground,
    fontSize: 13,
    lineHeight: 19,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.muted,
  },
});
