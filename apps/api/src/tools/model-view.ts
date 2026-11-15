/**
 * What the model reads instead of an image: the user sees the picture, and
 * the model saves thousands of tokens of base64 it could not use anyway.
 * Handles sandbox charts (`results[].png`) and browser screenshots
 * (`screenshot`); everything else is passed through.
 */
export function withoutImages(output: unknown): unknown {
  if (typeof output !== 'object' || output === null) {
    return output;
  }
  const view: Record<string, unknown> = {...output};
  if (typeof view.screenshot === 'string') {
    view.screenshot = 'A screenshot of the page. The user can see it.';
  }
  if (Array.isArray(view.results)) {
    view.results = view.results.map((result: unknown) =>
      typeof result === 'object' &&
      result !== null &&
      Reflect.get(result, 'png') !== undefined
        ? {chart: 'A chart. The user can see it.'}
        : result,
    );
  }
  return view;
}
