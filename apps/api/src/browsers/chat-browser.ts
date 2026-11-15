import type {BrowserPageOutput} from '@binary/shared';
import type {Browser, BrowserContext, Page, Route} from 'playwright';

import type {UrlGuard} from '../tools/web-page';
import {MARK_ELEMENTS, pageElementsSchema} from './page-elements';

const VIEWPORT = {width: 1280, height: 800};
const NAVIGATION_TIMEOUT_MS = 20_000;
const ACTION_TIMEOUT_MS = 5_000;
// After a click or a submit, how long to give the page to react.
const SETTLE_MS = 400;
// The page text the agent reads; the rest is cut.
const MAX_TEXT_LENGTH = 6000;
const SCREENSHOT_QUALITY = 55;

function clip(text: string): string {
  return text.length > MAX_TEXT_LENGTH
    ? `${text.slice(0, MAX_TEXT_LENGTH)}\n… (cut, ${text.length - MAX_TEXT_LENGTH} more characters)`
    : text;
}

/**
 * One chat's browser: its own context (cookies, tabs) inside the shared
 * Chromium, and the page the agent is looking at.
 *
 * Every request the page makes, including redirects, form posts and images,
 * goes through `guard` first, so a page can't steer the browser to a
 * private address (your router, a database, this API).
 */
export class ChatBrowser {
  private page: Page;
  // Answers per origin, so each host is looked up once.
  private readonly verdicts = new Map<string, Promise<string | undefined>>();
  // Why the last page load was blocked, if it was.
  private blockedNavigation?: string;

  private constructor(
    private readonly context: BrowserContext,
    page: Page,
    private readonly guard: UrlGuard,
  ) {
    this.page = page;
    // A link that opens a new tab: follow it, like a person would.
    context.on('page', (opened) => {
      this.page = opened;
    });
    // Alerts and confirms would block the page; say no to them.
    context.on('dialog', (dialog) => {
      dialog.dismiss().catch(() => {});
    });
  }

  static async create(browser: Browser, guard: UrlGuard) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      acceptDownloads: false,
    });
    const chat = new ChatBrowser(context, await context.newPage(), guard);
    await context.route('**/*', (route) => chat.filter(route));
    return chat;
  }

  async open(url: string): Promise<BrowserPageOutput> {
    this.blockedNavigation = undefined;
    try {
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
    } catch (error) {
      if (this.blockedNavigation) {
        throw new Error(this.blockedNavigation, {cause: error});
      }
      throw new Error(`Could not open ${url}: ${firstLine(error)}`, {
        cause: error,
      });
    }
    return this.snapshot({screenshot: true});
  }

  /** The page as it is now, with fresh refs. No screenshot. */
  read(): Promise<BrowserPageOutput> {
    return this.snapshot({screenshot: false});
  }

  async click(ref: number): Promise<BrowserPageOutput> {
    this.blockedNavigation = undefined;
    await (await this.find(ref)).click({timeout: ACTION_TIMEOUT_MS});
    await this.settle();
    return this.snapshot({screenshot: true});
  }

  async type(
    ref: number,
    text: string,
    submit: boolean,
  ): Promise<BrowserPageOutput> {
    this.blockedNavigation = undefined;
    const field = await this.find(ref);
    await field.fill(text, {timeout: ACTION_TIMEOUT_MS});
    if (submit) {
      await field.press('Enter', {timeout: ACTION_TIMEOUT_MS});
    }
    await this.settle();
    return this.snapshot({screenshot: true});
  }

  async close() {
    await this.context.close().catch(() => {});
  }

  /** The element the agent means; refs come from the latest result. */
  private async find(ref: number) {
    const element = this.page.locator(`[data-binary-ref="${ref}"]`);
    if ((await element.count()) === 0) {
      throw new Error(
        `Nothing on the page has ref ${ref} now. Read the page again (browser_read) for fresh refs.`,
      );
    }
    return element.first();
  }

  private async settle() {
    await this.page.waitForTimeout(SETTLE_MS);
    await this.page
      .waitForLoadState('domcontentloaded', {timeout: NAVIGATION_TIMEOUT_MS})
      .catch(() => {});
  }

  private async snapshot({
    screenshot,
  }: {
    screenshot: boolean;
  }): Promise<BrowserPageOutput> {
    const elements = pageElementsSchema.parse(
      await this.page.evaluate(MARK_ELEMENTS),
    );
    const text = await this.page
      .locator('body')
      .innerText({timeout: ACTION_TIMEOUT_MS})
      .catch(() => '');
    const output: BrowserPageOutput = {
      url: this.page.url(),
      title: await this.page.title(),
      text: clip(text.trim()),
      elements,
    };
    if (this.blockedNavigation) {
      output.blocked = this.blockedNavigation;
    }
    if (screenshot) {
      const image = await this.page.screenshot({
        type: 'jpeg',
        quality: SCREENSHOT_QUALITY,
        timeout: ACTION_TIMEOUT_MS,
      });
      output.screenshot = image.toString('base64');
    }
    return output;
  }

  private async filter(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') {
      await route.continue();
      return;
    }
    const reason = await this.verdict(url);
    if (!reason) {
      await route.continue();
      return;
    }
    if (
      request.isNavigationRequest() &&
      request.frame() === this.page.mainFrame()
    ) {
      this.blockedNavigation = `${reason} The browser did not open it.`;
    }
    await route.abort('blockedbyclient');
  }

  /** Why a URL is refused (from the guard), or undefined if it is allowed. */
  private verdict(url: URL): Promise<string | undefined> {
    const origin = `${url.protocol}//${url.host}`;
    let verdict = this.verdicts.get(origin);
    if (!verdict) {
      verdict = this.guard(url).then(
        () => undefined,
        (error: unknown) => firstLine(error),
      );
      this.verdicts.set(origin, verdict);
    }
    return verdict;
  }
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0] ?? message;
}
