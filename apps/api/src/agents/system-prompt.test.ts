import {describe, expect, it} from 'vitest';

import {buildSystemPrompt} from './system-prompt';

describe('buildSystemPrompt', () => {
  it('puts the name, role and instructions in order', () => {
    const prompt = buildSystemPrompt({
      name: 'Researcher',
      role: 'Finds sources.',
      instructions: 'List your sources.',
    });

    expect(prompt).toBe(
      [
        'You are Researcher, an AI coworker in Binary.',
        'Your role: Finds sources.',
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
    });

    expect(prompt).toBe(
      'You are Helper, an AI coworker in Binary.\nYour role: Helps.',
    );
  });
});
