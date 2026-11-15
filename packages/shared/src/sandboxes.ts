/** Languages the run_code tool takes. Shell commands use run_command. */
export const CODE_LANGUAGES = ['python', 'javascript'] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

/** One thing a code run produced besides its logs: a value or a chart. */
export interface CodeResult {
  text?: string;
  /** A PNG image, base64, e.g. a matplotlib chart. */
  png?: string;
}

/** What the run_code tool returns. */
export interface CodeRunOutput {
  stdout: string;
  stderr: string;
  results: CodeResult[];
  error?: {name: string; value: string; traceback: string};
  /** Set when an earlier sandbox had timed out, so its files are gone. */
  newSandbox?: true;
}

/** What the run_command tool returns. */
export interface CommandRunOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  newSandbox?: true;
}
