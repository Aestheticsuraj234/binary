import type {AddressInfo} from 'node:net';

import {serve} from '@hono/node-server';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {
  fetchPageText,
  htmlToText,
  isPublicAddress,
  publicUrlsOnly,
  type UrlGuard,
} from './web-page';

describe('isPublicAddress', () => {
  it.each(['8.8.8.8', '104.16.1.1', '2606:4700::1111'])('allows %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.20.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('refuses the private address %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });
});

describe('publicUrlsOnly', () => {
  it('refuses localhost, private IPs and other protocols', async () => {
    await expect(
      publicUrlsOnly(new URL('http://localhost:4000/api/me')),
    ).rejects.toThrow('private address');
    await expect(
      publicUrlsOnly(new URL('http://169.254.169.254/latest')),
    ).rejects.toThrow('private address');
    await expect(publicUrlsOnly(new URL('file:///etc/passwd'))).rejects.toThrow(
      'Only http and https',
    );
  });
});

describe('htmlToText', () => {
  it('keeps the words and drops scripts, styles and tags', () => {
    const text = htmlToText(
      '<style>p{}</style><h1>Hi</h1><p>Fish &amp; chips<br>today</p><script>evil()</script>',
    );

    expect(text).toBe('Hi\nFish & chips\ntoday');
  });
});

describe('fetchPageText', () => {
  let site: ReturnType<typeof serve>;
  let base = '';
  // Tests talk to a local server, so they use a guard that allows only it.
  const onlyThisSite: UrlGuard = async (url) => {
    if (url.origin !== base) {
      throw new Error(`${url.hostname} is a private address.`);
    }
  };

  beforeAll(async () => {
    site = serve({
      port: 0,
      fetch: (request) => {
        const {pathname} = new URL(request.url);
        if (pathname === '/moved') {
          return new Response(null, {
            status: 302,
            headers: {location: '/page'},
          });
        }
        if (pathname === '/escape') {
          return new Response(null, {
            status: 302,
            headers: {location: 'http://169.254.169.254/'},
          });
        }
        return new Response(
          '<html><head><title>Mugs</title></head><body><p>Two mugs.</p></body></html>',
          {headers: {'content-type': 'text/html'}},
        );
      },
    });
    await new Promise((resolve) => site.once('listening', resolve));
    base = `http://localhost:${(site.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    site.close();
  });

  it('returns the title and readable text, following redirects', async () => {
    const page = await fetchPageText(`${base}/moved`, onlyThisSite);

    expect(page).toEqual({
      url: `${base}/page`,
      title: 'Mugs',
      text: 'Two mugs.',
      truncated: false,
    });
  });

  it('checks every redirect, not only the first address', async () => {
    await expect(fetchPageText(`${base}/escape`, onlyThisSite)).rejects.toThrow(
      'private address',
    );
  });
});
