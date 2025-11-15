import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: isTestEnv 
    ? (process.env.DB_TEST_NAME || 'eventia_test')
    : (process.env.DB_NAME || 'eventia_db'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function setupDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🗃️  Iniciando configuración de base de datos...');
    console.log(`📊 Base de datos: ${isTestEnv ? process.env.DB_TEST_NAME || 'eventia_test' : process.env.DB_NAME || 'eventia_db'}\n`);

    // Crear tabla de eventos
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        location VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL CHECK (capacity > 0),
        available_capacity INTEGER NOT NULL CHECK (available_capacity >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla "events" creada/verificada');

    // Crear tabla de participantes
    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla "participants" creada/verificada');

    // Crear tabla de asistencia
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, participant_id)
      )
    `);
    console.log('✅ Tabla "attendance" creada/verificada');

    // Crear índices para mejor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    `);
    console.log('✅ Índice en events(date) creado/verificado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
    `);
    console.log('✅ Índice en participants(email) creado/verificado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
    `);
    console.log('✅ Índice en attendance(event_id) creado/verificado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_participant ON attendance(participant_id);
    `);
    console.log('✅ Índice en attendance(participant_id) creado/verificado');

    // Crear función para actualizar updated_at automáticamente
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Función update_updated_at_column() creada/verificada');

    // Crear triggers para actualizar updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_events_updated_at ON events;
      CREATE TRIGGER update_events_updated_at
        BEFORE UPDATE ON events
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger para events.updated_at creado/verificado');

    await client.query(`
      DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
      CREATE TRIGGER update_participants_updated_at
        BEFORE UPDATE ON participants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger para participants.updated_at creado/verificado');

    console.log('\n🎉 ¡Configuración de base de datos completada exitosamente!');
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar setup si este archivo se ejecuta directamente
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

export { setupDatabase };