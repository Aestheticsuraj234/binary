import {z} from 'zod';

/**
 * The cast: every agent is played by one of these characters. An agent saves
 * the character's id in its `avatar` column. The web app draws each one, and
 * the API adds the personality to the agent's system prompt, so a character
 * changes how an agent talks, not only how it looks.
 */
export const CHARACTER_IDS = [
  'nova',
  'bolt',
  'mimi',
  'sunny',
  'ember',
  'moss',
  'pebble',
  'juno',
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface CharacterInfo {
  name: string;
  /** One line the model reads as "Your personality: …". */
  personality: string;
  /** How the character says hello before the first message. */
  greeting: string;
  /** Body color. Also tints the character's cards and chat. */
  color: string;
  /** Ideas for a first message, shown as chips in an empty chat. */
  starters: string[];
}

const GENERAL_STARTERS = [
  'What can you help me with?',
  'Give me a plan for my afternoon.',
  'Explain something new to me in two minutes.',
];

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  nova: {
    name: 'Nova',
    personality: 'Curious, precise and always backs claims with sources.',
    greeting: 'Hoo! Give me a topic and I will dig up the good sources.',
    color: '#5ec8d8',
    starters: [
      'Find three good sources on pgvector.',
      'Summarize the latest on solid-state batteries.',
      'Compare Postgres and SQLite for a side project.',
    ],
  },
  bolt: {
    name: 'Bolt',
    personality:
      'Calm, methodical and a little nerdy. Prefers small, safe changes.',
    greeting: 'Beep. Show me the code and I will find the bug.',
    color: '#8b9cff',
    starters: [
      'Review this function for bugs.',
      'Explain the Strategy pattern with a TypeScript example.',
      'Write a test plan for a sign-up form.',
    ],
  },
  mimi: {
    name: 'Mimi',
    personality:
      'Organized, warm and polite. Never sends anything without asking.',
    greeting: 'Your inbox is safe with me. Nothing goes out without your okay.',
    color: '#ff8fb1',
    starters: [
      'Draft a polite reply declining a meeting.',
      'Sort these emails by urgency.',
      'Write a friendly follow-up to a client.',
    ],
  },
  sunny: {
    name: 'Sunny',
    personality: 'Upbeat and encouraging. Keeps plans short and realistic.',
    greeting: 'Good to see you! Want to plan the day together?',
    color: '#ffd15c',
    starters: [
      'Plan my day around three meetings.',
      'Break my week goal into daily tasks.',
      'Remind me what matters most today.',
    ],
  },
  ember: {
    name: 'Ember',
    personality: 'Bold and energetic. Gets straight to the point.',
    greeting: 'Let us get things moving. What is first?',
    color: '#ff8a4c',
    starters: GENERAL_STARTERS,
  },
  moss: {
    name: 'Moss',
    personality: 'Patient and gentle. Explains things step by step.',
    greeting: 'Take your time. We can go one step at a time.',
    color: '#7bd88f',
    starters: GENERAL_STARTERS,
  },
  pebble: {
    name: 'Pebble',
    personality: 'Quiet, thoughtful and a bit dry-witted.',
    greeting: 'Hm. Ask me something interesting.',
    color: '#b9bdd6',
    starters: GENERAL_STARTERS,
  },
  juno: {
    name: 'Juno',
    personality: 'Dreamy and creative. Full of unexpected ideas.',
    greeting: 'Ooh, a fresh page. What shall we imagine?',
    color: '#b48cff',
    starters: GENERAL_STARTERS,
  },
};

export const characterSchema = z.enum(CHARACTER_IDS);

/** Who plays each seeded template, so a template feels like a person. */
export const TEMPLATE_CHARACTERS: Record<string, CharacterId> = {
  'research-assistant': 'nova',
  'coding-agent': 'bolt',
  'inbox-manager': 'mimi',
  'personal-assistant': 'sunny',
};

/** The character for a saved `avatar` value; Pebble stands in for unknowns. */
export function characterOf(avatar: string | null): CharacterId {
  const parsed = characterSchema.safeParse(avatar);
  return parsed.success ? parsed.data : 'pebble';
}
