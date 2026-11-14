import type {Context} from 'hono';

import type {AppEnv} from '../app-env';
import {MissingProviderKeyError} from '../engines/engine-factory';

/**
 * Turns an error from creating or calling an engine into a JSON response.
 * The playground and chat share it, so both report errors the same way.
 */
export function engineErrorResponse(c: Context<AppEnv>, error: unknown) {
  if (error instanceof MissingProviderKeyError) {
    return c.json({error: error.message}, 400);
  }
  return c.json({error: providerErrorMessage(error)}, 502);
}

/**
 * A wrong model id, an invalid key or a provider outage all land here.
 * Pass the provider's message on, so the user can fix the cause.
 */
export function providerErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return `The provider returned an error: ${message}`;
}
