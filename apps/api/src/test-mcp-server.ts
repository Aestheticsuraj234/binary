import type {AddressInfo} from 'node:net';

import {serve} from '@hono/node-server';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {z} from 'zod';

/** The bearer token the test server expects, to test saved auth headers. */
export const TEST_MCP_TOKEN = 'Bearer test-mcp-token';

/**
 * A small MCP app for tests: a shop with one read-only tool and one
 * destructive tool, served over Streamable HTTP like a real remote server
 * (for example a Composio URL).
 */
function createShopServer(refunds: string[], lookupDelayMs: number) {
  const server = new McpServer({name: 'test-shop', version: '1.0.0'});

  server.registerTool(
    'lookup_order',
    {
      description: 'Look up an order by its number.',
      inputSchema: {orderId: z.string()},
      annotations: {readOnlyHint: true},
    },
    async ({orderId}) => {
      await new Promise((resolve) => setTimeout(resolve, lookupDelayMs));
      return {
        content: [{type: 'text', text: `Order ${orderId}: 2 mugs, shipped.`}],
      };
    },
  );

  server.registerTool(
    'refund_order',
    {
      description: 'Refund an order in full.',
      inputSchema: {orderId: z.string()},
      annotations: {destructiveHint: true},
    },
    async ({orderId}) => {
      refunds.push(orderId);
      return {content: [{type: 'text', text: `Refunded order ${orderId}.`}]};
    },
  );

  return server;
}

/**
 * Starts the shop on a free port. Stateless: each request gets a fresh
 * server and transport, which is the simplest correct setup.
 * `lookupDelayMs` makes lookups slow, to watch a tool "running" in a browser.
 */
export async function startTestMcpServer({lookupDelayMs = 0} = {}) {
  // Every refund the shop performed, so tests can prove one never happened.
  const refunds: string[] = [];
  const httpServer = serve({
    port: 0,
    fetch: async (request) => {
      if (request.headers.get('authorization') !== TEST_MCP_TOKEN) {
        return new Response('Unauthorized', {status: 401});
      }
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await createShopServer(refunds, lookupDelayMs).connect(transport);
      return transport.handleRequest(request);
    },
  });
  await new Promise((resolve) => httpServer.once('listening', resolve));
  const {port} = httpServer.address() as AddressInfo;

  return {
    url: `http://localhost:${port}/mcp`,
    refunds,
    close: () => new Promise((resolve) => httpServer.close(resolve)),
  };
}
