import {realpath} from 'node:fs/promises';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

/**
 * The folders the user shared when starting the Runner, as real paths
 * (symlinks resolved). Nothing outside them is read, listed or written,
 * whatever the server asks: this check happens on the user's computer.
 */
export class SharedFolders {
  private constructor(readonly paths: string[]) {}

  static async from(folders: string[]): Promise<SharedFolders> {
    if (folders.length === 0) {
      throw new Error('Share at least one folder: --folder <path>.');
    }
    const paths = await Promise.all(
      folders.map(async (folder) => {
        try {
          // pnpm runs scripts from apps/runner; INIT_CWD is where the user
          // typed the command, which is what a relative folder means.
          return await realpath(
            resolve(process.env.INIT_CWD ?? process.cwd(), folder),
          );
        } catch {
          throw new Error(`The folder ${folder} does not exist.`);
        }
      }),
    );
    return new SharedFolders(paths);
  }

  /** The first shared folder: where relative paths and commands start. */
  get home(): string {
    return this.paths[0] ?? '';
  }

  /**
   * The real path of something that must already exist inside a shared
   * folder. Symlinks are followed first, so a link can't lead outside.
   */
  async existing(path: string): Promise<string> {
    let real: string;
    try {
      real = await realpath(this.absolute(path));
    } catch {
      throw new Error(`Nothing at ${path}.`);
    }
    return this.inside(real, path);
  }

  /** Where a new file may go: its folder must exist inside a shared one. */
  async writable(path: string): Promise<string> {
    const absolute = this.absolute(path);
    let folder: string;
    try {
      folder = await realpath(dirname(absolute));
    } catch {
      throw new Error(`The folder for ${path} does not exist.`);
    }
    this.inside(folder, path);
    return resolve(folder, relative(dirname(absolute), absolute));
  }

  private absolute(path: string) {
    return isAbsolute(path) ? path : resolve(this.home, path);
  }

  private inside(real: string, asked: string): string {
    const allowed = this.paths.some(
      (folder) => real === folder || real.startsWith(`${folder}${sep}`),
    );
    if (!allowed) {
      throw new Error(
        `${asked} is outside the shared folders (${this.paths.join(', ')}).`,
      );
    }
    return real;
  }
}
