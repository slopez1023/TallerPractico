import { Pool } from 'pg';
import { EventRepository } from '../../src/infrastructure/database/repositories/EventRepository';
import { EventService } from '../../src/domain/services/EventService';
import { ICacheService } from '../../src/infrastructure/config/cache';
import dotenv from 'dotenv';

// Cargar variables de entorno para tests
dotenv.config({ path: '.env.test' });

// Mock del servicio de caché para pruebas
const mockCacheService: ICacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(false),
  exists: jest.fn().mockResolvedValue(false),
  clear: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  close: jest.fn().mockResolvedValue(undefined)
};

// Configuración de base de datos de prueba
const testPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_TEST_NAME || 'eventia_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123'
});

describe('Events Integration Tests', () => {
  let eventRepository: EventRepository;
  let eventService: EventService;

  beforeAll(async () => {
    // Usar la base de datos existente (las tablas ya están creadas)
    eventRepository = new EventRepository(testPool);
    eventService = new EventService(eventRepository, mockCacheService);
  });

  beforeEach(async () => {
    // Limpiar solo los datos de prueba antes de cada test
    await testPool.query('TRUNCATE TABLE events RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    // Solo limpiar y cerrar conexión (no eliminar tablas)
    await testPool.query('TRUNCATE TABLE events RESTART IDENTITY CASCADE');
    await testPool.end();
  });

  describe('Event Creation Flow', () => {
    it('debe crear un evento y guardarlo en la base de datos', async () => {
      // Arrange - Usar fecha futura
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 días en el futuro
      
      const eventData = {
        name: 'Conferencia Tech 2024',
        description: 'Gran evento de tecnología',
        date: futureDate,
        location: 'Cali, Colombia',
        capacity: 100
      };

      // Act
      const createdEvent = await eventService.createEvent(eventData);

      // Assert
      expect(createdEvent).toBeDefined();
      expect(createdEvent.id).toBeDefined();
      expect(createdEvent.name).toBe(eventData.name);
      expect(createdEvent.capacity).toBe(100);
      expect(createdEvent.availableSpots).toBe(100);

      // Verificar en base de datos
      const result = await testPool.query('SELECT * FROM events WHERE id = $1', [createdEvent.id]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe(eventData.name);
    });

    it('debe validar capacidad negativa antes de guardar', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const eventData = {
        name: 'Evento Inválido',
        description: 'Test',
        date: futureDate,
        location: 'Cali',
        capacity: -10
      };

      // Act & Assert
      await expect(eventService.createEvent(eventData))
        .rejects
        .toThrow('La capacidad debe ser mayor a 0');

      // Verificar que no se guardó nada
      const result = await testPool.query('SELECT COUNT(*) FROM events');
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('Event Retrieval Flow', () => {
    it('debe recuperar un evento por ID', async () => {
      // Arrange - Crear evento directamente en BD
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento Test', 'Descripción', futureDate, 'Cali', 50, 50]);
      
      const eventId = result.rows[0].id;

      // Act
      const event = await eventService.getEventById(eventId);

      // Assert
      expect(event).toBeDefined();
      expect(event).not.toBeNull();
      expect(event!.id).toBe(eventId);
      expect(event!.name).toBe('Evento Test');
      expect(event!.capacity).toBe(50);
    });

    it('debe obtener todos los eventos', async () => {
      // Arrange - Crear varios eventos
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES 
          ('Evento 1', 'Desc 1', $1, 'Cali', 100, 100),
          ('Evento 2', 'Desc 2', $1, 'Bogotá', 50, 50),
          ('Evento 3', 'Desc 3', $1, 'Medellín', 75, 75)
      `, [futureDate]);

      // Act
      const events = await eventService.getAllEvents();

      // Assert
      expect(events).toHaveLength(3);
      expect(events[0].name).toBe('Evento 1');
      expect(events[1].name).toBe('Evento 2');
      expect(events[2].name).toBe('Evento 3');
    });
  });

  describe('Event Update Flow', () => {
    it('debe actualizar un evento correctamente', async () => {
      // Arrange - Crear evento
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento Original', 'Descripción', futureDate, 'Cali', 100, 100]);
      
      const eventId = result.rows[0].id;

      // Act
      const updatedEvent = await eventService.updateEvent(eventId, {
        name: 'Evento Actualizado',
        capacity: 150
      });

      // Assert
      expect(updatedEvent).not.toBeNull();
      expect(updatedEvent!.name).toBe('Evento Actualizado');
      expect(updatedEvent!.capacity).toBe(150);

      // Verificar en BD
      const dbResult = await testPool.query('SELECT * FROM events WHERE id = $1', [eventId]);
      expect(dbResult.rows[0].name).toBe('Evento Actualizado');
      expect(dbResult.rows[0].capacity).toBe(150);
    });
  });

  describe('Event Deletion Flow', () => {
    it('debe eliminar un evento correctamente', async () => {
      // Arrange - Crear evento
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = await testPool.query(`
        INSERT INTO events (name, description, date, location, capacity, available_spots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['Evento a Eliminar', 'Descripción', futureDate, 'Cali', 100, 100]);
      
      const eventId = result.rows[0].id;

      // Act
      const deleted = await eventService.deleteEvent(eventId);

      // Assert
      expect(deleted).toBe(true);

      // Verificar que ya no existe en BD
      const dbResult = await testPool.query('SELECT * FROM events WHERE id = $1', [eventId]);
      expect(dbResult.rows).toHaveLength(0);
    });
  });
});