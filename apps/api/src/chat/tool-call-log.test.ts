import {describe, expect, it} from 'vitest';

import {BLOCKED_RESULT} from '../tools/policy';
import {ToolCallLog} from './tool-call-log';

const riskOf = (name: string) => (name.startsWith('read') ? 'read' : 'write');

describe('ToolCallLog', () => {
  it('reports a call as running, then succeeded', () => {
    const log = new ToolCallLog(riskOf);

    expect(log.start('1', 'read_page', {url: 'x'})).toMatchObject({
      id: '1',
      risk: 'read',
      status: 'running',
    });
    expect(log.finish('1', {text: 'hi'})).toMatchObject({
      status: 'succeeded',
      output: {text: 'hi'},
    });
  });

  it('marks blocked, failed and MCP-error calls', () => {
    const log = new ToolCallLog(riskOf);
    log.start('1', 'send', {});
    log.start('2', 'read_a', {});
    log.start('3', 'read_b', {});

    expect(log.finish('1', BLOCKED_RESULT)?.status).toBe('rejected');
    expect(log.fail('2', 'timeout')).toMatchObject({
      status: 'failed',
      output: {error: 'timeout'},
    });
    expect(log.finish('3', {isError: true, content: []})?.status).toBe(
      'failed',
    );
  });

  it('saves calls in order, and an unfinished call as failed', () => {
    const log = new ToolCallLog(riskOf);
    log.start('1', 'read_a', {});
    log.finish('1', {});
    log.start('2', 'read_b', {});

    const rows = log.toRows('message-1');
    expect(rows.map(({toolName, status}) => ({toolName, status}))).toEqual([
      {toolName: 'read_a', status: 'succeeded'},
      {toolName: 'read_b', status: 'failed'},
    ]);
    expect(rows[0]?.messageId).toBe('message-1');
  });

  it('ignores results for calls it never saw', () => {
    expect(new ToolCallLog(riskOf).finish('nope', {})).toBeUndefined();
  });
});
