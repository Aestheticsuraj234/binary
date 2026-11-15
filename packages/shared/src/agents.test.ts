import {describe, expect, it} from 'vitest';

import {agentInputSchema} from './agents';

const VALID_AGENT = {
  name: 'Researcher',
  role: 'Finds and summarizes sources.',
  instructions: 'Always list your sources.',
  provider: 'anthropic',
  model: 'claude-sonnet-5-5',
  avatar: 'nova',
  approvalMode: 'auto_approve_reads',
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

  it('rejects an unknown approval mode', () => {
    const result = agentInputSchema.safeParse({
      ...VALID_AGENT,
      approvalMode: 'yolo',
    });

    expect(result.success).toBe(false);
  });

  it('has no computer unless one is chosen', () => {
    expect(agentInputSchema.parse(VALID_AGENT).defaultComputer).toBeNull();
    expect(
      agentInputSchema.parse({...VALID_AGENT, defaultComputer: 'sandbox'})
        .defaultComputer,
    ).toBe('sandbox');
    expect(
      agentInputSchema.parse({...VALID_AGENT, defaultComputer: 'browser'})
        .defaultComputer,
    ).toBe('browser');
    expect(
      agentInputSchema.safeParse({...VALID_AGENT, defaultComputer: 'laptop'})
        .success,
    ).toBe(false);
    // Your own computer, through the Runner (Chapter 11).
    expect(
      agentInputSchema.parse({...VALID_AGENT, defaultComputer: 'runner'})
        .defaultComputer,
    ).toBe('runner');
  });

  it('thinks with the API by default, which needs a provider and model', () => {
    expect(agentInputSchema.parse(VALID_AGENT).engine).toBe('api');

    const result = agentInputSchema.safeParse({...VALID_AGENT, model: ''});
    expect(result.error?.issues[0]?.message).toBe('Choose a model.');
  });

  it('lets a CLI engine go without a provider or model', () => {
    const rest = {
      name: VALID_AGENT.name,
      role: VALID_AGENT.role,
      instructions: VALID_AGENT.instructions,
      avatar: VALID_AGENT.avatar,
      approvalMode: VALID_AGENT.approvalMode,
    };

    expect(
      agentInputSchema.parse({...rest, engine: 'claude_code'}),
    ).toMatchObject({engine: 'claude_code'});
    expect(
      agentInputSchema.safeParse({...rest, engine: 'gemini_cli'}).success,
    ).toBe(false);
  });

  it('rejects an unknown character', () => {
    const result = agentInputSchema.safeParse({
      ...VALID_AGENT,
      avatar: 'gandalf',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unknown provider', () => {
    const result = agentInputSchema.safeParse({
      ...VALID_AGENT,
      provider: 'acme',
    });

    expect(result.success).toBe(false);
  });
});
