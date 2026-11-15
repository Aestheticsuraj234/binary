import {
  runnerJobSchema,
  type RunnerEvent,
  type RunnerJob,
  type RunnerResult,
} from '@binary/shared';

/** The API refused: a wrong code, or a token that no longer works. */
export class RunnerAuthError extends Error {}

async function errorFrom(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === 'object' && body !== null
      ? Reflect.get(body, 'error')
      : undefined;
  return typeof message === 'string'
    ? message
    : `The API answered ${response.status}.`;
}

/** Trades a pairing code for a token. No token is needed for this one. */
export async function pair(api: string, code: string, os: string) {
  const response = await fetch(`${api}/api/runner/pair`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code, os}),
  });
  if (!response.ok) {
    throw new RunnerAuthError(await errorFrom(response));
  }
  const body: unknown = await response.json();
  const token = Reflect.get(Object(body), 'token');
  const device: unknown = Reflect.get(Object(body), 'device');
  const id = Reflect.get(Object(device), 'id');
  const name = Reflect.get(Object(device), 'name');
  if (
    typeof token !== 'string' ||
    typeof id !== 'string' ||
    typeof name !== 'string'
  ) {
    throw new Error('The API sent an unexpected answer.');
  }
  return {token, deviceId: id, name};
}

/** Everything the Runner says to the API after pairing. */
export class RunnerClient {
  constructor(
    private readonly api: string,
    private readonly token: string,
  ) {}

  /** Says which folders this Runner shares. */
  async hello(details: {version: string; os: string; folders: string[]}) {
    await this.send('POST', '/api/runner/hello', details);
  }

  /** Waits for the next job; undefined if there was none for a while. */
  async next(): Promise<{id: string; job: RunnerJob} | undefined> {
    const response = await this.request('GET', '/api/runner/jobs');
    if (response.status === 204) {
      return undefined;
    }
    const body: unknown = await response.json();
    const id = Reflect.get(Object(body), 'id');
    const job = runnerJobSchema.safeParse(Reflect.get(Object(body), 'job'));
    if (typeof id !== 'string' || !job.success) {
      throw new Error(
        'The API sent a job this Runner does not understand. Update the Runner.',
      );
    }
    return {id, job: job.data};
  }

  async events(jobId: string, events: RunnerEvent[]) {
    await this.send('POST', `/api/runner/jobs/${jobId}/events`, {events});
  }

  async result(jobId: string, result: RunnerResult) {
    await this.send('POST', `/api/runner/jobs/${jobId}/result`, result);
  }

  private async send(method: string, path: string, body: unknown) {
    await this.request(method, path, body);
  }

  private async request(method: string, path: string, body?: unknown) {
    const response = await fetch(`${this.api}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body === undefined ? {} : {'Content-Type': 'application/json'}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401) {
      throw new RunnerAuthError(await errorFrom(response));
    }
    if (!response.ok && response.status !== 204) {
      throw new Error(await errorFrom(response));
    }
    return response;
  }
}
