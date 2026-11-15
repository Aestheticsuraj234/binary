import {createHash} from 'node:crypto';

import type {Embedder} from './embedder';

const DIMENSIONS = 1536;
// Words too common to say anything about meaning.
const STOP_WORDS = new Set(
  'a an and are as at be by for from i in is it my of on or that the this to was what with you your'.split(
    ' ',
  ),
);

/**
 * An embedder for tests and offline checks, with no network: each word
 * lands in one of 1536 buckets, so texts that share words point the same
 * way. Crude, but it orders "closest in meaning" the way a test expects.
 */
export function fakeEmbedder(): Embedder {
  return {
    model: 'fake/bag-of-words',
    async embed(values) {
      return values.map((value) => {
        const vector = new Array<number>(DIMENSIONS).fill(0);
        const words = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        for (const word of words) {
          if (!STOP_WORDS.has(word)) {
            const bucket =
              createHash('sha256').update(word).digest().readUInt32BE(0) %
              DIMENSIONS;
            vector[bucket] = (vector[bucket] ?? 0) + 1;
          }
        }
        const length = Math.hypot(...vector) || 1;
        // pgvector can't compare an all-zero vector by cosine; nudge it.
        return vector.map((x, index) =>
          length === 1 && x === 0 && index === 0 ? 1 : x / length,
        );
      });
    },
  };
}
