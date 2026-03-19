import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { updateSessionActivity } from './sessionTimeout';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'courier';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET no configurado');

    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;

    // Actualizar actividad de sesión en Redis en cada request autenticado (Req 5.1)
    updateSessionActivity(payload.userId).catch((err) => {
      console.error('[auth] Error actualizando actividad de sesión:', err);
    });

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles: Array<'user' | 'admin' | 'courier'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sin permisos para esta acción' });
      return;
    }
    next();
  };
}

// Alias para autenticación
export const authenticateToken = authenticate;

// Middleware para requerir rol de administrador
export const requireAdmin = requireRole('admin');

// Middleware para requerir rol de repartidor
export const requireCourier = requireRole('courier');
