import {describe, expect, it} from 'vitest';

import {splitIntoChunks} from './chunking';

describe('splitIntoChunks', () => {
  it('keeps short paragraphs together in one passage', () => {
    expect(splitIntoChunks('One.\n\nTwo.\n\n\nThree.')).toEqual([
      'One.\n\nTwo.\n\nThree.',
    ]);
  });

  it('starts a new passage when one is full, carrying a little over', () => {
    const first = 'a'.repeat(60);
    const second = 'b'.repeat(60);
    const chunks = splitIntoChunks(`${first}\n\n${second}`, 100, 10);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(first);
    // The second starts with the end of the first.
    expect(chunks[1]).toBe(`${'a'.repeat(10)}\n\n${second}`);
  });

  it('splits a paragraph that is too long on its own, with overlap', () => {
    const chunks = splitIntoChunks('x'.repeat(250), 100, 20);

    expect(chunks.every((chunk) => chunk.length <= 100 + 22)).toBe(true);
    expect(chunks.join('').replaceAll('\n', '').length).toBeGreaterThanOrEqual(
      250,
    );
  });

  it('has nothing to cut in empty text', () => {
    expect(splitIntoChunks('  \n\n  ')).toEqual([]);
  });
});
