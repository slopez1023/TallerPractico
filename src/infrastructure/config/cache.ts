import dotenv from 'dotenv';

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

// Función para obtener el servicio de caché activo
export const getCacheService = (): ICacheService => {
  // Por ahora usamos el caché en memoria
  // Más adelante podemos cambiar fácilmente a Redis si está disponible
  
  const cacheType = process.env.CACHE_TYPE || 'memory';
  
  if (cacheType === 'memory') {
    console.log('💾 Usando caché en memoria');
    return cacheService;
  }
  
  // Si en el futuro quieres usar Redis, puedes descomentar esto:
  // if (cacheType === 'redis') {
  //   return redisService;
  // }
  
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