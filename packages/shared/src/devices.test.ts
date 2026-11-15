import {describe, expect, it} from 'vitest';

import {pairRunnerSchema, runnerJobSchema} from './devices';

describe('the Runner protocol', () => {
  it('accepts a pairing code with or without the dash, any case', () => {
    expect(pairRunnerSchema.parse({code: 'abcd-1234', os: 'macOS'}).code).toBe(
      'ABCD-1234',
    );
    expect(pairRunnerSchema.parse({code: 'ABCD1234', os: 'macOS'}).code).toBe(
      'ABCD-1234',
    );
    expect(
      pairRunnerSchema.safeParse({code: 'nope', os: 'macOS'}).error?.issues[0]
        ?.message,
    ).toBe('The code looks like ABCD-1234.');
  });

  it('knows each kind of job, and refuses others', () => {
    expect(
      runnerJobSchema.parse({type: 'command', command: 'ls'}),
    ).toMatchObject({type: 'command'});
    expect(
      runnerJobSchema.parse({
        type: 'engine',
        engine: 'claude_code',
        prompt: 'hi',
        permission: 'read_only',
      }),
    ).toMatchObject({engine: 'claude_code'});
    expect(runnerJobSchema.safeParse({type: 'format_disk'}).success).toBe(
      false,
    );
  });
});
