import {tool} from 'ai';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {z} from 'zod';

import {startTestMcpServer, TEST_MCP_TOKEN} from '../test-mcp-server';
import type {AgentTool} from './agent-tool';
import {builtInTools} from './built-in';
import {connectApp, riskFromHints, toolPrefix} from './mcp';
import {BLOCKED_RESULT, readOnlyPolicy} from './policy';
import {Toolbox} from './toolbox';

// What the AI SDK passes to a tool's execute function.
const CALL_OPTIONS = {toolCallId: 'call-1', messages: [], context: {}};

/** A tool that records whether it ran. */
function fakeTool(
  name: string,
  risk: AgentTool['risk'],
  runs: string[],
): AgentTool {
  return {
    name,
    description: name,
    risk,
    source: 'Test',
    tool: tool({
      inputSchema: z.object({}),
      execute: async () => {
        runs.push(name);
        return {ok: true};
      },
    }),
  };
}

describe('Toolbox with the read-only policy', () => {
  it('runs read tools and blocks write and computer tools', async () => {
    const runs: string[] = [];
    const toolbox = new Toolbox([
      fakeTool('look', 'read', runs),
      fakeTool('send', 'write', runs),
      fakeTool('click', 'computer', runs),
    ]);
    const tools = toolbox.toToolSet(readOnlyPolicy);

    expect(await tools.look?.execute?.({}, CALL_OPTIONS)).toEqual({ok: true});
    expect(await tools.send?.execute?.({}, CALL_OPTIONS)).toEqual(
      BLOCKED_RESULT,
    );
    expect(await tools.click?.execute?.({}, CALL_OPTIONS)).toEqual(
      BLOCKED_RESULT,
    );
    expect(runs).toEqual(['look']);
  });

  it('keeps the first tool when two share a name', () => {
    const toolbox = new Toolbox([
      fakeTool('search', 'read', []),
      fakeTool('search', 'write', []),
    ]);

    expect(toolbox.list()).toHaveLength(1);
    expect(toolbox.riskOf('search')).toBe('read');
  });

  it('treats a tool it does not know as risky', () => {
    expect(new Toolbox([]).riskOf('made_up')).toBe('write');
  });
});

describe('built-in tools', () => {
  it('are read-only and tell the time', async () => {
    const [time, page] = builtInTools();

    expect([time?.risk, page?.risk]).toEqual(['read', 'read']);
    const now = await time?.tool.execute?.(
      {timeZone: 'Asia/Kolkata'},
      CALL_OPTIONS,
    );
    expect(now).toMatchObject({
      timeZone: 'Asia/Kolkata',
      iso: expect.any(String),
    });
  });
});

describe('MCP apps', () => {
  let shop: Awaited<ReturnType<typeof startTestMcpServer>>;

  beforeAll(async () => {
    shop = await startTestMcpServer();
  });

  afterAll(async () => {
    await shop.close();
  });

  it('turns app names into tool prefixes', () => {
    expect(toolPrefix('Google Calendar')).toBe('google_calendar');
    expect(toolPrefix('  !!! ')).toBe('app');
  });

  it('counts a tool as read only when the server says it is read-only', () => {
    expect(riskFromHints({readOnlyHint: true})).toBe('read');
    expect(riskFromHints({readOnlyHint: false})).toBe('write');
    expect(riskFromHints(undefined)).toBe('write');
  });

  it('connects, lists prefixed tools with their risk, and calls one', async () => {
    const connection = await connectApp({
      name: 'Shop',
      url: shop.url,
      authorization: TEST_MCP_TOKEN,
    });

    expect(
      connection.tools.map(({name, risk, source}) => ({name, risk, source})),
    ).toEqual([
      {name: 'shop_lookup_order', risk: 'read', source: 'Shop'},
      {name: 'shop_refund_order', risk: 'write', source: 'Shop'},
    ]);
    const result = await connection.tools[0]?.tool.execute?.(
      {orderId: 'A1'},
      CALL_OPTIONS,
    );
    expect(JSON.stringify(result)).toContain('Order A1: 2 mugs, shipped.');
    await connection.close();
  });

  it('fails clearly without the right token', async () => {
    await expect(connectApp({name: 'Shop', url: shop.url})).rejects.toThrow(
      '401',
    );
  });
});
