import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import redis from '../db/redis';

/**
 * Integration tests for rate limiter with real Redis
 * These tests verify the rate limiting behavior with actual Redis operations
 */
describe('Rate Limiter Integration Tests', () => {
  beforeAll(async () => {
    // Connect to Redis
    await redis.connect();
  });

  afterAll(async () => {
    // Clean up test keys
    const keys = await redis.keys('ratelimit:test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.quit();
  });

  describe('Redis Operations', () => {
    it('should increment counter correctly', async () => {
      const key = 'ratelimit:test:counter';
      
      const count1 = await redis.incr(key);
      expect(count1).toBe(1);
      
      const count2 = await redis.incr(key);
      expect(count2).toBe(2);
      
      const count3 = await redis.incr(key);
      expect(count3).toBe(3);
      
      await redis.del(key);
    });

    it('should set expiration correctly', async () => {
      const key = 'ratelimit:test:expiration';
      
      await redis.incr(key);
      await redis.pexpire(key, 1000); // 1 second
      
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1);
      
      await redis.del(key);
    });

    it('should handle blocking correctly', async () => {
      const key = 'ratelimit:test:block';
      const blockKey = `${key}:blocked`;
      
      await redis.setex(blockKey, 5, '1'); // Block for 5 seconds
      
      const isBlocked = await redis.get(blockKey);
      expect(isBlocked).toBe('1');
      
      const ttl = await redis.ttl(blockKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(5);
      
      await redis.del(blockKey);
    });

    it('should expire keys automatically', async () => {
      const key = 'ratelimit:test:autoexpire';
      
      await redis.incr(key);
      await redis.pexpire(key, 100); // 100ms
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const exists = await redis.exists(key);
      expect(exists).toBe(0);
    });

    it('should handle concurrent increments', async () => {
      const key = 'ratelimit:test:concurrent';
      
      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () => redis.incr(key));
      const results = await Promise.all(promises);
      
      // All increments should succeed and return unique values
      expect(results).toHaveLength(10);
      expect(Math.max(...results)).toBe(10);
      
      await redis.del(key);
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should simulate login rate limiting', async () => {
      const ip = '192.168.1.100';
      const key = `ratelimit:test:login:${ip}`;
      const blockKey = `${key}:blocked`;
      const maxAttempts = 5;
      const windowMs = 60000; // 1 minute
      const blockDurationSec = 900; // 15 minutes
      
      // Simulate 5 login attempts
      for (let i = 1; i <= maxAttempts; i++) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.pexpire(key, windowMs);
        }
        expect(count).toBe(i);
      }
      
      // 6th attempt should trigger block
      const count = await redis.incr(key);
      expect(count).toBe(6);
      
      // Set block
      await redis.setex(blockKey, blockDurationSec, '1');
      
      // Verify block is active
      const isBlocked = await redis.get(blockKey);
      expect(isBlocked).toBe('1');
      
      // Clean up
      await redis.del(key, blockKey);
    });

    it('should simulate API rate limiting', async () => {
      const userId = 'user-test-123';
      const key = `ratelimit:test:api:${userId}`;
      const maxRequests = 100;
      const windowMs = 60000; // 1 minute
      
      // Simulate 100 API requests
      for (let i = 1; i <= maxRequests; i++) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.pexpire(key, windowMs);
        }
        expect(count).toBe(i);
      }
      
      // 101st request should be blocked
      const count = await redis.incr(key);
      expect(count).toBe(101);
      expect(count).toBeGreaterThan(maxRequests);
      
      // Clean up
      await redis.del(key);
    });

    it('should simulate public quote rate limiting', async () => {
      const ip = '192.168.1.200';
      const key = `ratelimit:test:quote:${ip}`;
      const maxRequests = 10;
      const windowMs = 3600000; // 1 hour
      
      // Simulate 10 quote requests
      for (let i = 1; i <= maxRequests; i++) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.pexpire(key, windowMs);
        }
        expect(count).toBe(i);
      }
      
      // 11th request should be blocked
      const count = await redis.incr(key);
      expect(count).toBe(11);
      expect(count).toBeGreaterThan(maxRequests);
      
      // Clean up
      await redis.del(key);
    });

    it('should reset counter after window expires', async () => {
      const key = 'ratelimit:test:reset';
      const windowMs = 200; // 200ms for fast test
      
      // First request
      const count1 = await redis.incr(key);
      await redis.pexpire(key, windowMs);
      expect(count1).toBe(1);
      
      // Second request within window
      const count2 = await redis.incr(key);
      expect(count2).toBe(2);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 50));
      
      // First request in new window
      const count3 = await redis.incr(key);
      expect(count3).toBe(1); // Counter should reset
      
      // Clean up
      await redis.del(key);
    });
  });

  describe('Edge Cases', () => {
    it('should handle key that does not exist', async () => {
      const key = 'ratelimit:test:nonexistent';
      
      const value = await redis.get(key);
      expect(value).toBeNull();
      
      const exists = await redis.exists(key);
      expect(exists).toBe(0);
    });

    it('should handle multiple blocks for same key', async () => {
      const key = 'ratelimit:test:multiblock';
      const blockKey = `${key}:blocked`;
      
      // First block
      await redis.setex(blockKey, 2, '1');
      const ttl1 = await redis.ttl(blockKey);
      expect(ttl1).toBeGreaterThan(0);
      
      // Overwrite with new block (simulating repeated violations)
      await redis.setex(blockKey, 5, '1');
      const ttl2 = await redis.ttl(blockKey);
      expect(ttl2).toBeGreaterThan(ttl1);
      
      // Clean up
      await redis.del(blockKey);
    });

    it('should handle very high request rates', async () => {
      const key = 'ratelimit:test:highrate';
      const numRequests = 1000;
      
      // Simulate 1000 rapid requests
      const promises = Array.from({ length: numRequests }, () => redis.incr(key));
      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results).toHaveLength(numRequests);
      expect(Math.max(...results)).toBe(numRequests);
      
      // Clean up
      await redis.del(key);
    });
  });
});
