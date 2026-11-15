import {describe, expect, it} from 'vitest';

import {
  addDocumentSchema,
  addMemorySchema,
  MAX_DOCUMENT_LENGTH,
} from './memory';

describe('addDocumentSchema', () => {
  it('takes pasted text, a file or a web page', () => {
    expect(
      addDocumentSchema.parse({
        source: 'text',
        title: ' Handbook ',
        text: 'Hi',
      }),
    ).toEqual({source: 'text', title: 'Handbook', text: 'Hi'});
    expect(
      addDocumentSchema.safeParse({source: 'url', url: 'https://example.com'})
        .success,
    ).toBe(true);
  });

  it('refuses non-web addresses, empty text and huge documents', () => {
    expect(
      addDocumentSchema.safeParse({source: 'url', url: 'file:///etc/passwd'})
        .error?.issues[0]?.message,
    ).toBe('Paste a web address starting with https://');
    expect(
      addDocumentSchema.safeParse({source: 'text', title: 'Empty', text: '  '})
        .success,
    ).toBe(false);
    expect(
      addDocumentSchema.safeParse({
        source: 'file',
        title: 'Big',
        text: 'x'.repeat(MAX_DOCUMENT_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe('addMemorySchema', () => {
  it('wants something short to remember', () => {
    expect(
      addMemorySchema.safeParse({content: ''}).error?.issues[0]?.message,
    ).toBe('Write what to remember.');
    expect(addMemorySchema.safeParse({content: 'x'.repeat(501)}).success).toBe(
      false,
    );
  });
});
