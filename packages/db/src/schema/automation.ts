import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import {agents} from './agents';
import {users} from './auth';
import {threads} from './chat';
import {runStatusEnum, taskStatusEnum, triggerTypeEnum} from './enums';

/** A job an agent runs again and again, e.g. "Summarize my inbox every morning". */
export const routines = pgTable(
  'routines',
  {
    id: uuid().primaryKey().defaultRandom(),
    agentId: uuid()
      .notNull()
      .references(() => agents.id, {onDelete: 'cascade'}),
    name: text().notNull(),
    prompt: text().notNull(),
    enabled: boolean().notNull().default(true),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.agentId)],
);

/** What starts a routine: a schedule, a webhook call, or a button press. */
export const triggers = pgTable(
  'triggers',
  {
    id: uuid().primaryKey().defaultRandom(),
    routineId: uuid()
      .notNull()
      .references(() => routines.id, {onDelete: 'cascade'}),
    type: triggerTypeEnum().notNull(),
    // Set only for type "cron", e.g. "0 9 * * 1-5".
    cron: text(),
    // Set only for type "webhook"; callers must send it to start the routine.
    webhookSecret: text(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.routineId)],
);

/** One run of a routine, with its own thread holding the full transcript. */
export const routineRuns = pgTable(
  'routine_runs',
  {
    id: uuid().primaryKey().defaultRandom(),
    routineId: uuid()
      .notNull()
      .references(() => routines.id, {onDelete: 'cascade'}),
    threadId: uuid().references(() => threads.id, {onDelete: 'set null'}),
    status: runStatusEnum().notNull().default('queued'),
    error: text(),
    startedAt: timestamp({withTimezone: true}),
    finishedAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.routineId, table.createdAt)],
);

/** A to-do on the task board, owned by the user or handed to an agent. */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    title: text().notNull(),
    status: taskStatusEnum().notNull().default('todo'),
    // Empty means the task is assigned to the user.
    assigneeAgentId: uuid().references(() => agents.id, {
      onDelete: 'set null',
    }),
    dueDate: date(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true})
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.userId, table.status)],
);
