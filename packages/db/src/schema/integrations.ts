import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import {agents} from './agents';
import {users} from './auth';
import {routineRuns} from './automation';
import {mcpServerStatusEnum} from './enums';

/** An MCP server the user connected, e.g. Gmail through Composio. */
export const mcpServers = pgTable(
  'mcp_servers',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    name: text().notNull(),
    url: text().notNull(),
    // Optional auth header for the server, stored encrypted like API keys.
    encryptedAuth: text(),
    iv: text(),
    status: mcpServerStatusEnum().notNull().default('active'),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId)],
);

/** Cost of one model call (or sandbox use), for the usage dashboard. */
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    agentId: uuid().references(() => agents.id, {onDelete: 'set null'}),
    routineRunId: uuid().references(() => routineRuns.id, {
      onDelete: 'set null',
    }),
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    // Stored as an exact decimal; floats would drift when summed.
    costUsd: numeric({precision: 12, scale: 6}).notNull().default('0'),
    sandboxMinutes: integer().notNull().default(0),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId, table.createdAt)],
);
