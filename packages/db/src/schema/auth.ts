import {boolean, pgTable, text, timestamp} from 'drizzle-orm/pg-core';

// These four tables belong to Better Auth. Their columns must match what
// Better Auth expects, so change them only when Better Auth says so.

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp({withTimezone: true})
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable('sessions', {
  id: text().primaryKey(),
  token: text().notNull().unique(),
  expiresAt: timestamp({withTimezone: true}).notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => users.id, {onDelete: 'cascade'}),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp({withTimezone: true})
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable('accounts', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => users.id, {onDelete: 'cascade'}),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({withTimezone: true}),
  refreshTokenExpiresAt: timestamp({withTimezone: true}),
  scope: text(),
  // Hashed by Better Auth. Never stored in plain text.
  password: text(),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp({withTimezone: true})
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verifications = pgTable('verifications', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({withTimezone: true}).notNull(),
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp({withTimezone: true})
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
