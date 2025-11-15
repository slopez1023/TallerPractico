import { EventService } from '../../../src/domain/services/EventService';
import { IEventRepository } from '../../../src/domain/interfaces/IEventRepository';
import { Event } from '../../../src/domain/entities/Event';

// Mock del repositorio
const mockEventRepository: jest.Mocked<IEventRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByDate: jest.fn(),
  findAvailableEvents: jest.fn()
};

// Mock del servicio de caché
const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(false),
  exists: jest.fn().mockResolvedValue(false),
  clear: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  close: jest.fn().mockResolvedValue(undefined)
};

describe('EventService - Pruebas Unitarias', () => {
  let eventService: EventService;

  beforeEach(() => {
    jest.clearAllMocks();
    eventService = new EventService(mockEventRepository, mockCacheService as any);
  });

  describe('createEvent', () => {
    it('debe crear un evento exitosamente', async () => {
      // Arrange - Usar fecha futura para evitar el error de fecha pasada
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 días en el futuro

      const eventData = {
        name: 'Conferencia Tech 2024',
        description: 'Evento de tecnología',
        date: futureDate,
        location: 'Cali, Colombia',
        capacity: 100
      };

      const expectedEvent = new Event(
        '1',
        eventData.name,
        eventData.description,
        eventData.date,
        eventData.location,
        eventData.capacity,
        100,
        new Date(),
        new Date()
      );

      mockEventRepository.create.mockResolvedValue(expectedEvent);

      // Act
      const result = await eventService.createEvent(eventData);

      // Assert
      expect(result).toEqual(expectedEvent);
      expect(mockEventRepository.create).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar error si la capacidad es negativa', async () => {
      // Arrange
      const eventData = {
        name: 'Evento Inválido',
        description: 'Test',
        date: new Date('2025-12-15'),
        location: 'Cali',
        capacity: -10
      };

      // Act & Assert
      // Ajustar al mensaje exacto que usa tu código
      await expect(eventService.createEvent(eventData))
        .rejects
        .toThrow('La capacidad debe ser mayor a 0');

      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si la fecha es pasada', async () => {
      // Arrange
      const pastDate = new Date('2020-01-01');
      const eventData = {
        name: 'Evento Pasado',
        description: 'Test',
        date: pastDate,
        location: 'Cali',
        capacity: 50
      };

      // Act & Assert
      await expect(eventService.createEvent(eventData))
        .rejects
        .toThrow('La fecha del evento no puede ser en el pasado');

      expect(mockEventRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getEventById', () => {
    it('debe obtener un evento por ID', async () => {
      // Arrange
      const eventId = '1';
      const expectedEvent = new Event(
        eventId,
        'Evento Test',
        'Descripción',
        new Date('2025-12-15'),
        'Cali',
        100,
        80,
        new Date(),
        new Date()
      );

      mockEventRepository.findById.mockResolvedValue(expectedEvent);

      // Act
      const result = await eventService.getEventById(eventId);

      // Assert
      expect(result).toEqual(expectedEvent);
      expect(mockEventRepository.findById).toHaveBeenCalledWith(eventId);
    });

    it('debe retornar null si el evento no existe', async () => {
      // Arrange
      const eventId = '999';
      mockEventRepository.findById.mockResolvedValue(null);

      // Act
      const result = await eventService.getEventById(eventId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getAllEvents', () => {
    it('debe obtener todos los eventos', async () => {
      // Arrange
      const expectedEvents: Event[] = [
        new Event(
          '1',
          'Evento 1',
          'Descripción 1',
          new Date('2025-12-15'),
          'Cali',
          100,
          100,
          new Date(),
          new Date()
        ),
        new Event(
          '2',
          'Evento 2',
          'Descripción 2',
          new Date('2025-12-20'),
          'Bogotá',
          50,
          30,
          new Date(),
          new Date()
        )
      ];

      mockEventRepository.findAll.mockResolvedValue(expectedEvents);

      // Act
      const result = await eventService.getAllEvents();

      // Assert
      expect(result).toEqual(expectedEvents);
      expect(result).toHaveLength(2);
      expect(mockEventRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debe retornar array vacío si no hay eventos', async () => {
      // Arrange
      mockEventRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await eventService.getAllEvents();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateEvent', () => {
    it('debe actualizar un evento exitosamente', async () => {
      // Arrange
      const eventId = '1';
      const updateData = {
        name: 'Evento Actualizado',
        capacity: 150
      };

      const existingEvent = new Event(
        eventId,
        'Evento Original',
        'Descripción',
        new Date('2025-12-15'),
        'Cali',
        100,
        100,
        new Date(),
        new Date()
      );

      const updatedEvent = new Event(
        eventId,
        updateData.name,
        'Descripción',
        new Date('2025-12-15'),
        'Cali',
        updateData.capacity,
        100,
        existingEvent.createdAt,
        new Date()
      );

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.update.mockResolvedValue(updatedEvent);

      // Act
      const result = await eventService.updateEvent(eventId, updateData);

      // Assert
      expect(result).toEqual(updatedEvent);
      expect(mockEventRepository.update).toHaveBeenCalledWith(eventId, updateData);
    });
  });

  describe('deleteEvent', () => {
    it('debe eliminar un evento exitosamente', async () => {
      // Arrange
      const eventId = '1';
      const existingEvent = new Event(
        eventId,
        'Evento a Eliminar',
        'Descripción',
        new Date('2025-12-15'),
        'Cali',
        100,
        100,
        new Date(),
        new Date()
      );

      mockEventRepository.findById.mockResolvedValue(existingEvent);
      mockEventRepository.delete.mockResolvedValue(true);

      // Act
      const result = await eventService.deleteEvent(eventId);

      // Assert
      expect(result).toBe(true);
      expect(mockEventRepository.delete).toHaveBeenCalledWith(eventId);
    });

    it('debe retornar undefined si el evento no existe', async () => {
      // Arrange
      const eventId = '999';
      mockEventRepository.findById.mockResolvedValue(null);

      // Act
      const result = await eventService.deleteEvent(eventId);

      // Assert
      // Si tu implementación retorna undefined en lugar de lanzar error
      expect(result).toBeUndefined();
    });
  });
});