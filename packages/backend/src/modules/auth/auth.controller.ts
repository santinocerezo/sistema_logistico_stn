import { Request, Response } from 'express';
import { registerSchema, loginSchema, twoFactorVerifySchema, twoFactorCompleteSchema, passwordResetRequestSchema, passwordResetSchema } from './auth.schemas';
import {
  registerUser,
  loginUser,
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  completeTwoFactorLogin,
  disableTwoFactor,
  requestPasswordReset,
  resetPassword,
  logoutUser,
  refreshAccessToken,
} from './auth.service';

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/auth',
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { user, tokens } = await registerUser(parsed.data);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({
      accessToken: tokens.accessToken,
      user,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const result = await loginUser(parsed.data);

    // Si requiere 2FA, devolver tempToken
    if ('requiresTwoFactor' in result) {
      res.status(200).json({
        requiresTwoFactor: true,
        tempToken: result.tempToken,
      });
      return;
    }

    setRefreshCookie(res, result.tokens.refreshToken);
    // La respuesta incluye accessToken, user (con role para que el frontend redirija) — Req 1.3, 1.4, 1.5
    res.status(200).json({
      accessToken: result.tokens.accessToken,
      user: result.user,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/2fa/setup — Genera secreto TOTP y QR (Req 2.1, 2.2, 2.6)
export async function twoFactorSetup(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await setupTwoFactor(userId);
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/2fa/verify — Verifica código TOTP y activa 2FA (Req 2.4, 2.5)
export async function twoFactorVerify(req: Request, res: Response): Promise<void> {
  const parsed = twoFactorVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const userId = req.user!.userId;
    await verifyAndEnableTwoFactor(userId, parsed.data.token);
    res.status(200).json({ message: '2FA activado correctamente' });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/2fa/complete — Completa login con tempToken + código TOTP (Req 2.3, 2.4)
export async function twoFactorComplete(req: Request, res: Response): Promise<void> {
  const parsed = twoFactorCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { user, tokens } = await completeTwoFactorLogin(parsed.data.tempToken, parsed.data.token);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json({
      accessToken: tokens.accessToken,
      user,
    });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/2fa/disable — Desactiva 2FA (solo no-admin) (Req 2.7)
export async function twoFactorDisable(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    await disableTwoFactor(userId);
    res.status(200).json({ message: '2FA desactivado correctamente' });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/password/reset-request — Solicita recuperación de contraseña (Req 7.1, 7.2, 7.3, 7.5)
export async function passwordResetRequest(req: Request, res: Response): Promise<void> {
  const parsed = passwordResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    await requestPasswordReset(parsed.data);
    res.status(200).json({ message: 'Se ha enviado un enlace de recuperación al correo electrónico' });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/password/reset — Restablece la contraseña con token (Req 7.4, 7.6)
export async function passwordReset(req: Request, res: Response): Promise<void> {
  const parsed = passwordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    await resetPassword(parsed.data);
    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}

// POST /auth/logout — Invalida refresh token en Redis (Req 5.6)
export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (refreshToken) {
    try {
      await logoutUser(refreshToken);
    } catch (err) {
      // Loguear pero no fallar: el cliente debe limpiar su estado de todas formas
      console.error('[logout] Error invalidando refresh token:', err);
    }
  }

  // Limpiar cookie refreshToken
  res.clearCookie('refreshToken', { path: '/auth' });
  res.status(200).json({ message: 'Sesión cerrada correctamente' });
}

// POST /auth/token/refresh — Renueva access token (Req 5.1, 5.2)
export async function tokenRefresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token requerido' });
    return;
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    res.status(200).json({ accessToken });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    res.status(status).json({ error: e.message ?? 'Error interno del servidor' });
  }
}
