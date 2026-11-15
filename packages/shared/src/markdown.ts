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
