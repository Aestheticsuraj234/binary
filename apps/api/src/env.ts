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
  PORT: z.coerce.number().default(4000),
});

export const env = envSchema.parse(process.env);
