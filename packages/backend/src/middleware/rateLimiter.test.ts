import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import redis from '../db/redis';
import pool from '../db/pool';
import {
  rateLimiter,
  loginRateLimiter,
  twoFactorRateLimiter,
  authenticatedApiRateLimiter,
  publicQuoteRateLimiter,
} from './rateLimiter';

// Mock Redis y pool
vi.mock('../db/redis', () => ({
  default: {
    get: vi.fn(),
    incr: vi.fn(),
    pexpire: vi.fn(),
    setex: vi.fn(),
    ttl: vi.fn(),
  },
}));

vi.mock('../db/pool', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      socket: { remoteAddress: '192.168.1.1' } as any,
      path: '/test',
      method: 'POST',
      user: undefined,
      body: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rateLimiter - Generic', () => {
    it('should allow requests within limit', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    it('should block requests exceeding limit', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        blockDurationMs: 900000,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(6);
      (redis.setex as any).mockResolvedValue('OK');
      (pool.query as any).mockResolvedValue({});

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          retryAfter: expect.any(Number),
        })
      );
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should reject blocked requests', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        blockDurationMs: 900000,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      (redis.get as any).mockResolvedValue('1');
      (redis.ttl as any).mockResolvedValue(600);
      (pool.query as any).mockResolvedValue({});

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          retryAfter: 600,
        })
      );
    });

    it('should log rate limit exceeded to audit_logs', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        blockDurationMs: 900000,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      mockReq.user = { userId: 'user-123', email: 'test@test.com', role: 'user' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(6);
      (redis.setex as any).mockResolvedValue('OK');
      (pool.query as any).mockResolvedValue({});

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          'user-123',
          'user',
          'rate_limit_exceeded',
          'rate_limit',
          null,
          null,
          expect.any(String),
          '192.168.1.1',
        ])
      );
    });

    it('should fail open on Redis error', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      (redis.get as any).mockRejectedValue(new Error('Redis error'));

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should set expiration on first request', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.pexpire).toHaveBeenCalledWith(expect.any(String), 60000);
    });
  });

  describe('loginRateLimiter', () => {
    it('should use IP as key', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await loginRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:login:192.168.1.1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block after 5 attempts', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(6);
      (redis.setex as any).mockResolvedValue('OK');
      (pool.query as any).mockResolvedValue({});

      await loginRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(redis.setex).toHaveBeenCalledWith(
        'ratelimit:login:192.168.1.1:blocked',
        900, // 15 minutes
        '1'
      );
    });

    it('should use custom message for login', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(6);
      (redis.setex as any).mockResolvedValue('OK');
      (pool.query as any).mockResolvedValue({});

      await loginRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('bloqueada por 15 minutos'),
        })
      );
    });
  });

  describe('twoFactorRateLimiter', () => {
    it('should use userId as key when authenticated', async () => {
      mockReq.user = { userId: 'user-123', email: 'test@test.com', role: 'user' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await twoFactorRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:2fa:user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use userId from body when not authenticated', async () => {
      mockReq.body = { userId: 'user-456' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await twoFactorRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:2fa:user-456');
    });

    it('should block after 5 attempts', async () => {
      mockReq.user = { userId: 'user-123', email: 'test@test.com', role: 'user' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(6);
      (redis.setex as any).mockResolvedValue('OK');
      (pool.query as any).mockResolvedValue({});

      await twoFactorRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });

  describe('authenticatedApiRateLimiter', () => {
    it('should use userId as key', async () => {
      mockReq.user = { userId: 'user-123', email: 'test@test.com', role: 'user' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await authenticatedApiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:api:user-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow 100 requests per minute', async () => {
      mockReq.user = { userId: 'user-123', email: 'test@test.com', role: 'user' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(100);

      await authenticatedApiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    });

    it('should block after 100 requests', async () => {
      mockReq.user = { userId: 'user-123', email: 'test@test.com', role: 'user' };

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(101);
      (pool.query as any).mockResolvedValue({});

      await authenticatedApiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });

  describe('publicQuoteRateLimiter', () => {
    it('should use IP as key', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await publicQuoteRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:quote:192.168.1.1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow 10 requests per hour', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(10);

      await publicQuoteRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block after 10 requests', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(11);
      (pool.query as any).mockResolvedValue({});

      await publicQuoteRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Regístrese'),
        })
      );
    });

    it('should use 1 hour window', async () => {
      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await publicQuoteRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.pexpire).toHaveBeenCalledWith(expect.any(String), 3600000); // 1 hour in ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', async () => {
      mockReq.ip = undefined;
      mockReq.socket = {} as any;

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await loginRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:login:unknown');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing user in authenticated limiter', async () => {
      mockReq.user = undefined;

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(1);
      (redis.pexpire as any).mockResolvedValue(1);

      await authenticatedApiRateLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:api:anonymous');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle audit log insertion failure gracefully', async () => {
      const limiter = rateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        blockDurationMs: 900000,
        keyGenerator: (req) => `test:${req.ip}`,
      });

      (redis.get as any).mockResolvedValue(null);
      (redis.incr as any).mockResolvedValue(6);
      (redis.setex as any).mockResolvedValue('OK');
      (pool.query as any).mockRejectedValue(new Error('DB error'));

      // Should not throw, just log error
      await expect(
        limiter(mockReq as Request, mockRes as Response, mockNext)
      ).resolves.not.toThrow();

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });
});
