import {describe, expect, it} from 'vitest';

import {sendMessageSchema} from './chat';

describe('sendMessageSchema', () => {
  it('trims the message', () => {
    const result = sendMessageSchema.safeParse({content: '  Hello  '});

    expect(result.data?.content).toBe('Hello');
  });

  it('asks for a message with a friendly text', () => {
    const result = sendMessageSchema.safeParse({content: '   '});

    expect(result.error?.issues[0]?.message).toBe('Write a message first.');
  });
});
