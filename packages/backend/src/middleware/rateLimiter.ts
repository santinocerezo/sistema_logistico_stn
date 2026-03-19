import { Request, Response, NextFunction } from 'express';
import redis from '../db/redis';
import pool from '../db/pool';

export interface RateLimitConfig {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Número máximo de requests en la ventana
  blockDurationMs?: number; // Duración del bloqueo (opcional)
  keyGenerator: (req: Request) => string; // Función para generar la clave de Redis
  message?: string; // Mensaje personalizado
}

/**
 * Middleware genérico de rate limiting usando Redis
 * Valida: Requerimientos 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export function rateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = config.keyGenerator(req);
      const blockKey = `${key}:blocked`;
      const now = Date.now();

      // Verificar si la clave está bloqueada
      const isBlocked = await redis.get(blockKey);
      if (isBlocked) {
        const ttl = await redis.ttl(blockKey);
        
        // Registrar intento bloqueado en audit_logs (Req 6.6)
        await logRateLimitExceeded(req, key, ttl);
        
        res.status(429).json({
          error: config.message ?? 'Demasiadas solicitudes. Intente más tarde.',
          retryAfter: ttl,
        });
        return;
      }

      // Obtener el contador actual
      const count = await redis.incr(key);

      // Si es el primer request, establecer la expiración de la ventana
      if (count === 1) {
        await redis.pexpire(key, config.windowMs);
      }

      // Verificar si se excedió el límite
      if (count > config.maxRequests) {
        // Si hay duración de bloqueo, bloquear la clave
        if (config.blockDurationMs) {
          await redis.setex(blockKey, Math.floor(config.blockDurationMs / 1000), '1');
        }

        // Registrar intento bloqueado en audit_logs (Req 6.6)
        await logRateLimitExceeded(req, key, config.blockDurationMs ? Math.floor(config.blockDurationMs / 1000) : 0);

        res.status(429).json({
          error: config.message ?? 'Demasiadas solicitudes. Intente más tarde.',
          retryAfter: config.blockDurationMs ? Math.floor(config.blockDurationMs / 1000) : Math.ceil(config.windowMs / 1000),
        });
        return;
      }

      // Agregar headers informativos
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count));
      res.setHeader('X-RateLimit-Reset', now + config.windowMs);

      next();
    } catch (error) {
      console.error('[rateLimiter] Error:', error);
      // En caso de error con Redis, permitir el request (fail open)
      next();
    }
  };
}

/**
 * Registra intentos bloqueados en audit_logs y notifica al administrador
 * Valida: Requerimientos 6.5, 6.6
 */
async function logRateLimitExceeded(req: Request, key: string, retryAfter: number): Promise<void> {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userId = req.user?.userId ?? null;
    const userRole = req.user?.role ?? null;

    await pool.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        userRole,
        'rate_limit_exceeded',
        'rate_limit',
        null,
        null,
        JSON.stringify({
          key,
          endpoint: req.path,
          method: req.method,
          retryAfter,
        }),
        ip,
      ]
    );

    // Notificar al administrador (por ahora solo log en consola, la notificación real se implementa en tarea 13)
    console.warn(`[RATE LIMIT] Intento bloqueado - IP: ${ip}, Usuario: ${userId ?? 'N/A'}, Endpoint: ${req.method} ${req.path}, Key: ${key}`);
  } catch (error) {
    console.error('[logRateLimitExceeded] Error registrando en audit_logs:', error);
  }
}

/**
 * Rate limiter para login: 5 intentos/min por IP, bloqueo 15 min
 * Valida: Requerimientos 6.1, 6.2
 */
export const loginRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 5,
  blockDurationMs: 15 * 60 * 1000, // 15 minutos
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return `ratelimit:login:${ip}`;
  },
  message: 'Demasiados intentos de inicio de sesión. Su IP ha sido bloqueada por 15 minutos.',
});

/**
 * Rate limiter para 2FA verify: 5 intentos/min por usuario
 * Valida: Requerimiento 6.2
 */
export const twoFactorRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 5,
  blockDurationMs: 15 * 60 * 1000, // 15 minutos
  keyGenerator: (req) => {
    const userId = req.user?.userId ?? req.body?.userId ?? 'anonymous';
    return `ratelimit:2fa:${userId}`;
  },
  message: 'Demasiados intentos de verificación 2FA. Intente más tarde.',
});

/**
 * Rate limiter para API autenticada: 100 req/min por usuario
 * Valida: Requerimiento 6.3
 */
export const authenticatedApiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 100,
  keyGenerator: (req) => {
    const userId = req.user?.userId ?? 'anonymous';
    return `ratelimit:api:${userId}`;
  },
  message: 'Ha excedido el límite de solicitudes por minuto.',
});

/**
 * Rate limiter para cotización pública: 10 req/hora por IP
 * Valida: Requerimiento 6.4
 */
export const publicQuoteRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 10,
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return `ratelimit:quote:${ip}`;
  },
  message: 'Ha excedido el límite de cotizaciones por hora. Regístrese para obtener más cotizaciones.',
});
