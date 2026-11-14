import {tool} from 'ai';
import {z} from 'zod';

import type {AgentTool} from './agent-tool';
import {fetchPageText, publicUrlsOnly, type UrlGuard} from './web-page';

const SOURCE = 'Binary';

const currentTime: AgentTool = {
  name: 'get_current_time',
  description: 'Get the current date and time, optionally in a time zone.',
  risk: 'read',
  source: SOURCE,
  tool: tool({
    description:
      'Get the current date and time. Use it whenever the answer depends on today, now or a deadline.',
    inputSchema: z.object({
      timeZone: z
        .string()
        .optional()
        .describe('An IANA time zone such as "Asia/Kolkata". Defaults to UTC.'),
    }),
    execute: async ({timeZone = 'UTC'}) => {
      const now = new Date();
      return {
        iso: now.toISOString(),
        timeZone,
        local: now.toLocaleString('en-GB', {
          timeZone,
          dateStyle: 'full',
          timeStyle: 'short',
        }),
      };
    },
  }),
};

function webPage(guard: UrlGuard): AgentTool {
  return {
    name: 'fetch_web_page',
    description: 'Read the text of a public web page.',
    risk: 'read',
    source: SOURCE,
    tool: tool({
      description:
        'Fetch a public web page and return its title and text (first 8,000 characters). Use it to read sources before answering.',
      inputSchema: z.object({
        url: z.url().describe('The full https:// address.'),
      }),
      execute: async ({url}) => fetchPageText(url, guard),
    }),
  };
}

/**
 * The tools every agent has, before any app is connected. `guard` decides
 * which addresses the web page tool may reach; tests pass a looser one.
 */
export function builtInTools(guard: UrlGuard = publicUrlsOnly): AgentTool[] {
  return [currentTime, webPage(guard)];
}
