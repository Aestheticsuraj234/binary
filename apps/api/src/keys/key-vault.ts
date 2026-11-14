import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export interface EncryptedSecret {
  /** Base64 of the encrypted bytes followed by the 16-byte auth tag. */
  ciphertext: string;
  /** Base64 of the random 12-byte IV, different for every secret. */
  iv: string;
}

/**
 * Encrypts users' API keys before they reach the database, and decrypts
 * them only at the moment a model call needs them.
 *
 * AES-256-GCM also signs the data: if anyone changes the stored ciphertext,
 * decrypt() throws instead of returning garbage.
 */
export class KeyVault {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded.');
    }
  }

  encrypt(plaintext: string): EncryptedSecret {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  decrypt(secret: EncryptedSecret): string {
    const data = Buffer.from(secret.ciphertext, 'base64');
    const encrypted = data.subarray(0, data.length - AUTH_TAG_BYTES);
    const authTag = data.subarray(data.length - AUTH_TAG_BYTES);

    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(secret.iv, 'base64'),
    );
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
