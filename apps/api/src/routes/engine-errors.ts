import type {Context} from 'hono';

import type {AppEnv} from '../app-env';
import {MissingProviderKeyError} from '../engines/engine-factory';

/**
 * Turns an error from creating or calling an engine into a JSON response.
 * The playground and agent runs share it, so both report errors the same way.
 */
export function engineErrorResponse(c: Context<AppEnv>, error: unknown) {
  if (error instanceof MissingProviderKeyError) {
    return c.json({error: error.message}, 400);
  }
  // A wrong model id, an invalid key or a provider outage all land here.
  // Pass the provider's message on, so the user can fix the cause.
  const message = error instanceof Error ? error.message : 'Unknown error';
  return c.json({error: `The provider returned an error: ${message}`}, 502);
}
