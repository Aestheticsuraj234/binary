import {chromium, type Browser} from 'playwright';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {startTestWebSite} from '../test-web-site';
import {publicUrlsOnly, type UrlGuard} from '../tools/web-page';
import {ChatBrowser} from './chat-browser';

// Real Chromium against a local site. Tests may reach the site but not the
// "secret" server, which plays the part of a private address.
let browser: Browser;
let site: Awaited<ReturnType<typeof startTestWebSite>>;
let secret: Awaited<ReturnType<typeof startTestWebSite>>;
let guard: UrlGuard;

beforeAll(async () => {
  browser = await chromium.launch();
  secret = await startTestWebSite();
  site = await startTestWebSite({secretUrl: `${secret.url}/secret`});
  guard = async (url) => {
    if (url.port === secret.port) {
      throw new Error(`${url.hostname} is a private address.`);
    }
  };
});

afterAll(async () => {
  await browser.close();
  await site.close();
  await secret.close();
});

describe('ChatBrowser', () => {
  it('opens a page and lists what can be clicked, with refs', async () => {
    const chat = await ChatBrowser.create(browser, guard);
    const page = await chat.open(site.url);

    expect(page).toMatchObject({
      url: `${site.url}/`,
      title: 'Test Shop',
      elements: [
        {ref: 1, kind: 'link', text: 'Pricing', href: '/pricing'},
        {ref: 2, kind: 'textbox', text: 'Search products'},
        {ref: 3, kind: 'button', text: 'Search'},
        {ref: 4, kind: 'link', text: 'Docs', href: '/docs'},
      ],
    });
    expect(page.text).toContain('We sell mugs.');
    // A JPEG for the user to see.
    expect(Buffer.from(page.screenshot ?? '', 'base64').subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8]),
    );
    expect((await chat.read()).screenshot).toBeUndefined();
    await chat.close();
  });

  it('clicks by ref, and types and submits a search', async () => {
    const chat = await ChatBrowser.create(browser, guard);
    await chat.open(site.url);

    expect(await chat.click(1)).toMatchObject({title: 'Pricing'});
    await chat.open(site.url);
    const results = await chat.type(2, 'blue mugs', true);
    expect(results.url).toBe(`${site.url}/search?q=blue+mugs`);
    expect(results.text).toContain('Results for blue mugs');
    await chat.close();
  });

  it('follows a link that opens a new tab', async () => {
    const chat = await ChatBrowser.create(browser, guard);
    await chat.open(site.url);

    expect(await chat.click(4)).toMatchObject({title: 'Docs'});
    await chat.close();
  });

  it('says clearly when a ref is not on the page', async () => {
    const chat = await ChatBrowser.create(browser, guard);
    await chat.open(`${site.url}/pricing`);

    await expect(chat.click(9)).rejects.toThrow(
      'Nothing on the page has ref 9 now. Read the page again (browser_read) for fresh refs.',
    );
    await chat.close();
  });

  it('is not stopped by an alert', async () => {
    const chat = await ChatBrowser.create(browser, guard);

    expect((await chat.open(`${site.url}/alert`)).text).toContain('Still here');
    await chat.close();
  });

  it('refuses to open a private address', async () => {
    const chat = await ChatBrowser.create(browser, guard);

    await expect(chat.open(`${secret.url}/secret`)).rejects.toThrow(
      '127.0.0.1 is a private address. The browser did not open it.',
    );
    await chat.close();
  });

  it('blocks a link from a public page to a private one', async () => {
    const chat = await ChatBrowser.create(browser, guard);
    await chat.open(`${site.url}/leak`);

    const after = await chat.click(1);
    expect(after.blocked).toBe(
      '127.0.0.1 is a private address. The browser did not open it.',
    );
    expect(after.text).not.toContain('router password');
    await chat.close();
  });

  it('uses the real guard by default rules: loopback is private', async () => {
    const chat = await ChatBrowser.create(browser, publicUrlsOnly);

    await expect(chat.open(site.url)).rejects.toThrow('private address');
    await chat.close();
  });
});
