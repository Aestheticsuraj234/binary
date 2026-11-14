import {McpServerRepository, UserRepository} from '@binary/db';
import type {ConnectedApp, ToolInfo} from '@binary/shared';
import {deleteUsersByEmail} from '@binary/db/test-utils';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';
import {startTestMcpServer, TEST_MCP_TOKEN} from '../test-mcp-server';

const createdEmails: string[] = [];
const app = createApp(createDependencies());
let shop: Awaited<ReturnType<typeof startTestMcpServer>>;
let cookie = '';
let otherCookie = '';
let appId = '';

function request(method: string, path: string, body?: unknown, as = cookie) {
  return app.request(path, {
    method,
    headers: {'Content-Type': 'application/json', Cookie: as},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(async () => {
  shop = await startTestMcpServer();
  const user = await signUpTestUser(app);
  const other = await signUpTestUser(app);
  cookie = user.cookie;
  otherCookie = other.cookie;
  createdEmails.push(user.email, other.email);
});

afterAll(async () => {
  await shop.close();
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('apps and tools', () => {
  it('requires a signed-in user', async () => {
    expect((await app.request('/api/apps')).status).toBe(401);
  });

  it('starts with the built-in read tools and no apps', async () => {
    const body = await readJson<{builtIn: ToolInfo[]; apps: ConnectedApp[]}>(
      await request('GET', '/api/apps'),
    );

    expect(body.builtIn.map(({name, risk}) => ({name, risk}))).toEqual([
      {name: 'get_current_time', risk: 'read'},
      {name: 'fetch_web_page', risk: 'read'},
    ]);
    expect(body.apps).toEqual([]);
  });

  it('refuses an app it cannot connect to, and saves nothing', async () => {
    const response = await request('POST', '/api/apps', {
      name: 'Shop',
      url: shop.url,
      authorization: 'Bearer wrong-token',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: expect.stringMatching(/^Could not connect to Shop: .*401/),
    });
    const user = await new UserRepository(db).findByEmail(
      createdEmails[0] ?? '',
    );
    expect(
      await new McpServerRepository(db).listForUser(user?.id ?? ''),
    ).toEqual([]);
  });

  it('validates the form', async () => {
    const response = await request('POST', '/api/apps', {
      name: 'Shop',
      url: 'ftp://x',
    });

    expect(response.status).toBe(400);
  });

  it('connects an app and lists its tools with their risk', async () => {
    const response = await request('POST', '/api/apps', {
      name: 'Shop',
      url: shop.url,
      authorization: TEST_MCP_TOKEN,
    });
    const {app: connected} = await readJson<{app: ConnectedApp}>(response);
    appId = connected.id;

    expect(response.status).toBe(201);
    expect(connected).toMatchObject({
      name: 'Shop',
      status: 'active',
      hasAuthorization: true,
    });
    expect(connected.tools.map(({name, risk}) => ({name, risk}))).toEqual([
      {name: 'shop_lookup_order', risk: 'read'},
      {name: 'shop_refund_order', risk: 'write'},
    ]);
  });

  it('never returns the token, and stores it encrypted', async () => {
    const text = await (await request('GET', '/api/apps')).text();
    expect(text).not.toContain('test-mcp-token');

    const user = await new UserRepository(db).findByEmail(
      createdEmails[0] ?? '',
    );
    const [saved] = await new McpServerRepository(db).listForUser(
      user?.id ?? '',
    );
    expect(saved?.encryptedAuth).toBeTruthy();
    expect(saved?.encryptedAuth).not.toContain('test-mcp-token');
  });

  it('marks an app it can no longer reach as "error"', async () => {
    const stopped = await startTestMcpServer();
    const added = await request('POST', '/api/apps', {
      name: 'Gone',
      url: stopped.url,
      authorization: TEST_MCP_TOKEN,
    });
    const {app: gone} = await readJson<{app: ConnectedApp}>(added);
    await stopped.close();

    const {apps} = await readJson<{apps: ConnectedApp[]}>(
      await request('GET', '/api/apps'),
    );
    expect(apps.find((item) => item.id === gone.id)).toMatchObject({
      status: 'error',
      tools: [],
      error: expect.stringContaining('Could not connect to Gone'),
    });
    expect(apps.find((item) => item.id === appId)?.status).toBe('active');
    await request('DELETE', `/api/apps/${gone.id}`);
  });

  it("can't be seen or removed by another user", async () => {
    const {apps} = await readJson<{apps: ConnectedApp[]}>(
      await request('GET', '/api/apps', undefined, otherCookie),
    );
    const remove = await request(
      'DELETE',
      `/api/apps/${appId}`,
      undefined,
      otherCookie,
    );

    expect(apps).toEqual([]);
    expect(remove.status).toBe(404);
  });

  it('removes an app', async () => {
    expect((await request('DELETE', `/api/apps/${appId}`)).status).toBe(204);
    expect((await request('DELETE', `/api/apps/${appId}`)).status).toBe(404);
  });
});

describe('error handling', () => {
  it('answers 400 when a body is not JSON', async () => {
    const response = await app.request('/api/apps', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: '{not json',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'The request body must be JSON.',
    });
  });
});
