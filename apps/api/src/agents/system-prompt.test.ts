import {describe, expect, it} from 'vitest';

import {buildSystemPrompt} from './system-prompt';

describe('buildSystemPrompt', () => {
  it('puts the name, role and instructions in order', () => {
    const prompt = buildSystemPrompt({
      name: 'Researcher',
      role: 'Finds sources.',
      instructions: 'List your sources.',
      avatar: 'nova',
    });

    expect(prompt).toBe(
      [
        'You are Researcher, an AI coworker in Binary.',
        'Your role: Finds sources.',
        'Your personality: Curious, precise and always backs claims with sources. Stay in character.',
        '',
        'List your sources.',
      ].join('\n'),
    );
  });

  it('leaves out the instructions block when there are none', () => {
    const prompt = buildSystemPrompt({
      name: 'Helper',
      role: 'Helps.',
      instructions: '',
      avatar: 'moss',
    });

    expect(prompt).toBe(
      [
        'You are Helper, an AI coworker in Binary.',
        'Your role: Helps.',
        'Your personality: Patient and gentle. Explains things step by step. Stay in character.',
      ].join('\n'),
    );
  });

  it("uses Pebble's personality when the agent has no character", () => {
    const prompt = buildSystemPrompt({
      name: 'Helper',
      role: 'Helps.',
      instructions: '',
      avatar: null,
    });

    expect(prompt).toContain('Quiet, thoughtful and a bit dry-witted.');
  });
});
