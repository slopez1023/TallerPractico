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

// NO crear interval en absoluto para evitar problemas con Jest
let cleanupInterval: NodeJS.Timeout | null = null;

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

// Implementación con Redis (singleton con fallback automático a memoria)
let redisClient: RedisClientType | null = null;
let redisServiceInstance: ICacheService | null = null;
let redisAvailable = false;

const createRedisService = async (): Promise<ICacheService> => {
  // Si ya existe y Redis está disponible, retornar
  if (redisServiceInstance && redisAvailable) {
    return redisServiceInstance;
  }

  // Intentar conectar a Redis
  if (!redisClient) {
    try {
      redisClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          connectTimeout: 5000,
        },
      });

      redisClient.on('error', () => {
        // Silenciar errores de Redis
      });

      await redisClient.connect();
      redisAvailable = true;
      console.log('✅ Redis conectado');
    } catch (error) {
      console.warn('⚠️ Redis no disponible, usando cache en memoria');
      redisAvailable = false;
      redisClient = null;
      return memoryCacheService;
    }
  }

  redisServiceInstance = {
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      if (!redisAvailable || !redisClient || !redisClient.isOpen) {
        return memoryCacheService.set(key, value, ttl);
      }
      try {
        const serialized = JSON.stringify(value);
        if (ttl) {
          await redisClient.setEx(key, ttl, serialized);
        } else {
          await redisClient.set(key, serialized);
        }
      } catch (error) {
        return memoryCacheService.set(key, value, ttl);
      }
    },

    async get<T>(key: string): Promise<T | null> {
      if (!redisAvailable || !redisClient || !redisClient.isOpen) {
        return memoryCacheService.get(key);
      }
      try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        return memoryCacheService.get(key);
      }
    },

    async delete(key: string): Promise<boolean> {
      if (!redisAvailable || !redisClient || !redisClient.isOpen) {
        return memoryCacheService.delete(key);
      }
      try {
        const result = await redisClient.del(key);
        return result > 0;
      } catch (error) {
        return memoryCacheService.delete(key);
      }
    },

    async exists(key: string): Promise<boolean> {
      if (!redisAvailable || !redisClient || !redisClient.isOpen) {
        return memoryCacheService.exists(key);
      }
      try {
        const result = await redisClient.exists(key);
        return result > 0;
      } catch (error) {
        return memoryCacheService.exists(key);
      }
    },

    async clear(): Promise<void> {
      if (!redisAvailable || !redisClient || !redisClient.isOpen) {
        return memoryCacheService.clear();
      }
      try {
        await redisClient.flushDb();
      } catch (error) {
        return memoryCacheService.clear();
      }
    },

    async keys(pattern?: string): Promise<string[]> {
      if (!redisAvailable || !redisClient || !redisClient.isOpen) {
        return memoryCacheService.keys(pattern);
      }
      try {
        return await redisClient.keys(pattern || '*');
      } catch (error) {
        return memoryCacheService.keys(pattern);
      }
    },

    async close(): Promise<void> {
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.disconnect();
        }
      } catch (error) {
        // Ignorar errores al cerrar
      } finally {
        redisClient = null;
        redisServiceInstance = null;
        redisAvailable = false;
      }
    },
  };

  return redisServiceInstance;
};

// Singleton del servicio de caché
let cacheServiceInstance: ICacheService | null = null;
let cacheInitializing = false;

// Función para obtener el servicio de caché activo (siempre retorna memoria, Redis es async)
export const getCacheService = (): ICacheService => {
  if (cacheServiceInstance) {
    return cacheServiceInstance;
  }

  const cacheType = process.env.CACHE_TYPE || 'memory';
  
  if (cacheType === 'redis' && !cacheInitializing) {
    console.log('🔴 Intentando conectar a Redis...');
    // Iniciar conexión a Redis en background, pero retornar memoria inmediatamente
    cacheInitializing = true;
    createRedisService().then((service) => {
      cacheServiceInstance = service;
      cacheInitializing = false;
    }).catch(() => {
      console.log('💾 Fallback a caché en memoria');
      cacheServiceInstance = memoryCacheService;
      cacheInitializing = false;
    });
    // Mientras tanto, usar memoria
    return memoryCacheService;
  }
  
  console.log('💾 Usando caché en memoria');
  cacheServiceInstance = memoryCacheService;
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