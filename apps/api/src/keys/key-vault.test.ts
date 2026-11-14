import {randomBytes} from 'node:crypto';

import {describe, expect, it} from 'vitest';

import {KeyVault} from './key-vault';

const vault = new KeyVault(randomBytes(32).toString('base64'));
const API_KEY = 'sk-test-1234567890abcdefghijklmnop';

describe('KeyVault', () => {
  it('decrypts what it encrypted', () => {
    const secret = vault.encrypt(API_KEY);

    expect(vault.decrypt(secret)).toBe(API_KEY);
  });

  it('never stores the key in readable form', () => {
    const secret = vault.encrypt(API_KEY);

    expect(secret.ciphertext).not.toContain('sk-test');
  });

  it('uses a new IV every time, so equal keys look different', () => {
    const first = vault.encrypt(API_KEY);
    const second = vault.encrypt(API_KEY);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('refuses to decrypt tampered data', () => {
    const secret = vault.encrypt(API_KEY);
    const bytes = Buffer.from(secret.ciphertext, 'base64');
    bytes[0] = (bytes[0] ?? 0) ^ 1;

    expect(() =>
      vault.decrypt({...secret, ciphertext: bytes.toString('base64')}),
    ).toThrow();
  });

  it('refuses to decrypt with a different master key', () => {
    const secret = vault.encrypt(API_KEY);
    const otherVault = new KeyVault(randomBytes(32).toString('base64'));

    expect(() => otherVault.decrypt(secret)).toThrow();
  });

  it('rejects a master key of the wrong length', () => {
    expect(() => new KeyVault('too-short')).toThrow(
      'ENCRYPTION_KEY must be 32 bytes',
    );
  });
});
