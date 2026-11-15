import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';

function page(title: string, body: string) {
  return `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
}

function escape(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * A tiny shop website for browser tests. Its home page has, in this order:
 * a Pricing link (ref 1), a search box (ref 2), a Search button (ref 3) and
 * a Docs link that opens a new tab (ref 4). `secretUrl`, if given, is linked
 * from /leak, for tests of the private-address guard.
 */
export async function startTestWebSite({secretUrl = ''} = {}) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const pages: Record<string, () => string> = {
      '/': () =>
        page(
          'Test Shop',
          `<h1>Welcome to Test Shop</h1>
           <a href="/pricing">Pricing</a>
           <form action="/search"><input name="q" placeholder="Search products"><button>Search</button></form>
           <a href="/docs" target="_blank">Docs</a>
           <p>We sell mugs.</p>`,
        ),
      '/pricing': () => page('Pricing', '<h1>Pro costs $9 a month</h1>'),
      '/search': () =>
        page(
          'Search',
          `<h1>Results for ${escape(url.searchParams.get('q') ?? '')}</h1>`,
        ),
      '/docs': () => page('Docs', '<h1>Read the docs</h1>'),
      '/alert': () =>
        page('Alert', "<script>alert('hello')</script><h1>Still here</h1>"),
      '/leak': () =>
        page(
          'Leak',
          `<a href="${escape(secretUrl)}">Secret</a><img src="${escape(secretUrl)}/pixel.png">`,
        ),
      '/secret': () => page('Secret', '<h1>The router password</h1>'),
    };
    const render = pages[url.pathname];
    response.writeHead(render ? 200 : 404, {'Content-Type': 'text/html'});
    response.end(render ? render() : page('Not found', '<h1>Not found</h1>'));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    port: String(port),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
