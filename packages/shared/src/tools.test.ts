import {describe, expect, it} from 'vitest';

import {connectAppSchema} from './tools';

describe('connectAppSchema', () => {
  it('accepts an https MCP URL with an optional token', () => {
    const result = connectAppSchema.safeParse({
      name: ' Gmail ',
      url: 'https://mcp.composio.dev/gmail/abc',
      authorization: 'Bearer sk-1',
    });

    expect(result.data).toMatchObject({name: 'Gmail'});
  });

  it('rejects a URL that is not http or https', () => {
    const result = connectAppSchema.safeParse({
      name: 'Files',
      url: 'file:///etc/passwd',
    });

    expect(result.error?.issues[0]?.message).toBe(
      'Paste the MCP server URL, starting with https://',
    );
  });
});
