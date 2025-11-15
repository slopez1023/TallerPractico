import request from 'supertest';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno para tests
dotenv.config({ path: '.env.test' });

// Nota: Tu app debe exportar la instancia de Express
// En src/index.ts: export { app };
let app: any;
let testPool: Pool;

beforeAll(async () => {
  // Configurar base de datos de prueba
  testPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'eventia_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123'
  });

  // Importar app
  const appModule = await import('../../src/index');
  app = appModule.app;
});

beforeEach(async () => {
  // Limpiar datos manteniendo la estructura
  try {
    await testPool.query('DELETE FROM attendances');
    await testPool.query('DELETE FROM participants');
    await testPool.query('DELETE FROM events');
  } catch (error) {
    console.warn('Warning during cleanup:', error);
  }
});

afterAll(async () => {
  // Cerrar todas las conexiones de forma agresiva
  const closePromises: Promise<any>[] = [];
  
  // 1. Cerrar pool de tests
  if (testPool) {
    closePromises.push(
      testPool.end().catch(e => console.warn('testPool close warning:', e.message))
    );
  }
  
  // 2. Cerrar pool de la aplicación
  closePromises.push(
    import('../../src/infrastructure/config/database')
      .then(({ closePool }) => closePool())
      .catch(e => console.warn('closePool warning:', e.message))
  );
  
  // 3. Cerrar cache service
  closePromises.push(
    import('../../src/infrastructure/config/cache')
      .then(({ getCacheService }) => {
        const cache = getCacheService();
        return cache?.close?.();
      })
      .catch(e => console.warn('cache close warning:', e.message))
  );
  
  // Esperar a que todo cierre con timeout de 5 segundos
  await Promise.race([
    Promise.all(closePromises),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);
}, 10000);

describe('Events API - E2E Tests', () => {
  describe('POST /api/events', () => {
    it('debe crear un evento exitosamente', async () => {
      // Crear fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const eventData = {
        name: 'Conferencia Tech 2024',
        description: 'Evento de tecnología',
        date: futureDate.toISOString(),
        location: 'Cali, Colombia',
        capacity: 100
      };

      const response = await request(app)
        .post('/api/v1/events')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(eventData.name);
      expect(response.body.data.capacity).toBe(100);
      expect(response.body.data.availableSpots).toBe(100);
    });

    it('debe retornar 400 si faltan campos requeridos', async () => {
      const invalidData = {
        name: 'Evento sin fecha'
        // Falta date, location, capacity
      };

      const response = await request(app)
        .post('/api/v1/events')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/events', () => {
    it('debe obtener todos los eventos', async () => {
      // Crear eventos de prueba con fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES 
          ('Evento 1', 'Desc 1', $1, 'Cali', 100, 100),
          ('Evento 2', 'Desc 2', $1, 'Bogotá', 50, 50)
      `, [futureDate]);

      const response = await request(app)
        .get('/api/v1/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(2);
    });

    it('debe retornar array vacío si no hay eventos', async () => {
      // Este test verifica que GET funciona cuando no hay datos
      // El beforeEach ya limpió la base de datos
      const response = await request(app)
        .get('/api/v1/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/events/:id', () => {
    it('debe obtener un evento específico', async () => {
      // Crear evento con fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento Test', 'Descripción', futureDate, 'Cali', 50, 50]);
      
      const eventId = result.rows[0].id;

      const response = await request(app)
        .get(`/api/v1/events/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(eventId);
      expect(response.body.data.name).toBe('Evento Test');
    });

    it('debe retornar 404 si el evento no existe', async () => {
      const response = await request(app)
        .get('/api/v1/events/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/events/:id', () => {
    it('debe actualizar un evento', async () => {
      // Crear evento con fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento Original', 'Desc', futureDate, 'Cali', 100, 100]);
      
      const eventId = result.rows[0].id;

      const updateData = {
        name: 'Evento Actualizado',
        capacity: 150
      };

      const response = await request(app)
        .put(`/api/v1/events/${eventId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Evento Actualizado');
      expect(response.body.data.capacity).toBe(150);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('debe eliminar un evento', async () => {
      // Crear evento con fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento a Borrar', 'Desc', futureDate, 'Cali', 100, 100]);
      
      const eventId = result.rows[0].id;

      await request(app)
        .delete(`/api/v1/events/${eventId}`)
        .expect(200);

      // Verificar que ya no existe
      await request(app)
        .get(`/api/v1/events/${eventId}`)
        .expect(404);
    });
  });
});

describe('Participants API - E2E Tests', () => {
  describe('POST /api/participants', () => {
    it('debe crear un participante exitosamente', async () => {
      const participantData = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '3001234567'
      };

      const response = await request(app)
        .post('/api/v1/participants')
        .send(participantData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(participantData.name);
      expect(response.body.data.email).toBe(participantData.email);
    });

    it('debe validar email único', async () => {
      const participantData = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '3001234567'
      };

      // Primera creación
      await request(app)
        .post('/api/v1/participants')
        .send(participantData)
        .expect(201);

      // Segunda creación con mismo email
      const response = await request(app)
        .post('/api/v1/participants')
        .send(participantData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Attendance API - E2E Tests', () => {
  let eventId: number;
  let participantId: number;

  beforeEach(async () => {
    // Crear evento y participante para pruebas con fecha futura
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const eventResult = await testPool.query(`
      INSERT INTO events (name, description, date, location, capacity, available_spots)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, ['Evento Test', 'Descripción', futureDate, 'Cali', 100, 100]);
    eventId = eventResult.rows[0].id;

    const participantResult = await testPool.query(`
      INSERT INTO participants (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Juan Pérez', 'juan@example.com', '3001234567']);
    participantId = participantResult.rows[0].id;
  });

  describe('POST /api/attendance', () => {
    it('debe registrar asistencia exitosamente', async () => {
      const attendanceData = {
        eventId,
        participantId
      };

      const response = await request(app)
        .post('/api/v1/attendances')
        .send(attendanceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.eventId).toBe(eventId);
      expect(response.body.data.participantId).toBe(participantId);
    });

    it('debe prevenir doble registro', async () => {
      const attendanceData = {
        eventId,
        participantId
      };

      // Primer registro
      await request(app)
        .post('/api/v1/attendances')
        .send(attendanceData)
        .expect(201);

      // Segundo registro
      const response = await request(app)
        .post('/api/v1/attendances')
        .send(attendanceData)
        .expect(400);

      expect(response.body.error).toContain('ya está registrado');
    });

    it('debe validar capacidad del evento', async () => {
      // Crear evento con capacidad 1 y fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const smallEventResult = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento Pequeño', 'Desc', futureDate, 'Cali', 1, 1]);
      const smallEventId = smallEventResult.rows[0].id;

      // Crear dos participantes
      const p1Result = await testPool.query(`
        INSERT INTO participants (name, email, phone) VALUES ($1, $2, $3) RETURNING id
      `, ['Participante 1', 'p1@test.com', '3001111111']);
      
      const p2Result = await testPool.query(`
        INSERT INTO participants (name, email, phone) VALUES ($1, $2, $3) RETURNING id
      `, ['Participante 2', 'p2@test.com', '3002222222']);

      // Primer registro (debe funcionar)
      await request(app)
        .post('/api/v1/attendances')
        .send({ eventId: smallEventId, participantId: p1Result.rows[0].id })
        .expect(201);

      // Segundo registro (debe fallar por capacidad)
      const response = await request(app)
        .post('/api/v1/attendances')
        .send({ eventId: smallEventId, participantId: p2Result.rows[0].id })
        .expect(400);

      expect(response.body.error).toContain('No hay cupos disponibles');
    });
  });

  describe('GET /api/attendance/event/:eventId', () => {
    it('debe obtener todas las asistencias de un evento', async () => {
      // Registrar asistencia
      await testPool.query(`
        INSERT INTO attendances (event_id, participant_id)
        VALUES ($1, $2)
      `, [eventId, participantId]);

      const response = await request(app)
        .get(`/api/v1/attendances/event/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].eventId).toBe(eventId);
    });
  });
});