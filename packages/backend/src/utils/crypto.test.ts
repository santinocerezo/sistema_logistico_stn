import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from './crypto';

const VALID_KEY = 'a'.repeat(64); // 32 bytes en hex

beforeEach(() => {
  process.env.ENCRYPTION_MASTER_KEY = VALID_KEY;
});

describe('encrypt / decrypt', () => {
  it('round-trip: decrypt(encrypt(text)) === text', () => {
    const plaintext = 'secreto-totp-base32';
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produce ciphertext diferente en cada llamada (IV aleatorio)', () => {
    const plaintext = 'mismo-texto';
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
    // Pero ambos se desencriptan al mismo valor
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it('lanza error si ENCRYPTION_MASTER_KEY no está configurado', () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_MASTER_KEY no configurado');
  });

  it('lanza error si la clave no tiene 32 bytes', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'aabbcc'; // muy corta
    expect(() => encrypt('test')).toThrow('32 bytes');
  });

  it('lanza error al desencriptar datos corruptos', () => {
    const encrypted = encrypt('texto');
    const corrupted = encrypted.replace(/[a-f]/g, 'z');
    expect(() => decrypt(corrupted)).toThrow();
  });

  it('lanza error con formato inválido', () => {
    expect(() => decrypt('formato-invalido')).toThrow('Formato de datos encriptados inválido');
  });

  it('encripta y desencripta JSON correctamente', () => {
    const data = JSON.stringify([{ code: 'ABC12345', used: false }]);
    expect(decrypt(encrypt(data))).toBe(data);
  });
});
