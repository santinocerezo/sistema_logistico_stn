import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  loginRateLimiter,
  twoFactorRateLimiter,
} from '../../middleware/rateLimiter';
import {
  register,
  login,
  twoFactorSetup,
  twoFactorVerify,
  twoFactorComplete,
  twoFactorDisable,
  passwordResetRequest,
  passwordReset,
  logout,
  tokenRefresh,
} from './auth.controller';

const router = Router();

// POST /auth/register — Registro de usuario (Req 1.1, 8.1, 8.2, 8.3, 8.6)
router.post('/register', register);

// POST /auth/login — Inicio de sesión con JWT (Req 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2)
// Si el usuario tiene 2FA activo, devuelve { requiresTwoFactor: true, tempToken }
// Rate limit: 5 intentos/min por IP, bloqueo 15 min
router.post('/login', loginRateLimiter, login);

// POST /auth/logout — Invalida refresh token y cierra sesión (Req 5.6)
router.post('/logout', logout);

// POST /auth/token/refresh — Renueva access token con refresh token de cookie (Req 5.1, 5.2)
router.post('/token/refresh', tokenRefresh);

// POST /auth/2fa/setup — Genera secreto TOTP y QR (Req 2.1, 2.2, 2.6)
router.post('/2fa/setup', authenticate, twoFactorSetup);

// POST /auth/2fa/verify — Verifica código TOTP y activa 2FA (Req 2.4, 2.5)
router.post('/2fa/verify', authenticate, twoFactorVerify);

// POST /auth/2fa/complete — Completa login con tempToken + código TOTP (Req 2.3, 2.4, 6.2)
// Rate limit: 5 intentos/min por usuario
router.post('/2fa/complete', twoFactorRateLimiter, twoFactorComplete);

// POST /auth/2fa/disable — Desactiva 2FA (solo no-admin) (Req 2.7)
router.post('/2fa/disable', authenticate, twoFactorDisable);

// POST /auth/password/reset-request — Solicita recuperación de contraseña (Req 7.1, 7.2, 7.3, 7.5)
router.post('/password/reset-request', passwordResetRequest);

// POST /auth/password/reset — Restablece la contraseña con token (Req 7.4, 7.6)
router.post('/password/reset', passwordReset);

export default router;
