import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import {users} from './auth';
import {
  agentEngineEnum,
  approvalModeEnum,
  computerKindEnum,
  providerEnum,
} from './enums';

/** A user's own API key for an LLM provider, stored encrypted. */
export const providerKeys = pgTable(
  'provider_keys',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    provider: providerEnum().notNull(),
    encryptedKey: text().notNull(),
    iv: text().notNull(),
    // Shown in the UI ("sk-...a1b2") so the full key never leaves the server.
    last4: text().notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  // One key per provider per user.
  (table) => [unique().on(table.userId, table.provider)],
);

/** A ready-made starting point for a new agent, e.g. "Research assistant". */
export const agentTemplates = pgTable('agent_templates', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  role: text().notNull(),
  instructions: text().notNull(),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
});

/** An AI coworker owned by one user. */
export const agents = pgTable(
  'agents',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    templateId: uuid().references(() => agentTemplates.id, {
      onDelete: 'set null',
    }),
    name: text().notNull(),
    avatar: text(),
    role: text().notNull(),
    instructions: text().notNull().default(''),
    engine: agentEngineEnum().notNull().default('api'),
    // Only used when engine is "api".
    provider: providerEnum(),
    model: text(),
    approvalMode: approvalModeEnum().notNull().default('ask_first'),
    defaultComputer: computerKindEnum(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true})
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.userId)],
);

/** Saved instructions an agent can load, e.g. "Write in a friendly tone". */
export const skills = pgTable(
  'skills',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    name: text().notNull(),
    instructions: text().notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId)],
);

/** Which skills each agent uses (many-to-many). */
export const agentSkills = pgTable(
  'agent_skills',
  {
    agentId: uuid()
      .notNull()
      .references(() => agents.id, {onDelete: 'cascade'}),
    skillId: uuid()
      .notNull()
      .references(() => skills.id, {onDelete: 'cascade'}),
  },
  (table) => [primaryKey({columns: [table.agentId, table.skillId]})],
);
