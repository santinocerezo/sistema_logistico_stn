import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks deben usar vi.fn() inline (hoisting)
vi.mock('../../db/redis', () => ({
  default: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('../../db/pool', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../../utils/crypto', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace('enc:', ''),
}));

import redis from '../../db/redis';
import pool from '../../db/pool';
import { logoutUser, refreshAccessToken } from './auth.service';
import { checkSessionTimeout, getSessionTimeoutWarning, updateSessionActivity } from '../../middleware/sessionTimeout';
import type { Request, Response, NextFunction } from 'express';

const redisMock = redis as unknown as { set: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> };
const poolMock = pool as unknown as { query: ReturnType<typeof vi.fn> };

function makeReq(user?: { userId: string; role: 'user' | 'admin' | 'courier'; email: string }): Partial<Request> {
  return { user } as Partial<Request>;
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-bytes-long!!';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-bytes-long!!';
  process.env.SESSION_TIMEOUT_USER_MS = '1800000';
  process.env.SESSION_TIMEOUT_ADMIN_MS = '900000';
});

// ─── logoutUser ───────────────────────────────────────────────────────────────

describe('logoutUser', () => {
  it('agrega el refresh token a la lista negra en Redis', async () => {
    await logoutUser('some-refresh-token');
    expect(redisMock.set).toHaveBeenCalledWith(
      'blacklist:refresh:some-refresh-token',
      '1',
      'EX',
      expect.any(Number),
    );
  });

  it('usa TTL de 7 días para la lista negra', async () => {
    await logoutUser('token-abc');
    const [, , , ttl] = redisMock.set.mock.calls[0];
    expect(ttl).toBe(7 * 24 * 60 * 60);
  });
});

// ─── refreshAccessToken ───────────────────────────────────────────────────────

describe('refreshAccessToken', () => {
  it('lanza 401 si el refresh token está en la lista negra', async () => {
    redisMock.get.mockResolvedValueOnce('1');
    await expect(refreshAccessToken('blacklisted-token')).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining('revocado'),
    });
  });

  it('lanza 401 si el refresh token tiene firma inválida', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    await expect(refreshAccessToken('invalid.jwt.token')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('lanza 401 si el usuario no existe en DB', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ userId: 'user-999' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    poolMock.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(refreshAccessToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('devuelve nuevo access token con refresh token válido', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    poolMock.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'user-1', email: 'test@test.com', role: 'user', is_active: true }],
    });
    const accessToken = await refreshAccessToken(token);
    expect(typeof accessToken).toBe('string');
    expect(accessToken.split('.').length).toBe(3);
  });

  it('lanza 401 si la cuenta está desactivada', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ userId: 'user-2' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    poolMock.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'user-2', email: 'x@x.com', role: 'user', is_active: false }],
    });
    await expect(refreshAccessToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── updateSessionActivity ────────────────────────────────────────────────────

describe('updateSessionActivity', () => {
  it('guarda timestamp en Redis con clave correcta', async () => {
    await updateSessionActivity('user-42');
    expect(redisMock.set).toHaveBeenCalledWith(
      'session:activity:user-42',
      expect.any(String),
      'EX',
      7200,
    );
  });
});

// ─── getSessionTimeoutWarning ─────────────────────────────────────────────────

describe('getSessionTimeoutWarning', () => {
  it('devuelve shouldWarn=true si no hay actividad registrada', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const result = await getSessionTimeoutWarning('user-1', 'user');
    expect(result.shouldWarn).toBe(true);
    expect(result.expiresInMs).toBe(0);
  });

  it('devuelve shouldWarn=false si hay actividad reciente', async () => {
    redisMock.get.mockResolvedValueOnce(Date.now().toString());
    const result = await getSessionTimeoutWarning('user-1', 'user');
    expect(result.shouldWarn).toBe(false);
    expect(result.expiresInMs).toBeGreaterThan(0);
  });

  it('usa timeout de 15 min para admin', async () => {
    redisMock.get.mockResolvedValueOnce(Date.now().toString());
    const result = await getSessionTimeoutWarning('admin-1', 'admin');
    expect(result.expiresInMs).toBeLessThanOrEqual(900000);
  });

  it('usa timeout de 30 min para user', async () => {
    redisMock.get.mockResolvedValueOnce(Date.now().toString());
    const result = await getSessionTimeoutWarning('user-1', 'user');
    expect(result.expiresInMs).toBeLessThanOrEqual(1800000);
  });

  it('devuelve shouldWarn=true cuando quedan menos de 2 minutos', async () => {
    const lastActivity = Date.now() - (28 * 60 * 1000); // hace 28 min, quedan 2 min
    redisMock.get.mockResolvedValueOnce(lastActivity.toString());
    const result = await getSessionTimeoutWarning('user-1', 'user');
    expect(result.shouldWarn).toBe(true);
  });
});

// ─── checkSessionTimeout middleware ──────────────────────────────────────────

describe('checkSessionTimeout', () => {
  it('llama next() si no hay usuario autenticado', async () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('llama next() si no hay actividad previa registrada (primera vez)', async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const req = makeReq({ userId: 'user-1', role: 'user', email: 'u@u.com' });
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('llama next() si la sesión está activa', async () => {
    redisMock.get.mockResolvedValueOnce(Date.now().toString());
    const req = makeReq({ userId: 'user-1', role: 'user', email: 'u@u.com' });
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('responde 401 si la sesión de usuario expiró por inactividad (>30 min)', async () => {
    const expired = Date.now() - (31 * 60 * 1000);
    redisMock.get.mockResolvedValueOnce(expired.toString());
    const req = makeReq({ userId: 'user-1', role: 'user', email: 'u@u.com' });
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sesión expirada por inactividad' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 si la sesión de admin expiró por inactividad (>15 min)', async () => {
    const expired = Date.now() - (16 * 60 * 1000);
    redisMock.get.mockResolvedValueOnce(expired.toString());
    const req = makeReq({ userId: 'admin-1', role: 'admin', email: 'a@a.com' });
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('admin con actividad hace 14 min no expira', async () => {
    const recent = Date.now() - (14 * 60 * 1000);
    redisMock.get.mockResolvedValueOnce(recent.toString());
    const req = makeReq({ userId: 'admin-1', role: 'admin', email: 'a@a.com' });
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('actualiza la actividad en Redis al pasar el check', async () => {
    redisMock.get.mockResolvedValueOnce(Date.now().toString());
    const req = makeReq({ userId: 'user-1', role: 'user', email: 'u@u.com' });
    const res = makeRes();
    const next = vi.fn();
    await checkSessionTimeout(req as Request, res as unknown as Response, next as NextFunction);
    expect(redisMock.set).toHaveBeenCalledWith(
      'session:activity:user-1',
      expect.any(String),
      'EX',
      7200,
    );
  });
});
