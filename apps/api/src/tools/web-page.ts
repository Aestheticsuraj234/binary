import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

// A page is cut to this many characters before the model reads it, which
// keeps each tool call cheap.
const MAX_TEXT_LENGTH = 8000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

/**
 * True for addresses on the public internet. Private, loopback and
 * link-local ranges are refused: the model chooses the URL, and a prompt in
 * a page it read could ask it to reach your router, your database or this
 * API itself (server-side request forgery).
 */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) {
      return isPublicAddress(lower.slice('::ffff:'.length));
    }
    return !(
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    );
  }
  const [a = 0, b = 0] = address.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/** Checks a URL before fetching: http(s) only, and a public host. */
export type UrlGuard = (url: URL) => Promise<void>;

export const publicUrlsOnly: UrlGuard = async (url) => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https pages can be fetched.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [{address: host}]
    : await lookup(host, {all: true});
  if (!addresses.every(({address}) => isPublicAddress(address))) {
    throw new Error(`${url.hostname} is a private address.`);
  }
};

/**
 * Very small HTML-to-text: drop the head (its title is returned on its own),
 * scripts and tags, and keep the readable text.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(head|script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/**
 * Fetches a page and returns its title and readable text. Redirects are
 * followed by hand, so every hop passes the guard again.
 */
export async function fetchPageText(rawUrl: string, guard: UrlGuard) {
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await guard(url);
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {'User-Agent': 'BinaryBot/1.0 (+https://github.com)'},
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) {
      throw new Error(`The page answered with HTTP ${response.status}.`);
    }

    const body = await response.text();
    const isHtml = (response.headers.get('content-type') ?? '').includes(
      'html',
    );
    const text = isHtml ? htmlToText(body) : body.trim();
    const title = isHtml
      ? (/<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1] ?? '').trim()
      : '';
    return {
      url: url.toString(),
      title,
      text: text.slice(0, MAX_TEXT_LENGTH),
      truncated: text.length > MAX_TEXT_LENGTH,
    };
  }
  throw new Error('The page redirected too many times.');
}
