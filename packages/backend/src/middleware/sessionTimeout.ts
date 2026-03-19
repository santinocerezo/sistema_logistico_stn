import { Request, Response, NextFunction } from 'express';
import redis from '../db/redis';

const SESSION_TIMEOUT_USER_MS = parseInt(process.env.SESSION_TIMEOUT_USER_MS ?? '1800000', 10); // 30 min
const SESSION_TIMEOUT_ADMIN_MS = parseInt(process.env.SESSION_TIMEOUT_ADMIN_MS ?? '900000', 10); // 15 min
const WARN_BEFORE_MS = 2 * 60 * 1000; // 2 minutos

/**
 * Actualiza la marca de última actividad del usuario en Redis.
 * Clave: session:activity:{userId}
 */
export async function updateSessionActivity(userId: string): Promise<void> {
  await redis.set(`session:activity:${userId}`, Date.now().toString(), 'EX', 7200); // TTL 2h
}

/**
 * Devuelve información sobre el timeout de sesión para un usuario.
 * Útil para que el frontend muestre advertencias de expiración.
 * Req 5.4, 5.5
 */
export async function getSessionTimeoutWarning(
  userId: string,
  role: 'user' | 'admin' | 'courier',
): Promise<{ expiresInMs: number; shouldWarn: boolean }> {
  const lastActivityRaw = await redis.get(`session:activity:${userId}`);
  if (!lastActivityRaw) {
    return { expiresInMs: 0, shouldWarn: true };
  }

  const lastActivity = parseInt(lastActivityRaw, 10);
  const timeoutMs = role === 'admin' ? SESSION_TIMEOUT_ADMIN_MS : SESSION_TIMEOUT_USER_MS;
  const elapsed = Date.now() - lastActivity;
  const expiresInMs = Math.max(0, timeoutMs - elapsed);
  const shouldWarn = expiresInMs <= WARN_BEFORE_MS;

  return { expiresInMs, shouldWarn };
}

/**
 * Middleware que verifica inactividad de sesión.
 * Debe aplicarse después del middleware `authenticate`.
 * Req 5.1, 5.2, 5.3
 */
export async function checkSessionTimeout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  const { userId, role } = req.user;
  const timeoutMs = role === 'admin' ? SESSION_TIMEOUT_ADMIN_MS : SESSION_TIMEOUT_USER_MS;

  const lastActivityRaw = await redis.get(`session:activity:${userId}`);

  if (lastActivityRaw) {
    const lastActivity = parseInt(lastActivityRaw, 10);
    const elapsed = Date.now() - lastActivity;

    if (elapsed > timeoutMs) {
      res.status(401).json({ error: 'Sesión expirada por inactividad' });
      return;
    }
  }

  // Actualizar actividad en cada request autenticado
  await updateSessionActivity(userId);
  next();
}
