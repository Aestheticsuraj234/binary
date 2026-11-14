import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

import {agents} from './agents';

/**
 * Length of every embedding vector. 1536 matches OpenAI's
 * text-embedding-3-small; Chapter 12 explains how embeddings are created.
 */
export const EMBEDDING_DIMENSIONS = 1536;

/** Something an agent remembers, stored with a vector for similarity search. */
export const memories = pgTable(
  'memories',
  {
    id: uuid().primaryKey().defaultRandom(),
    agentId: uuid()
      .notNull()
      .references(() => agents.id, {onDelete: 'cascade'}),
    content: text().notNull(),
    embedding: vector({dimensions: EMBEDDING_DIMENSIONS}).notNull(),
    // Where the memory came from, e.g. a thread id or "manual".
    source: text().notNull().default('manual'),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.agentId),
    // An HNSW index makes "find the most similar memories" fast.
    index('memories_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);
