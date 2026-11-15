import type {ToolCallView} from '@binary/shared';

import {cn} from '@/lib/utils';

import {field, text} from './output-fields';

/** The PNG charts of a run_code result, base64. */
export function chartsOf(output: unknown): string[] {
  const results = field(output, 'results');
  if (!Array.isArray(results)) {
    return [];
  }
  return results.flatMap((result: unknown) => {
    const png = field(result, 'png');
    return typeof png === 'string' ? [png] : [];
  });
}

/**
 * The code or command a call ran, to show instead of JSON: a sandbox's
 * code, and any tool's shell command (sandbox, your computer, or a CLI
 * engine's Bash).
 */
export function sandboxInput(call: ToolCallView): string | undefined {
  if (call.toolName === 'run_code') {
    return text(field(call.input, 'code')) || undefined;
  }
  const command = text(field(call.input, 'command'));
  return command ? `$ ${command}` : undefined;
}

/** Whether a result is a code run or a command, which read like a terminal. */
export function isTerminalOutput(output: unknown): boolean {
  return typeof field(output, 'stdout') === 'string';
}

/** A code run's or command's output as a small terminal. */
export function TerminalOutput({output}: {output: unknown}) {
  const stdout = text(field(output, 'stdout'));
  const stderr = text(field(output, 'stderr'));
  const exitCode = field(output, 'exitCode');
  const error = field(output, 'error');
  const values = (() => {
    const results = field(output, 'results');
    return Array.isArray(results)
      ? results.flatMap((result: unknown) => {
          const value = field(result, 'text');
          return typeof value === 'string' ? [value] : [];
        })
      : [];
  })();
  const charts = chartsOf(output).length;
  const nothing =
    !stdout && !stderr && values.length === 0 && !error && charts === 0;

  return (
    <div className="space-y-1">
      {field(output, 'newSandbox') === true && (
        <p className="text-warning">
          The old sandbox had timed out, so this ran in a new one. Earlier files
          are gone.
        </p>
      )}
      <pre className="max-h-60 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2 font-mono whitespace-pre-wrap text-zinc-100">
        {stdout}
        {stderr && <span className="text-amber-300">{stderr}</span>}
        {values.map((value, index) => (
          <span key={index} className="block text-lime-300">
            {value}
          </span>
        ))}
        {error !== undefined && (
          <span className="block text-red-400">
            {text(field(error, 'name'))}: {text(field(error, 'value'))}
          </span>
        )}
        {charts > 0 && (
          <span className="block text-zinc-400">
            {charts === 1 ? 'Made a chart.' : `Made ${charts} charts.`}
          </span>
        )}
        {nothing && <span className="text-zinc-500">(no output)</span>}
      </pre>
      {typeof exitCode === 'number' && (
        <p
          className={cn(
            'font-mono',
            exitCode === 0 ? 'text-muted-foreground' : 'text-warning',
          )}
        >
          exit code {exitCode}
        </p>
      )}
    </div>
  );
}
