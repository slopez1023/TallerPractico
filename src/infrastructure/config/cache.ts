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

// Simple implementación en memoria del servicio de caché
type CacheEntry<T> = { value: T; expiresAt?: number };
const store = new Map<string, CacheEntry<any>>();

let cleanupInterval: NodeJS.Timeout | null = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}, 60_000);

export const cacheService: ICacheService = {
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
    // Simple wildcard '*' support
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

// Implementación con Redis
let redisClient: RedisClientType | null = null;
let redisServiceInstance: ICacheService | null = null;

const createRedisService = (): ICacheService => {
  if (redisServiceInstance) {
    return redisServiceInstance;
  }

  if (!redisClient) {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));
  }

  redisServiceInstance = {
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      if (!redisClient!.isOpen) {
        await redisClient!.connect();
      }
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient!.setEx(key, ttl, serialized);
      } else {
        await redisClient!.set(key, serialized);
      }
    },

    async get<T>(key: string): Promise<T | null> {
      if (!redisClient!.isOpen) {
        await redisClient!.connect();
      }
      const data = await redisClient!.get(key);
      return data ? JSON.parse(data) : null;
    },

    async delete(key: string): Promise<boolean> {
      if (!redisClient!.isOpen) {
        await redisClient!.connect();
      }
      const result = await redisClient!.del(key);
      return result > 0;
    },

    async exists(key: string): Promise<boolean> {
      if (!redisClient!.isOpen) {
        await redisClient!.connect();
      }
      const result = await redisClient!.exists(key);
      return result > 0;
    },

    async clear(): Promise<void> {
      if (!redisClient!.isOpen) {
        await redisClient!.connect();
      }
      await redisClient!.flushDb();
    },

    async keys(pattern?: string): Promise<string[]> {
      if (!redisClient!.isOpen) {
        await redisClient!.connect();
      }
      return await redisClient!.keys(pattern || '*');
    },

    async close(): Promise<void> {
      if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
      }
      redisClient = null;
      redisServiceInstance = null;
    },
  };

  return redisServiceInstance;
};

// Función para obtener el servicio de caché activo
export const getCacheService = (): ICacheService => {
  const cacheType = process.env.CACHE_TYPE || 'memory';
  
  if (cacheType === 'redis') {
    console.log('🔴 Usando Redis como caché');
    return createRedisService();
  }
  
  console.log('💾 Usando caché en memoria');
  return cacheService;
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