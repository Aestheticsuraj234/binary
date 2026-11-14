import {ValidationError} from '../errors';

/**
 * The name a time zone is known by to Node and Trigger.dev. Browsers
 * disagree: Chrome says "Asia/Calcutta", Firefox and Safari say
 * "Asia/Kolkata", and Trigger.dev only accepts the first. Intl resolves both
 * (and "Europe/Kyiv" → "Europe/Kiev") to one name.
 */
export function canonicalTimezone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en', {timeZone}).resolvedOptions().timeZone;
  } catch {
    throw new ValidationError(`"${timeZone}" is not a time zone we know.`);
  }
}
