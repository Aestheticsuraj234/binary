/** Reads a field of an unknown object (a tool's output), or undefined. */
export function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

/** A field that should be text, or '' when it isn't. */
export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
