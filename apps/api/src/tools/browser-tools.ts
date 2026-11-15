import {tool} from 'ai';
import {z} from 'zod';

import type {ChatBrowserAccess} from '../browsers/browser-sessions';
import type {AgentTool} from './agent-tool';
import {withoutImages} from './model-view';

const SOURCE = 'Browser';

const NO_BROWSER = {
  error: 'This chat has no browser open. Use browser_open first.',
} as const;

const REFS =
  'Every result lists the page\'s links, buttons and fields as "elements", each with a ref number. Refs change whenever the page changes; use the ones from the latest result.';

const refSchema = z
  .number()
  .int()
  .positive()
  .describe('The ref of the element, from the latest result.');

/**
 * Tools for the chat's headless browser. Opening and reading a page only
 * look (like fetch_web_page), so they are reads; clicking and typing can
 * submit forms, buy, send or delete, so they control a computer and ask
 * first in every approval mode.
 */
export function browserTools(browser: ChatBrowserAccess): AgentTool[] {
  return [
    {
      name: 'browser_open',
      description: 'Open a public web page in the browser.',
      risk: 'read',
      source: SOURCE,
      forModel: withoutImages,
      tool: tool({
        description: `Open a public web page in this chat's browser and get its text and elements. The user sees a screenshot. ${REFS}`,
        inputSchema: z.object({
          url: z
            .url({protocol: /^https?$/})
            .describe('The full https:// address.'),
        }),
        execute: async ({url}) => (await browser.start()).open(url),
      }),
    },
    {
      name: 'browser_read',
      description: 'Read the page the browser is on.',
      risk: 'read',
      source: SOURCE,
      forModel: withoutImages,
      tool: tool({
        description: `Read the page this chat's browser is on again: its text and elements, with fresh refs. ${REFS}`,
        inputSchema: z.object({}),
        execute: async () => {
          const chat = await browser.existing();
          return chat ? chat.read() : NO_BROWSER;
        },
      }),
    },
    {
      name: 'browser_click',
      description: 'Click a link or button in the browser.',
      risk: 'computer',
      source: SOURCE,
      forModel: withoutImages,
      tool: tool({
        description: `Click a link, button or checkbox on the page, by its ref. ${REFS}`,
        inputSchema: z.object({ref: refSchema}),
        execute: async ({ref}) => {
          const chat = await browser.existing();
          return chat ? chat.click(ref) : NO_BROWSER;
        },
      }),
    },
    {
      name: 'browser_type',
      description: 'Type into a field in the browser.',
      risk: 'computer',
      source: SOURCE,
      forModel: withoutImages,
      tool: tool({
        description: `Type text into a field on the page, by its ref, replacing what is there. Set submit to press Enter afterwards (to search or send a form). ${REFS}`,
        inputSchema: z.object({
          ref: refSchema,
          text: z.string().max(2000),
          submit: z.boolean().default(false),
        }),
        execute: async ({ref, text, submit}) => {
          const chat = await browser.existing();
          return chat ? chat.type(ref, text, submit) : NO_BROWSER;
        },
      }),
    },
  ];
}
