import dotenv from 'dotenv';
import { createClient, RedisClientType } from 'redis';

dotenv.config();

// Interface común para cualquier implementación de caché
export interface ICacheService {
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  close(): Promise<void>;
}

// Simple implementación en memoria del servicio de caché (sin interval para tests)
type CacheEntry<T> = { value: T; expiresAt?: number };
const store = new Map<string, CacheEntry<any>>();

// Solo crear interval si NO estamos en modo test
let cleanupInterval: NodeJS.Timeout | null = null;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
        store.delete(key);
      }
    }
  }, 60_000);
}

export const memoryCacheService: ICacheService = {
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
    store.set(key, { value, expiresAt });
  },

  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async delete(key: string): Promise<boolean> {
    return store.delete(key);
  },

  async exists(key: string): Promise<boolean> {
    const entry = store.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return false;
    }
    return true;
  },

  async clear(): Promise<void> {
    store.clear();
  },

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(store.keys());
    if (!pattern) return keys;
    const regex = new RegExp('^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    return keys.filter(k => regex.test(k));
  },

  async close(): Promise<void> {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    store.clear();
  },
};

// Implementación con Redis (singleton con conexión lazy)
let redisClient: RedisClientType | null = null;
let redisConnecting = false;
let redisServiceInstance: ICacheService | null = null;

const ensureRedisConnected = async (): Promise<void> => {
  if (!redisClient) {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: false, // No auto-reconectar en tests
      },
    });
    redisClient.on('error', (err) => console.warn('Redis warning:', err.message));
  }

  if (!redisClient.isOpen && !redisConnecting) {
    redisConnecting = true;
    try {
      await redisClient.connect();
      console.log('✅ Redis conectado');
    } catch (error) {
      console.warn('⚠️ No se pudo conectar a Redis:', error);
      throw error;
    } finally {
      redisConnecting = false;
    }
  }
};

const createRedisService = (): ICacheService => {
  if (redisServiceInstance) {
    return redisServiceInstance;
  }

  redisServiceInstance = {
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      await ensureRedisConnected();
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient!.setEx(key, ttl, serialized);
      } else {
        await redisClient!.set(key, serialized);
      }
    },

    async get<T>(key: string): Promise<T | null> {
      await ensureRedisConnected();
      const data = await redisClient!.get(key);
      return data ? JSON.parse(data) : null;
    },

    async delete(key: string): Promise<boolean> {
      await ensureRedisConnected();
      const result = await redisClient!.del(key);
      return result > 0;
    },

    async exists(key: string): Promise<boolean> {
      await ensureRedisConnected();
      const result = await redisClient!.exists(key);
      return result > 0;
    },

    async clear(): Promise<void> {
      await ensureRedisConnected();
      await redisClient!.flushDb();
    },

    async keys(pattern?: string): Promise<string[]> {
      await ensureRedisConnected();
      return await redisClient!.keys(pattern || '*');
    },

    async close(): Promise<void> {
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (error) {
        console.warn('Error closing Redis:', error);
      } finally {
        redisClient = null;
        redisServiceInstance = null;
        redisConnecting = false;
      }
    },
  };

  return redisServiceInstance;
};

// Singleton del servicio de caché
let cacheServiceInstance: ICacheService | null = null;

// Función para obtener el servicio de caché activo
export const getCacheService = (): ICacheService => {
  if (cacheServiceInstance) {
    return cacheServiceInstance;
  }

  const cacheType = process.env.CACHE_TYPE || 'memory';
  
  if (cacheType === 'redis') {
    console.log('🔴 Usando Redis como caché');
    cacheServiceInstance = createRedisService();
  } else {
    console.log('💾 Usando caché en memoria');
    cacheServiceInstance = memoryCacheService;
  }
  
  return cacheServiceInstance;
};

// Test de conexión del caché
export const testCacheConnection = async (): Promise<boolean> => {
  try {
    const cache = getCacheService();
    await cache.set('test:connection', 'ok', 5);
    const result = await cache.get<string>('test:connection');
    await cache.delete('test:connection');
    
    if (result === 'ok') {
      console.log('✅ Servicio de caché funcionando correctamente');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error en el servicio de caché:', error);
    return false;
  }
};

export default getCacheService();