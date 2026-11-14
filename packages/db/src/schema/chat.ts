import {sql} from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import {agents} from './agents';
import {users} from './auth';
import {
  approvalStatusEnum,
  clientEnum,
  messageRoleEnum,
  routingModeEnum,
  toolCallStatusEnum,
  toolRiskEnum,
} from './enums';

/** A group chat where several agents work together. */
export const rooms = pgTable(
  'rooms',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    name: text().notNull(),
    routingMode: routingModeEnum().notNull().default('mention'),
    leadAgentId: uuid().references(() => agents.id, {onDelete: 'set null'}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId)],
);

/** Which agents are in which room (many-to-many). */
export const roomMembers = pgTable(
  'room_members',
  {
    roomId: uuid()
      .notNull()
      .references(() => rooms.id, {onDelete: 'cascade'}),
    agentId: uuid()
      .notNull()
      .references(() => agents.id, {onDelete: 'cascade'}),
  },
  (table) => [primaryKey({columns: [table.roomId, table.agentId]})],
);

/** A conversation, either with one agent or inside a room. */
export const threads = pgTable(
  'threads',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    title: text().notNull().default('New chat'),
    agentId: uuid().references(() => agents.id, {onDelete: 'cascade'}),
    roomId: uuid().references(() => rooms.id, {onDelete: 'cascade'}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true})
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index().on(table.userId),
    // A thread belongs to exactly one agent OR one room, never both or neither.
    check(
      'threads_agent_or_room',
      sql`(${table.agentId} IS NULL) <> (${table.roomId} IS NULL)`,
    ),
  ],
);

/** One message in a thread, from the user, an agent, or a tool result. */
export const messages = pgTable(
  'messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    threadId: uuid()
      .notNull()
      .references(() => threads.id, {onDelete: 'cascade'}),
    role: messageRoleEnum().notNull(),
    // Which agent wrote it (useful in rooms). Empty for user messages.
    authorAgentId: uuid().references(() => agents.id, {onDelete: 'set null'}),
    content: text().notNull(),
    attachments: jsonb().$type<string[]>().notNull().default([]),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.threadId, table.createdAt)],
);

/** A tool the agent asked to run while writing a message. */
export const toolCalls = pgTable(
  'tool_calls',
  {
    id: uuid().primaryKey().defaultRandom(),
    messageId: uuid()
      .notNull()
      .references(() => messages.id, {onDelete: 'cascade'}),
    toolName: text().notNull(),
    input: jsonb().notNull(),
    output: jsonb(),
    risk: toolRiskEnum().notNull(),
    status: toolCallStatusEnum().notNull().default('pending'),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    finishedAt: timestamp({withTimezone: true}),
  },
  (table) => [index().on(table.messageId)],
);

/** A risky tool call waiting for the user to approve or reject it. */
export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    toolCallId: uuid()
      .notNull()
      .unique()
      .references(() => toolCalls.id, {onDelete: 'cascade'}),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    status: approvalStatusEnum().notNull().default('pending'),
    summary: text().notNull(),
    decidedAt: timestamp({withTimezone: true}),
    decidedFrom: clientEnum(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId, table.status)],
);
