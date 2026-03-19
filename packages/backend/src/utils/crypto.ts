import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex) throw new Error('ENCRYPTION_MASTER_KEY no configurado');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_MASTER_KEY debe ser 32 bytes (64 caracteres hex)');
  return key;
}

/**
 * Encripta texto con AES-256-GCM.
 * Devuelve string en formato: iv:authTag:ciphertext (todo en hex).
 */
export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Desencripta texto encriptado con encrypt().
 * Espera formato: iv:authTag:ciphertext (todo en hex).
 */
export function decrypt(encryptedData: string): string {
  const key = getMasterKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Formato de datos encriptados inválido');

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
