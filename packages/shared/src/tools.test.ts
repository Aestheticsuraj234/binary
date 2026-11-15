import {describe, expect, it} from 'vitest';

import {connectAppSchema, toolCallImages, type ToolCallView} from './tools';

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

describe('toolCallImages', () => {
  const call = (
    output: unknown,
    status: ToolCallView['status'] = 'succeeded',
  ) =>
    ({
      id: 'c1',
      toolName: 'browser_open',
      risk: 'computer',
      status,
      input: {},
      output,
    }) satisfies ToolCallView;

  it('shows charts, then the screenshot with its type and page', () => {
    const images = toolCallImages(
      call({
        results: [{png: 'AAA'}, {text: 'x'}],
        screenshot: 'iVBORxyz',
        title: 'Docs',
      }),
    );

    expect(images).toEqual([
      {src: 'data:image/png;base64,AAA', alt: 'Chart 1 from the sandbox'},
      {src: 'data:image/png;base64,iVBORxyz', alt: 'Screenshot of Docs'},
    ]);
  });

  it('reads a browser JPEG, and nothing from a call that did not finish', () => {
    expect(toolCallImages(call({screenshot: '/9j/abc'}))[0]?.src).toBe(
      'data:image/jpeg;base64,/9j/abc',
    );
    expect(toolCallImages(call({screenshot: 'iVBOR'}, 'running'))).toEqual([]);
    expect(toolCallImages(call('plain text'))).toEqual([]);
  });
});
