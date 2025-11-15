import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del pool de conexiones de PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'eventia_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: process.env.NODE_ENV === 'test' ? 5 : 20, // Menos conexiones en tests
  idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 10000 : 30000,
  connectionTimeoutMillis: process.env.NODE_ENV === 'test' ? 5000 : 2000,
  statement_timeout: process.env.NODE_ENV === 'test' ? 10000 : 0, // Timeout de queries en tests
  query_timeout: process.env.NODE_ENV === 'test' ? 10000 : 0,
});

// Evento de error del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

// Función para verificar la conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a PostgreSQL exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
    return false;
  }
};

// Función para cerrar el pool
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('🔌 Pool de PostgreSQL cerrado');
};

export default pool;