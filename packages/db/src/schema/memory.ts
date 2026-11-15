import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

import {agents} from './agents';
import {users} from './auth';

/**
 * Length of every embedding vector. 1536 matches OpenAI's
 * text-embedding-3-small; Google's gemini-embedding-001 is asked for the
 * same length, so both fit one column.
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
    // Which model made the embedding: vectors from different models can't
    // be compared, so search only looks at rows from the current one.
    embeddingModel: text().notNull().default(''),
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

/** A document the user added to their knowledge: pasted text, a page, a file. */
export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    title: text().notNull(),
    // "text", "url" or "file"; the URL when it came from a web page.
    source: text().notNull(),
    sourceUrl: text(),
    characters: integer().notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId)],
);

/** One passage of a document, with the vector that finds it. */
export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid().primaryKey().defaultRandom(),
    documentId: uuid()
      .notNull()
      .references(() => knowledgeDocuments.id, {onDelete: 'cascade'}),
    // Copied from the document, so a search filters without a join.
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    position: integer().notNull(),
    content: text().notNull(),
    embedding: vector({dimensions: EMBEDDING_DIMENSIONS}).notNull(),
    embeddingModel: text().notNull(),
  },
  (table) => [
    index().on(table.documentId),
    index().on(table.userId),
    index('knowledge_chunks_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);
