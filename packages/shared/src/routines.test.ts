import {describe, expect, it} from 'vitest';

import {describeSchedule, routineInputSchema} from './routines';

const VALID = {
  agentId: '6f1c1f9e-6b1a-4d9e-9d43-2a1f0b3c4d5e',
  name: 'Morning briefing',
  prompt: 'Summarize what is new today.',
  enabled: true,
  schedule: '0 9 * * 1-5',
  timezone: 'Asia/Kolkata',
  webhook: false,
};

describe('routineInputSchema', () => {
  it('accepts a scheduled routine', () => {
    expect(routineInputSchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts a routine without a schedule', () => {
    expect(
      routineInputSchema.safeParse({...VALID, schedule: null}).success,
    ).toBe(true);
  });

  it('rejects a schedule that is not five cron fields', () => {
    const result = routineInputSchema.safeParse({
      ...VALID,
      schedule: 'every day',
    });

    expect(result.error?.issues[0]?.message).toBe(
      'Use five cron fields, like "0 9 * * 1-5".',
    );
  });
});

describe('describeSchedule', () => {
  it('names presets and shows custom expressions as they are', () => {
    expect(describeSchedule('0 9 * * 1-5')).toBe('Weekdays at 9:00');
    expect(describeSchedule('*/15 * * * *')).toBe('*/15 * * * *');
  });
});
