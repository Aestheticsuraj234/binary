import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

/**
 * A new webhook secret and its hash. Only the hash is stored; the secret is
 * shown once, like an API key. The `whsec_` prefix makes it easy to spot in
 * logs and to search for if it ever leaks.
 */
export function newWebhookSecret() {
  const secret = `whsec_${randomBytes(24).toString('base64url')}`;
  return {secret, hash: hashSecret(secret)};
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

/** Compares in constant time, so timing can't reveal the stored hash. */
export function secretMatches(secret: string, storedHash: string): boolean {
  const given = Buffer.from(hashSecret(secret), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}
