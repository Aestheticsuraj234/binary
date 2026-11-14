import {z} from 'zod';

/**
 * Ids are uuids. Checking first lets a route answer "not found" for a
 * malformed id, instead of Postgres rejecting it with a server error.
 */
export function isUuid(id: string): boolean {
  return z.uuid().safeParse(id).success;
}
