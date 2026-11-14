import {describe, expect, it} from 'vitest';

import {titleFrom} from './title';

describe('titleFrom', () => {
  it('keeps a short first message as it is', () => {
    expect(titleFrom('Plan my week')).toBe('Plan my week');
  });

  it('uses only the first line', () => {
    expect(titleFrom('Review this function\nconst x = 1;')).toBe(
      'Review this function',
    );
  });

  it('cuts a long message at a whole word', () => {
    const title = titleFrom(
      'Find me three good sources on pgvector and explain how indexes work',
    );

    expect(title).toBe('Find me three good sources on pgvector and…');
  });
});
