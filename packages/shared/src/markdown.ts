// Code, which is left exactly as written: fenced blocks (closed, or still
// streaming in) and inline spans.
const CODE = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/;

/**
 * Models often write math as LaTeX's `\(…\)` (inline) and `\[…\]` (on its
 * own line), while Markdown math reads `$$…$$`. This rewrites the first
 * into the second, outside code. Single dollars are never math, so prices
 * like "$9" stay prices.
 */
export function normalizeMath(markdown: string): string {
  return markdown
    .split(CODE)
    .map((part, index) =>
      // split() with a group puts the code parts at odd indexes.
      index % 2 === 1
        ? part
        : part
            .replace(
              /\\\[([\s\S]+?)\\\]/g,
              (_, body: string) => `\n$$\n${body.trim()}\n$$\n`,
            )
            .replace(
              /\\\(([\s\S]+?)\\\)/g,
              (_, body: string) => `$$${body.trim()}$$`,
            ),
    )
    .join('');
}

/** One block of Markdown, for apps that draw it themselves (mobile). */
export type MarkdownBlock =
  | {kind: 'code'; text: string}
  | {kind: 'heading'; text: string}
  | {kind: 'quote'; text: string}
  | {kind: 'item'; marker: string; text: string}
  | {kind: 'paragraph'; text: string};

/** Splits Markdown into blocks. A fence still streaming in counts as code. */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split('\n');
  let paragraph: string[] = [];
  const endParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({kind: 'paragraph', text: paragraph.join('\n')});
      paragraph = [];
    }
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trimStart().startsWith('```')) {
      endParagraph();
      const code: string[] = [];
      index += 1;
      while (
        index < lines.length &&
        !lines[index]?.trimStart().startsWith('```')
      ) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      blocks.push({kind: 'code', text: code.join('\n')});
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (heading) {
      endParagraph();
      blocks.push({kind: 'heading', text: heading[1] ?? ''});
    } else if (item) {
      endParagraph();
      const marker = /\d/.test(item[1] ?? '') ? (item[1] ?? '') : '•';
      blocks.push({kind: 'item', marker, text: item[2] ?? ''});
    } else if (quote) {
      endParagraph();
      blocks.push({kind: 'quote', text: quote[1] ?? ''});
    } else if (line.trim() === '') {
      endParagraph();
    } else {
      paragraph.push(line);
    }
  }
  endParagraph();
  return blocks;
}
