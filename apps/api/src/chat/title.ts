const MAX_LENGTH = 48;

/**
 * Names a chat after its first message, so the sidebar reads like a list of
 * topics. Free and instant: no extra model call.
 */
export function titleFrom(message: string): string {
  const firstLine = (message.split('\n')[0] ?? '').trim();
  if (firstLine.length <= MAX_LENGTH) {
    return firstLine;
  }
  // Cut at the last whole word, unless that would leave too little.
  const cut = firstLine.slice(0, MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  const words = lastSpace > MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;
  return `${words.trimEnd()}…`;
}
