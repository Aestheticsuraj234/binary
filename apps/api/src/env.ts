import {z} from 'zod';

// Reading every setting through one schema means a missing or broken value
// stops the server at startup with a clear message, not deep inside a request.
const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters.'),
  BETTER_AUTH_URL: z.url(),
  WEB_URL: z.url(),
  // Master key that encrypts users' LLM API keys. 32 random bytes, base64.
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'ENCRYPTION_KEY must be 32 bytes, base64. Run: openssl rand -base64 32',
    ),
  PORT: z.coerce.number().default(4000),
  // Optional (Chapter 7). With it, routines run on Trigger.dev; without it,
  // they run inside the API and schedules don't fire. Empty means unset.
  TRIGGER_SECRET_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  // Optional (Chapter 9). With it, agents can be given an E2B cloud sandbox.
  E2B_API_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

export const env = envSchema.parse(process.env);
