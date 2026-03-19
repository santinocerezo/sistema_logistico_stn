import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del pool de PostgreSQL
vi.mock('../../db/pool', () => ({
  default: {
    query: vi.fn(),
  },
}));

// Mock de qrcode para evitar generar imágenes reales en tests
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqr'),
  },
}));

import pool from '../../db/pool';
import speakeasy from 'speakeasy';
import {
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  completeTwoFactorLogin,
  disableTwoFactor,
  loginUser,
} from './auth.service';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

const VALID_KEY = 'a'.repeat(64); // 32 bytes en hex

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_min_32_chars_here';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_min_32_chars_here';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.ENCRYPTION_MASTER_KEY = VALID_KEY;
});

describe('setupTwoFactor', () => {
  it('genera secreto, QR y códigos de respaldo', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'user-1', email: 'user@test.com', full_name: 'Test User' }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE

    const result = await setupTwoFactor('user-1');

    expect(result.secret).toBeTruthy();
    expect(result.qrCodeDataUrl).toContain('data:image/png');
    expect(result.backupCodes).toHaveLength(8);
    result.backupCodes.forEach((code) => {
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(setupTwoFactor('no-existe')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('almacena secreto y códigos encriptados en la DB', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'user-1', email: 'user@test.com', full_name: 'Test User' }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await setupTwoFactor('user-1');

    // Verificar que se llamó UPDATE con valores encriptados (no el secreto en claro)
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain('UPDATE users SET totp_secret_enc');
    const secretEnc = updateCall[1][0] as string;
    // El valor encriptado debe tener formato iv:authTag:ciphertext
    expect(secretEnc.split(':')).toHaveLength(3);
  });
});

describe('verifyAndEnableTwoFactor', () => {
  it('activa 2FA con código TOTP válido', async () => {
    // Generar un secreto real para el test
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const secret = secretObj.base32;

    // Encriptar el secreto como lo haría setupTwoFactor
    const { encrypt } = await import('../../utils/crypto');
    const secretEnc = encrypt(secret);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ totp_secret_enc: secretEnc, role: 'user' }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE totp_enabled

    // Generar código TOTP válido
    const token = speakeasy.totp({ secret, encoding: 'base32' });

    await expect(verifyAndEnableTwoFactor('user-1', token)).resolves.toBeUndefined();
  });

  it('lanza 401 con código TOTP inválido', async () => {
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const { encrypt } = await import('../../utils/crypto');
    const secretEnc = encrypt(secretObj.base32);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ totp_secret_enc: secretEnc, role: 'user' }],
    });

    await expect(verifyAndEnableTwoFactor('user-1', '000000')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('lanza 400 si no hay secreto configurado', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ totp_secret_enc: null, role: 'user' }],
    });

    await expect(verifyAndEnableTwoFactor('user-1', '123456')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('completeTwoFactorLogin', () => {
  it('completa login con código TOTP válido y devuelve tokens', async () => {
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const secret = secretObj.base32;
    const { encrypt } = await import('../../utils/crypto');
    const secretEnc = encrypt(secret);
    const backupCodesEnc = encrypt(JSON.stringify([{ code: 'ABCD1234', used: false }]));

    // Generar tempToken válido
    const jwt = await import('jsonwebtoken');
    const tempToken = jwt.sign(
      { userId: 'user-1', purpose: '2fa' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '5m' },
    );

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'user-1',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'user',
        balance: '100.00',
        totp_secret_enc: secretEnc,
        backup_codes_enc: backupCodesEnc,
        totp_enabled: true,
      }],
    });

    const token = speakeasy.totp({ secret, encoding: 'base32' });
    const result = await completeTwoFactorLogin(tempToken, token);

    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('user@test.com');
  });

  it('completa login con código de respaldo válido', async () => {
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const { encrypt } = await import('../../utils/crypto');
    const secretEnc = encrypt(secretObj.base32);
    const backupCode = 'ABCD1234';
    const backupCodesEnc = encrypt(JSON.stringify([{ code: backupCode, used: false }]));

    const jwt = await import('jsonwebtoken');
    const tempToken = jwt.sign(
      { userId: 'user-1', purpose: '2fa' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '5m' },
    );

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'user-1',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'user',
        balance: '100.00',
        totp_secret_enc: secretEnc,
        backup_codes_enc: backupCodesEnc,
        totp_enabled: true,
      }],
    });
    // UPDATE backup_codes_enc (marcar como usado)
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await completeTwoFactorLogin(tempToken, backupCode);
    expect(result.tokens.accessToken).toBeTruthy();
  });

  it('lanza 401 con código de respaldo ya usado', async () => {
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const { encrypt } = await import('../../utils/crypto');
    const secretEnc = encrypt(secretObj.base32);
    const backupCodesEnc = encrypt(JSON.stringify([{ code: 'ABCD1234', used: true }]));

    const jwt = await import('jsonwebtoken');
    const tempToken = jwt.sign(
      { userId: 'user-1', purpose: '2fa' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '5m' },
    );

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'user-1',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'user',
        balance: '100.00',
        totp_secret_enc: secretEnc,
        backup_codes_enc: backupCodesEnc,
        totp_enabled: true,
      }],
    });

    await expect(completeTwoFactorLogin(tempToken, 'ABCD1234')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('lanza 401 con tempToken inválido', async () => {
    await expect(completeTwoFactorLogin('token-invalido', '123456')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe('disableTwoFactor', () => {
  it('desactiva 2FA para usuario no-admin', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ role: 'user' }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE

    await expect(disableTwoFactor('user-1')).resolves.toBeUndefined();
  });

  it('lanza 403 si el usuario es admin', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ role: 'admin' }] });

    await expect(disableTwoFactor('admin-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lanza 404 si el usuario no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(disableTwoFactor('no-existe')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('loginUser con 2FA activo', () => {
  it('devuelve requiresTwoFactor y tempToken cuando totp_enabled=true', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password1!', 1);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'user-2fa',
        email: '2fa@test.com',
        password_hash: hash,
        full_name: '2FA User',
        role: 'user',
        balance: '0.00',
        is_active: true,
        totp_enabled: true,
      }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE last_login

    const result = await loginUser({ email: '2fa@test.com', password: 'Password1!' });

    expect(result).toMatchObject({ requiresTwoFactor: true });
    expect((result as { tempToken: string }).tempToken).toBeTruthy();
  });

  it('devuelve tokens completos cuando totp_enabled=false', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password1!', 1);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'user-no2fa',
        email: 'no2fa@test.com',
        password_hash: hash,
        full_name: 'No 2FA User',
        role: 'user',
        balance: '0.00',
        is_active: true,
        totp_enabled: false,
      }],
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE last_login

    const result = await loginUser({ email: 'no2fa@test.com', password: 'Password1!' });

    expect('tokens' in result).toBe(true);
    expect('requiresTwoFactor' in result).toBe(false);
  });
});
