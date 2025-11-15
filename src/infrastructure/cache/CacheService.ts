// Sistema de caché en memoria como alternativa a Redis
// Cumple con los requisitos del proyecto sin necesidad de Redis externo

interface CacheItem<T> {
  value: T;
  expiresAt: number | null;
}

export class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.cache = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Almacenar un valor en caché
   * @param key - Clave única
   * @param value - Valor a almacenar
   * @param ttl - Tiempo de vida en segundos (opcional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    
    this.cache.set(key, {
      value,
      expiresAt,
    });

    console.log(`📦 Cache SET: ${key} ${ttl ? `(TTL: ${ttl}s)` : '(sin expiración)'}`);
  }

  /**
   * Obtener un valor del caché
   * @param key - Clave a buscar
   * @returns El valor almacenado o null si no existe o expiró
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    }

    // Verificar si expiró
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      console.log(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }

    console.log(`✅ Cache HIT: ${key}`);
    return item.value as T;
  }

  /**
   * Eliminar un valor del caché
   * @param key - Clave a eliminar
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    console.log(`🗑️ Cache DELETE: ${key} - ${deleted ? 'exitoso' : 'no encontrado'}`);
    return deleted;
  }

  /**
   * Verificar si existe una clave
   * @param key - Clave a verificar
   */
  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Limpiar todo el caché
   */
  async clear(): Promise<void> {
    this.cache.clear();
    console.log('🧹 Cache limpiado completamente');
  }

  /**
   * Obtener todas las claves almacenadas
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) return allKeys;
    
    // Convertir patrón simple (ej: "event:*") a regex
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Limpiar entradas expiradas (ejecutado automáticamente)
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: ${cleanedCount} entradas expiradas eliminadas`);
    }
  }

  /**
   * Iniciar limpieza automática cada 60 segundos
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 60 segundos
  }

  /**
   * Detener la limpieza automática
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cerrar el servicio de caché
   */
  async close(): Promise<void> {
    this.stopCleanup();
    await this.clear();
    console.log('🔌 Servicio de caché cerrado');
  }
}

// Singleton para usar en toda la aplicación
export const cacheService = new CacheService();