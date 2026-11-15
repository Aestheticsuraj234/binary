import {field, text} from './output-fields';

/** Whether a result is a page from the browser tools. */
export function isBrowserOutput(output: unknown): boolean {
  return (
    typeof field(output, 'url') === 'string' &&
    Array.isArray(field(output, 'elements'))
  );
}

/**
 * A browser step's result: which page it is on, what blocked it if
 * anything, and the start of the page's text (the screenshot is shown
 * under the row).
 */
export function BrowserOutput({output}: {output: unknown}) {
  const url = text(field(output, 'url'));
  const title = text(field(output, 'title'));
  const pageText = text(field(output, 'text'));
  const blocked = text(field(output, 'blocked'));
  const elements = field(output, 'elements');
  const count = Array.isArray(elements) ? elements.length : 0;

  return (
    <div className="space-y-1">
      {blocked && <p className="text-warning">{blocked}</p>}
      <p className="truncate">
        <span className="font-medium">{title || 'Untitled page'}</span>{' '}
        <span className="font-mono text-muted-foreground">{url}</span>
      </p>
      <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 font-mono whitespace-pre-wrap">
        {pageText || '(no text)'}
      </pre>
      <p className="text-muted-foreground">
        {count === 1 ? '1 thing' : `${count} things`} to click or type into.
      </p>
    </div>
  );
}
