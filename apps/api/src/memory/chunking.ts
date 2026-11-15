// A passage is about a paragraph or three: big enough to make sense alone,
// small enough that a search finds the right part of a long document.
const CHUNK_SIZE = 1200;
// Neighbouring passages share a little text, so a sentence cut in two is
// still whole in one of them.
const OVERLAP = 200;

/**
 * Cuts a document into passages, keeping paragraphs together where it can
 * and splitting only paragraphs that are too long on their own.
 */
export function splitIntoChunks(
  text: string,
  size = CHUNK_SIZE,
  overlap = OVERLAP,
): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => {
      if (paragraph.length <= size) {
        return [paragraph];
      }
      const pieces: string[] = [];
      for (let start = 0; start < paragraph.length; start += size - overlap) {
        pieces.push(paragraph.slice(start, start + size));
      }
      return pieces;
    });

  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > size) {
      chunks.push(current);
      // Carry the end of the last passage into the next one.
      current = `${current.slice(-overlap)}\n\n${paragraph}`;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}
