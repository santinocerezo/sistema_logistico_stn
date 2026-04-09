import Redis from 'ioredis';

const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 500,
});

client.on('error', () => {
  // Redis no disponible — la app continúa degradada (sin caché ni rate limiting)
});

// Proxy que silencia todos los errores de Redis para que no interrumpan la app
const redis = new Proxy(client, {
  get(target, prop: string) {
    const value = (target as any)[prop];
    if (typeof value !== 'function' || prop === 'on' || prop === 'emit') {
      return value;
    }
    return async (...args: any[]) => {
      try {
        return await (value as Function).apply(target, args);
      } catch {
        return null;
      }
    };
  },
});

export default redis;
