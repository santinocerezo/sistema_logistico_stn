import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { randomBytes } from 'crypto';
import pool from '../../db/pool';
import redis from '../../db/redis';
import { encrypt, decrypt } from '../../utils/crypto';
import { RegisterInput, LoginInput, PasswordResetRequestInput, PasswordResetInput } from './auth.schemas';

const BCRYPT_ROUNDS = 12;
const BACKUP_CODES_COUNT = 8;
const BACKUP_CODE_LENGTH = 8;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserPublic {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'courier';
  balance: number;
  totpEnabled: boolean;
}

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface LoginResult {
  user: UserPublic;
  tokens: TokenPair;
}

export interface LoginPendingTwoFactor {
  requiresTwoFactor: true;
  tempToken: string;
}

function signAccessToken(payload: { userId: string; email: string; role: string }): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET no configurado');
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
}

function signRefreshToken(payload: { userId: string }): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET no configurado');
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
}

function signTempToken(payload: { userId: string; purpose: '2fa' }): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET no configurado');
  return jwt.sign(payload, secret, { expiresIn: '5m' });
}

function generateBackupCodes(): string[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    let code = '';
    const bytes = randomBytes(BACKUP_CODE_LENGTH);
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += chars[bytes[j] % chars.length];
    }
    codes.push(code);
  }
  return codes;
}

export async function registerUser(input: RegisterInput): Promise<{ user: UserPublic; tokens: TokenPair }> {
  const { email, password, fullName, phone } = input;

  // Verificar email único (Req 8.3)
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount && existing.rowCount > 0) {
    const err = new Error('El email ya está registrado') as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Cuenta nueva con balance = 0 (Req 8.2)
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, phone, balance, role)
     VALUES ($1, $2, $3, $4, 0.00, 'user')
     RETURNING id, email, full_name, role, balance, totp_enabled`,
    [email.toLowerCase(), passwordHash, fullName, phone ?? null],
  );

  const row = result.rows[0];
  const user: UserPublic = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    balance: parseFloat(row.balance),
    totpEnabled: row.totp_enabled,
  };

  const tokens: TokenPair = {
    accessToken: signAccessToken({ userId: user.id, email: user.email, role: user.role }),
    refreshToken: signRefreshToken({ userId: user.id }),
  };

  return { user, tokens };
}

export async function loginUser(input: LoginInput): Promise<LoginResult | LoginPendingTwoFactor> {
  const { email, password } = input;

  const result = await pool.query(
    `SELECT id, email, password_hash, full_name, role, balance, is_active, totp_enabled
     FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );

  // Credenciales inválidas: 401 con mensaje descriptivo (Req 1.6)
  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('Credenciales inválidas') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const row = result.rows[0];

  if (!row.is_active) {
    const err = new Error('Cuenta desactivada. Contacte al soporte.') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    const err = new Error('Credenciales inválidas') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  // Actualizar last_login
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [row.id]);

  // Si tiene 2FA activo, devolver tempToken en lugar de tokens completos (Req 2.3)
  if (row.totp_enabled) {
    const tempToken = signTempToken({ userId: row.id, purpose: '2fa' });
    return { requiresTwoFactor: true, tempToken };
  }

  const user: UserPublic = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    balance: parseFloat(row.balance),
    totpEnabled: row.totp_enabled,
  };

  const tokens: TokenPair = {
    accessToken: signAccessToken({ userId: user.id, email: user.email, role: user.role }),
    refreshToken: signRefreshToken({ userId: user.id }),
  };

  return { user, tokens };
}

/**
 * Genera secreto TOTP, QR y códigos de respaldo. No activa 2FA aún.
 * Req 2.1, 2.2, 2.6
 */
export async function setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
  // Verificar que el usuario existe
  const result = await pool.query(
    'SELECT id, email, full_name FROM users WHERE id = $1',
    [userId],
  );
  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  const row = result.rows[0];

  // Generar secreto TOTP
  const secretObj = speakeasy.generateSecret({
    name: `STN PQ's (${row.email})`,
    issuer: "STN PQ's",
    length: 20,
  });

  const secret = secretObj.base32;

  // Generar códigos de respaldo
  const backupCodes = generateBackupCodes();

  // Encriptar secreto y códigos de respaldo con AES-256-GCM
  const secretEnc = encrypt(secret);
  const backupCodesEnc = encrypt(JSON.stringify(backupCodes.map(c => ({ code: c, used: false }))));

  // Almacenar en DB (aún sin activar totp_enabled)
  await pool.query(
    'UPDATE users SET totp_secret_enc = $1, backup_codes_enc = $2 WHERE id = $3',
    [secretEnc, backupCodesEnc, userId],
  );

  // Generar QR code
  const otpauthUrl = secretObj.otpauth_url ?? speakeasy.otpauthURL({
    secret,
    label: row.email,
    issuer: "STN PQ's",
    encoding: 'base32',
  });
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl, backupCodes };
}

/**
 * Verifica código TOTP y activa 2FA para el usuario.
 * Req 2.4, 2.5
 */
export async function verifyAndEnableTwoFactor(userId: string, token: string): Promise<void> {
  const result = await pool.query(
    'SELECT totp_secret_enc, role FROM users WHERE id = $1',
    [userId],
  );
  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const row = result.rows[0];
  if (!row.totp_secret_enc) {
    const err = new Error('2FA no configurado. Llame primero a /auth/2fa/setup') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const secret = decrypt(row.totp_secret_enc);

  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!isValid) {
    const err = new Error('Código 2FA inválido') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  // Activar 2FA
  await pool.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [userId]);
}

/**
 * Completa el login con 2FA: verifica tempToken + código TOTP (o código de respaldo).
 * Devuelve tokens completos. Req 2.3, 2.4, 2.5
 */
export async function completeTwoFactorLogin(
  tempToken: string,
  token: string,
): Promise<LoginResult> {
  // Verificar tempToken
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET no configurado');

  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(tempToken, secret) as { userId: string; purpose: string };
  } catch {
    const err = new Error('Token temporal inválido o expirado') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  if (payload.purpose !== '2fa') {
    const err = new Error('Token temporal inválido') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const result = await pool.query(
    `SELECT id, email, full_name, role, balance, totp_secret_enc, backup_codes_enc, totp_enabled
     FROM users WHERE id = $1`,
    [payload.userId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const row = result.rows[0];

  if (!row.totp_enabled || !row.totp_secret_enc) {
    const err = new Error('2FA no está activo para este usuario') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const totpSecret = decrypt(row.totp_secret_enc);

  // Intentar verificar como código TOTP
  const isValidTotp = speakeasy.totp.verify({
    secret: totpSecret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!isValidTotp) {
    // Intentar como código de respaldo
    if (!row.backup_codes_enc) {
      const err = new Error('Código 2FA inválido') as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    const backupCodes: Array<{ code: string; used: boolean }> = JSON.parse(
      decrypt(row.backup_codes_enc),
    );

    const codeIndex = backupCodes.findIndex(
      (bc) => bc.code === token.toUpperCase() && !bc.used,
    );

    if (codeIndex === -1) {
      const err = new Error('Código 2FA inválido') as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    // Marcar código de respaldo como usado
    backupCodes[codeIndex].used = true;
    const updatedEnc = encrypt(JSON.stringify(backupCodes));
    await pool.query('UPDATE users SET backup_codes_enc = $1 WHERE id = $2', [updatedEnc, row.id]);
  }

  const user: UserPublic = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    balance: parseFloat(row.balance),
    totpEnabled: row.totp_enabled,
  };

  const tokens: TokenPair = {
    accessToken: signAccessToken({ userId: user.id, email: user.email, role: user.role }),
    refreshToken: signRefreshToken({ userId: user.id }),
  };

  return { user, tokens };
}

/**
 * Desactiva 2FA para el usuario. Solo permitido para no-admin. Req 2.7
 */
export async function disableTwoFactor(userId: string): Promise<void> {
  const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const row = result.rows[0];
  if (row.role === 'admin') {
    const err = new Error('Los administradores no pueden desactivar el 2FA') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  await pool.query(
    'UPDATE users SET totp_enabled = FALSE, totp_secret_enc = NULL, backup_codes_enc = NULL WHERE id = $1',
    [userId],
  );
}

const PWD_RESET_TTL_SECONDS = 24 * 60 * 60; // 24 horas

/**
 * Genera token de recuperación de contraseña y lo almacena en Redis.
 * Loguea el enlace en consola (el módulo de email se implementa en tarea 13).
 * Req 7.1, 7.2, 7.3, 7.4, 7.5
 */
export async function requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
  const { email } = input;

  const result = await pool.query(
    'SELECT id FROM users WHERE email = $1 AND is_active = TRUE',
    [email.toLowerCase()],
  );

  // Req 7.5: si el email no existe, responder con error descriptivo
  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('El correo electrónico no está registrado') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const userId = result.rows[0].id;

  // Generar token JWT de 24h para recuperación
  const jwtSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtSecret) throw new Error('JWT_ACCESS_SECRET no configurado');

  const resetToken = jwt.sign(
    { userId, purpose: 'pwd_reset' },
    jwtSecret,
    { expiresIn: '24h' },
  );

  // Almacenar en Redis: pwd_reset:{token} → userId, TTL 24h (Req 7.2)
  await redis.set(`pwd_reset:${resetToken}`, userId, 'EX', PWD_RESET_TTL_SECONDS);

  // Construir enlace de recuperación (Req 7.3)
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

  // Loguear en consola hasta que el módulo de email esté disponible (tarea 13)
  console.log(`[PASSWORD RESET] Enlace de recuperación para ${email}: ${resetLink}`);
}

/**
 * Valida token de recuperación y actualiza la contraseña del usuario.
 * Req 7.4, 7.6
 */
export async function resetPassword(input: PasswordResetInput): Promise<void> {
  const { token, newPassword } = input;

  // Verificar token en Redis (Req 7.4)
  const userId = await redis.get(`pwd_reset:${token}`);
  if (!userId) {
    const err = new Error('Token de recuperación inválido o expirado') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  // Verificar también la firma JWT
  const jwtSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtSecret) throw new Error('JWT_ACCESS_SECRET no configurado');

  try {
    const payload = jwt.verify(token, jwtSecret) as { userId: string; purpose: string };
    if (payload.purpose !== 'pwd_reset' || payload.userId !== userId) {
      const err = new Error('Token de recuperación inválido o expirado') as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }
  } catch {
    // Invalidar token en Redis si la firma JWT falló
    await redis.del(`pwd_reset:${token}`);
    const err = new Error('Token de recuperación inválido o expirado') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  // Actualizar contraseña con bcrypt factor 12 (Req 7.6)
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

  // Invalidar token en Redis (Req 7.4 — uso único)
  await redis.del(`pwd_reset:${token}`);
}

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

/**
 * Invalida el refresh token en Redis (lista negra) y limpia la sesión.
 * Req 5.6
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  // Agregar a lista negra en Redis con TTL igual al tiempo de vida del refresh token
  await redis.set(`blacklist:refresh:${refreshToken}`, '1', 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

/**
 * Renueva el access token usando el refresh token de la cookie HttpOnly.
 * Verifica que el refresh token no esté en la lista negra de Redis.
 * Req 5.1, 5.2
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  // Verificar que no esté en lista negra
  const isBlacklisted = await redis.get(`blacklist:refresh:${refreshToken}`);
  if (isBlacklisted) {
    const err = new Error('Refresh token inválido o revocado') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  // Verificar firma del refresh token
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET no configurado');

  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, secret) as { userId: string };
  } catch {
    const err = new Error('Refresh token inválido o expirado') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  // Obtener datos actualizados del usuario
  const result = await pool.query(
    'SELECT id, email, role, is_active FROM users WHERE id = $1',
    [payload.userId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    const err = new Error('Usuario no encontrado') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const row = result.rows[0];

  if (!row.is_active) {
    const err = new Error('Cuenta desactivada') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  return signAccessToken({ userId: row.id, email: row.email, role: row.role });
}
