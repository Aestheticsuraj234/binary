import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import {users} from './auth';
import {routineRuns} from './automation';
import {threads} from './chat';
import {
  computerKindEnum,
  computerSessionStatusEnum,
  deviceStatusEnum,
} from './enums';

/** A user's own computer, paired with the Binary Runner. */
export const devices = pgTable(
  'devices',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    name: text().notNull(),
    os: text().notNull(),
    // A short code typed into the Runner once; cleared after pairing.
    pairingCode: text().unique(),
    // SHA-256 of the token the Runner signs in with (Chapter 11). The token
    // itself is only ever on the user's computer.
    tokenHash: text().unique(),
    status: deviceStatusEnum().notNull().default('offline'),
    allowedFolders: text().array().notNull().default([]),
    killSwitch: boolean().notNull().default(false),
    lastSeenAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId)],
);

/** One stretch of time an agent used a computer: a device, sandbox or browser. */
export const computerSessions = pgTable(
  'computer_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    kind: computerKindEnum().notNull(),
    // The id E2B or the browser gives us, so we can resume or close it.
    providerId: text(),
    deviceId: uuid().references(() => devices.id, {onDelete: 'set null'}),
    threadId: uuid().references(() => threads.id, {onDelete: 'set null'}),
    routineRunId: uuid().references(() => routineRuns.id, {
      onDelete: 'set null',
    }),
    status: computerSessionStatusEnum().notNull().default('running'),
    minutesUsed: integer().notNull().default(0),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    closedAt: timestamp({withTimezone: true}),
  },
  (table) => [index().on(table.userId, table.status)],
);
