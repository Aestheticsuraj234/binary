import {z} from 'zod';

/** Something an agent remembers, as its Memory page shows it. */
export interface MemoryView {
  id: string;
  content: string;
  /** Saved by the agent during a chat, or added by the user. */
  from: 'chat' | 'you';
  createdAt: string;
}

/**
 * Whether memory and knowledge work for this user: they need an embedding
 * model, from an OpenAI or Google key.
 */
export interface MemoryStatus {
  available: boolean;
  /** e.g. "openai/text-embedding-3-small". */
  model: string | null;
  /** Saved with another model (another key since): not searchable. */
  unsearchable: number;
}

export const addMemorySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write what to remember.')
    .max(500, 'Keep a memory under 500 characters.'),
});

/** The largest document Binary takes (about 50 pages of text). */
export const MAX_DOCUMENT_LENGTH = 200_000;

const title = z
  .string()
  .trim()
  .min(1, 'Give it a title.')
  .max(120, 'Keep the title under 120 characters.');

const text = z
  .string()
  .trim()
  .min(1, 'There is no text to add.')
  .max(
    MAX_DOCUMENT_LENGTH,
    `Keep it under ${MAX_DOCUMENT_LENGTH.toLocaleString('en')} characters.`,
  );

/** Pasted text, a text or Markdown file, or a public web page. */
export const addDocumentSchema = z.discriminatedUnion('source', [
  z.object({source: z.literal('text'), title, text}),
  z.object({source: z.literal('file'), title, text}),
  z.object({
    source: z.literal('url'),
    url: z.url({
      protocol: /^https?$/,
      error: 'Paste a web address starting with https://',
    }),
  }),
]);

export type AddDocumentInput = z.infer<typeof addDocumentSchema>;

/** A document in the user's knowledge. */
export interface KnowledgeDocumentView {
  id: string;
  title: string;
  source: 'text' | 'url' | 'file';
  sourceUrl: string | null;
  characters: number;
  /** How many passages it was cut into. */
  chunks: number;
  createdAt: string;
}

/** A passage found by a search, as the agent and the chat see it. */
export interface KnowledgeMatch {
  documentId: string;
  title: string;
  sourceUrl: string | null;
  content: string;
  /** 0 to 1: how close in meaning to the question. */
  score: number;
}
