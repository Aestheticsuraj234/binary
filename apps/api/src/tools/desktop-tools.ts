import {tool} from 'ai';
import {z} from 'zod';

import type {ChatDesktop, CloudDesktop} from '../desktops/cloud-desktop';
import type {AgentTool} from './agent-tool';

const SOURCE = 'Cloud desktop';

const NO_DESKTOP = {
  error:
    'This chat has no desktop yet. Use desktop_screenshot or desktop_open first.',
} as const;

const COORDINATES =
  'Coordinates are pixels on the latest screenshot, from the top left.';

/**
 * Tools for the chat's cloud desktop. Looking (a screenshot), opening a
 * page and scrolling change nothing, so they are reads; clicking, typing and
 * pressing keys can do anything a person at the desk could, so they ask
 * first. Every result is the screen afterwards, which the model sees as an
 * image (`showsImage`).
 */
export function desktopTools(desktop: ChatDesktop): AgentTool[] {
  /** Acts on the chat's desktop if it has one, then shows the screen. */
  async function act(action: (computer: CloudDesktop) => Promise<void>) {
    const computer = await desktop.existing();
    if (!computer) {
      return NO_DESKTOP;
    }
    await action(computer);
    return computer.screen();
  }

  /** Acts on the chat's desktop, starting one if needed. */
  async function start(action?: (computer: CloudDesktop) => Promise<void>) {
    const {computer, replaced} = await desktop.open();
    await action?.(computer);
    const screen = await computer.screen();
    return replaced ? {...screen, newDesktop: true} : screen;
  }

  return [
    {
      name: 'desktop_screenshot',
      description: 'See the cloud desktop.',
      risk: 'read',
      source: SOURCE,
      showsImage: true,
      tool: tool({
        description:
          "Take a screenshot of this chat's cloud desktop (a Linux desktop with Firefox), starting it if needed. Look before you click.",
        inputSchema: z.object({}),
        execute: () => start(),
      }),
    },
    {
      name: 'desktop_open',
      description: 'Open a web page or file on the cloud desktop.',
      risk: 'read',
      source: SOURCE,
      showsImage: true,
      tool: tool({
        description:
          'Open a URL in the desktop’s browser (or a file), starting the desktop if needed, and see the screen.',
        inputSchema: z.object({
          target: z.string().min(1).max(2000).describe('A URL or a file path.'),
        }),
        execute: ({target}) => start((computer) => computer.open(target)),
      }),
    },
    {
      name: 'desktop_scroll',
      description: 'Scroll on the cloud desktop.',
      risk: 'read',
      source: SOURCE,
      showsImage: true,
      tool: tool({
        description: `Scroll up or down over a point (the window under it scrolls; default: the middle of the screen), then see the screen. ${COORDINATES}`,
        inputSchema: z.object({
          direction: z.enum(['up', 'down']),
          amount: z.number().int().min(1).max(10).default(3),
          x: z.number().int().min(0).max(4000).default(512),
          y: z.number().int().min(0).max(4000).default(384),
        }),
        execute: ({direction, amount, x, y}) =>
          act((computer) => computer.scroll(direction, amount, {x, y})),
      }),
    },
    {
      name: 'desktop_click',
      description: 'Click on the cloud desktop.',
      risk: 'computer',
      source: SOURCE,
      showsImage: true,
      tool: tool({
        description: `Click at a point on the desktop, then see the screen. ${COORDINATES}`,
        inputSchema: z.object({
          x: z.number().int().min(0).max(4000),
          y: z.number().int().min(0).max(4000),
          button: z.enum(['left', 'right']).default('left'),
          double: z.boolean().default(false),
        }),
        execute: ({x, y, button, double}) =>
          act((computer) => computer.click(x, y, {button, double})),
      }),
    },
    {
      name: 'desktop_type',
      description: 'Type on the cloud desktop.',
      risk: 'computer',
      source: SOURCE,
      showsImage: true,
      tool: tool({
        description:
          'Type text where the cursor is (click a field first), then see the screen.',
        inputSchema: z.object({text: z.string().min(1).max(2000)}),
        execute: ({text}) => act((computer) => computer.type(text)),
      }),
    },
    {
      name: 'desktop_key',
      description: 'Press keys on the cloud desktop.',
      risk: 'computer',
      source: SOURCE,
      showsImage: true,
      tool: tool({
        description:
          'Press a key or a combination, e.g. "enter", "ctrl+l", "alt+tab", then see the screen.',
        inputSchema: z.object({keys: z.string().min(1).max(60)}),
        execute: ({keys}) =>
          act((computer) =>
            computer.press(keys.split('+').map((key) => key.trim())),
          ),
      }),
    },
  ];
}
