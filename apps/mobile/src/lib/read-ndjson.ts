/**
 * Reads a streamed response one JSON line at a time, yielding each object as
 * soon as its line is complete. The same reader as the web app's: network
 * chunks can end mid-line, so the unfinished end waits in `buffer`.
 */
export async function* readNdjson<T>(response: {
  body: ReadableStream<Uint8Array> | null;
}): AsyncGenerator<T> {
  if (!response.body) {
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, {stream: true});
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
  }
  if (buffer.trim()) {
    yield JSON.parse(buffer);
  }
}
