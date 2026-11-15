import {describe, expect, it} from 'vitest';

import {normalizeMath} from './markdown';

describe('normalizeMath', () => {
  it('turns \\[…\\] into a display block', () => {
    expect(normalizeMath('The sum is:\n\\[ 1^2 + 2^2 = 5 \\]')).toBe(
      'The sum is:\n\n$$\n1^2 + 2^2 = 5\n$$\n',
    );
  });

  it('turns \\(…\\) into inline math', () => {
    expect(normalizeMath('so \\(x^2\\) grows')).toBe('so $$x^2$$ grows');
  });

  it('leaves code, prices and plain text alone', () => {
    const text = [
      'Pro costs $9, or $90 a year.',
      'Use `\\(x\\)` in LaTeX.',
      '```tex',
      '\\[ a + b \\]',
      '```',
    ].join('\n');

    expect(normalizeMath(text)).toBe(text);
  });

  it('leaves a code block that is still streaming in alone', () => {
    const text = 'Here:\n```python\nprint("\\\\(")';

    expect(normalizeMath(text)).toBe(text);
  });
});
