import {deleteUsersByEmail} from '@binary/db/test-utils';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {createApp} from '../app';
import {createDependencies} from '../container';
import {db} from '../db';
import {readJson, signUpTestUser} from '../test-helpers';
import {MAX_RECORDING_BYTES} from './voice';

/** What the fake transcriber was given: the key and the audio. */
const heard: {apiKey: string; bytes: number; names: string[]}[] = [];
let answer = 'Plan my week, please.';
let fails = false;

const app = createApp(
  createDependencies(undefined, {
    sandboxProvider: null,
    desktopProvider: null,
    browserGuard: null,
    createTranscriber: (apiKey) => ({
      async transcribe(audio, names) {
        heard.push({apiKey, bytes: audio.length, names});
        if (fails) {
          throw new Error('Invalid file format.');
        }
        return answer;
      },
    }),
  }),
);
const createdEmails: string[] = [];
let cookie = '';

function send(audio?: Blob, as = cookie) {
  const form = new FormData();
  if (audio) {
    form.append('audio', audio, 'recording.m4a');
  }
  return app.request('/api/transcribe', {
    method: 'POST',
    headers: {Cookie: as},
    body: form,
  });
}

const recording = () => new Blob([new Uint8Array(2048)], {type: 'audio/m4a'});

async function errorOf(response: Response) {
  return (await readJson<{error: string}>(response)).error;
}

beforeAll(async () => {
  const user = await signUpTestUser(app);
  cookie = user.cookie;
  createdEmails.push(user.email);
});

afterAll(async () => {
  await deleteUsersByEmail(db, createdEmails);
  await db.$client.end();
});

describe('POST /api/transcribe', () => {
  it('needs a signed-in user', async () => {
    expect((await send(recording(), '')).status).toBe(401);
  });

  it('needs an OpenAI key, and says so', async () => {
    const response = await send(recording());

    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe(
      'Voice needs an OpenAI key. Add one in Settings on the web.',
    );
    expect(heard).toEqual([]);
  });

  it("turns the recording into text with the user's key and names", async () => {
    await app.request('/api/provider-keys/openai', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({apiKey: 'sk-test-voice-1234567890'}),
    });
    await app.request('/api/agents', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Cookie: cookie},
      body: JSON.stringify({
        name: 'Bolt',
        role: 'Builds things.',
        instructions: '',
        provider: 'openai',
        model: 'gpt-5.5',
        avatar: 'bolt',
        approvalMode: 'auto_approve_reads',
      }),
    });
    const response = await send(recording());

    expect(response.status).toBe(200);
    expect(await readJson<{text: string}>(response)).toEqual({
      text: 'Plan my week, please.',
    });
    // The characters' names help it spell them right.
    expect(heard).toEqual([
      {apiKey: 'sk-test-voice-1234567890', bytes: 2048, names: ['Bolt']},
    ]);
  });

  it('refuses a missing, empty or too long recording', async () => {
    expect((await send()).status).toBe(400);
    expect((await send(new Blob([]))).status).toBe(400);
    const tooLong = new Blob([new Uint8Array(MAX_RECORDING_BYTES + 1)]);
    expect((await send(tooLong)).status).toBe(413);
    expect(heard).toHaveLength(1);
  });

  it('says when nothing was heard', async () => {
    answer = '';
    const response = await send(recording());

    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe("Couldn't hear anything. Try again.");
  });

  it("passes on the provider's error", async () => {
    fails = true;
    const response = await send(recording());

    expect(response.status).toBe(502);
    expect(await errorOf(response)).toBe(
      'The provider returned an error: Invalid file format.',
    );
  });
});
