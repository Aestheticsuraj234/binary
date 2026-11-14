import {describe, expect, it} from 'vitest';

import {agentInputSchema} from './agents';

const VALID_AGENT = {
  name: 'Researcher',
  role: 'Finds and summarizes sources.',
  instructions: 'Always list your sources.',
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
};

describe('agentInputSchema', () => {
  it('accepts a valid agent and trims the text', () => {
    const result = agentInputSchema.safeParse({
      ...VALID_AGENT,
      name: '  Researcher  ',
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Researcher');
  });

  it('allows empty instructions', () => {
    const result = agentInputSchema.safeParse({
      ...VALID_AGENT,
      instructions: '',
    });

    expect(result.success).toBe(true);
  });

  it('asks for a name with a friendly message', () => {
    const result = agentInputSchema.safeParse({...VALID_AGENT, name: '   '});

    expect(result.error?.issues[0]?.message).toBe('Give your agent a name.');
  });

  it('rejects an unknown provider', () => {
    const result = agentInputSchema.safeParse({
      ...VALID_AGENT,
      provider: 'acme',
    });

    expect(result.success).toBe(false);
  });
});
