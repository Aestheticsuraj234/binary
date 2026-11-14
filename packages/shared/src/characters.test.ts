import {describe, expect, it} from 'vitest';

import {CHARACTERS, characterOf, TEMPLATE_CHARACTERS} from './characters';

describe('characterOf', () => {
  it('returns a saved character id as it is', () => {
    expect(characterOf('bolt')).toBe('bolt');
  });

  it('falls back to Pebble for an empty or unknown value', () => {
    expect(characterOf(null)).toBe('pebble');
    expect(characterOf('gandalf')).toBe('pebble');
  });
});

describe('TEMPLATE_CHARACTERS', () => {
  it('casts a real character for every seeded template', () => {
    for (const id of Object.values(TEMPLATE_CHARACTERS)) {
      expect(CHARACTERS[id]).toBeDefined();
    }
  });
});
