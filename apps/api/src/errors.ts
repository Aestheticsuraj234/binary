import {PROVIDER_INFO, type Provider} from '@binary/shared';
import type {Context} from 'hono';
import type {ContentfulStatusCode} from 'hono/utils/http-status';
import type {z} from 'zod';

/**
 * An error we expect and can explain to the user. Routes simply throw one;
 * `app.onError` turns it into `{error: message}` with the right status.
 * Anything that is not an AppError is a bug and becomes a plain 500.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The request is wrong: bad JSON, a missing field, a value out of range. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/** It does not exist, or it belongs to someone else (we never say which). */
export class NotFoundError extends AppError {
  constructor(what: string) {
    super(`${what} not found.`, 404);
  }
}

/** The user asked for a provider they have not added a key for. */
export class MissingProviderKeyError extends AppError {
  constructor(provider: Provider) {
    super(
      `Add your ${PROVIDER_INFO[provider].label} API key in Settings first.`,
      400,
    );
  }
}

/**
 * The model's provider failed: a wrong model id, an invalid key, an outage.
 * The provider's own message is passed on, so the user can fix the cause.
 */
export class ProviderError extends AppError {
  constructor(cause: unknown) {
    super(providerErrorMessage(cause), 502);
  }
}

/** A connected app (MCP server) could not be reached or answered badly. */
export class AppConnectionError extends AppError {
  constructor(appName: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : 'Unknown error';
    super(`Could not connect to ${appName}: ${reason}`, 400);
  }
}

export function providerErrorMessage(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : 'Unknown error';
  return `The provider returned an error: ${message}`;
}

/**
 * Reads and validates a JSON body. Throws a ValidationError with the first
 * problem's message, including when the body is not JSON at all.
 */
export async function parseBody<T extends z.ZodType>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new ValidationError('The request body must be JSON.');
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues[0]?.message ?? 'Check the request.',
    );
  }
  return result.data;
}
