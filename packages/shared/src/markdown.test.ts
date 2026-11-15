import {describe, expect, it} from 'vitest';

import {normalizeMath, parseMarkdownBlocks} from './markdown';

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

describe('parseMarkdownBlocks', () => {
  it('splits headings, paragraphs, lists and quotes', () => {
    const text = [
      '## Plan',
      'First line',
      'and its second line.',
      '',
      '- one',
      '* two',
      '2. three',
      '> a quote',
    ].join('\n');

    expect(parseMarkdownBlocks(text)).toEqual([
      {kind: 'heading', text: 'Plan'},
      {kind: 'paragraph', text: 'First line\nand its second line.'},
      {kind: 'item', marker: '•', text: 'one'},
      {kind: 'item', marker: '•', text: 'two'},
      {kind: 'item', marker: '2.', text: 'three'},
      {kind: 'quote', text: 'a quote'},
    ]);
  });

  it('keeps code exactly as written, even while it streams in', () => {
    expect(
      parseMarkdownBlocks('Run:\n```sh\n# not a heading\n- nor a list\n```'),
    ).toEqual([
      {kind: 'paragraph', text: 'Run:'},
      {kind: 'code', text: '# not a heading\n- nor a list'},
    ]);
    expect(parseMarkdownBlocks('```py\nprint(1)')).toEqual([
      {kind: 'code', text: 'print(1)'},
    ]);
  });
});
