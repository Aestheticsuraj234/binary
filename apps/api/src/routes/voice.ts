import {Hono} from 'hono';

import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {AppError, ProviderError, ValidationError} from '../errors';

// About ten minutes of speech in the phone's compressed format.
export const MAX_RECORDING_BYTES = 10 * 1024 * 1024;

/** POST a recording (multipart, field `audio`); get its text back. */
export function voiceRoutes({voice, agents}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.post('/', async (c) => {
    const transcriber = await voice.forUser(c.get('user').id);
    if (!transcriber) {
      throw new AppError(
        'Voice needs an OpenAI key. Add one in Settings on the web.',
        400,
      );
    }
    const form = await c.req.formData().catch(() => undefined);
    const audio = form?.get('audio');
    if (!(audio instanceof File) || audio.size === 0) {
      throw new ValidationError('Send a recording as `audio`.');
    }
    if (audio.size > MAX_RECORDING_BYTES) {
      throw new AppError('That recording is too long. Keep it short.', 413);
    }

    const hired = await agents.listForUser(c.get('user').id);
    let text: string;
    try {
      text = await transcriber.transcribe(
        new Uint8Array(await audio.arrayBuffer()),
        hired.map((agent) => agent.name),
      );
    } catch (error) {
      throw new ProviderError(error);
    }
    if (!text) {
      throw new ValidationError("Couldn't hear anything. Try again.");
    }
    return c.json({text});
  });

  return routes;
}
