import { IEventRepository } from '../interfaces/IEventRepository';
import { ICacheService } from '../../infrastructure/config/cache';
import { Event } from '../entities/Event';

export class EventService {
  constructor(
    private eventRepository: IEventRepository,
    private cacheService: ICacheService
  ) {}

  async createEvent(eventData: {
    name: string;
    description: string;
    date: Date;
    location: string;
    capacity: number;
  }): Promise<Event> {
    // Validaciones de negocio
    if (eventData.capacity <= 0) {
      throw new Error('La capacidad debe ser mayor a 0');
    }

    if (new Date(eventData.date) < new Date()) {
      throw new Error('La fecha del evento no puede ser en el pasado');
    }

    // Crear el evento con available_spots igual a capacity
    const event = new Event(
      '', // El ID se genera en la BD
      eventData.name,
      eventData.description,
      eventData.date,
      eventData.location,
      eventData.capacity,
      eventData.capacity, // Inicialmente todos los spots están disponibles
      new Date(),
      new Date()
    );

    const createdEvent = await this.eventRepository.create(event);

    // Invalidar caché de eventos disponibles
    await this.cacheService.delete('events:available');
    await this.cacheService.delete('events:all');

    return createdEvent;
  }

  async getEventById(id: string): Promise<Event | null> {
    // Intentar obtener del caché primero
    const cacheKey = `event:${id}`;
    const cached = await this.cacheService.get<Event>(cacheKey);

    if (cached) {
      return cached;
    }

    // Si no está en caché, buscar en BD
    const event = await this.eventRepository.findById(id);

    if (event) {
      // Guardar en caché por 5 minutos
      await this.cacheService.set(cacheKey, event, 300);
    }

    return event;
  }

  async getAllEvents(): Promise<Event[]> {
    // Intentar obtener del caché
    const cacheKey = 'events:all';
    const cached = await this.cacheService.get<Event[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Si no está en caché, buscar en BD
    const events = await this.eventRepository.findAll();

    // Guardar en caché por 2 minutos
    await this.cacheService.set(cacheKey, events, 120);

    return events;
  }

  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event | null> {
    const existingEvent = await this.eventRepository.findById(id);

    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Validar capacidad si se está actualizando
    if (eventData.capacity !== undefined) {
      const occupiedSpots = existingEvent.capacity - existingEvent.availableSpots;
      
      if (eventData.capacity < occupiedSpots) {
        throw new Error(
          `No se puede reducir la capacidad a ${eventData.capacity}. Ya hay ${occupiedSpots} participantes registrados`
        );
      }

      // Ajustar available_spots si cambia la capacidad
      eventData.availableSpots = eventData.capacity - occupiedSpots;
    }

    const updatedEvent = await this.eventRepository.update(id, eventData);

    // Invalidar cachés relacionados
    await this.cacheService.delete(`event:${id}`);
    await this.cacheService.delete('events:all');
    await this.cacheService.delete('events:available');

    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const deleted = await this.eventRepository.delete(id);

    if (deleted) {
      // Invalidar cachés
      await this.cacheService.delete(`event:${id}`);
      await this.cacheService.delete('events:all');
      await this.cacheService.delete('events:available');
    }

    return deleted;
  }

  async getAvailableEvents(): Promise<Event[]> {
    // Intentar obtener del caché
    const cacheKey = 'events:available';
    const cached = await this.cacheService.get<Event[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Si no está en caché, buscar en BD
    const events = await this.eventRepository.findAvailableEvents();

    // Guardar en caché por 1 minuto (datos más dinámicos)
    await this.cacheService.set(cacheKey, events, 60);

    return events;
  }

  async getEventsByDate(date: Date): Promise<Event[]> {
    return await this.eventRepository.findByDate(date);
  }

  async getEventStatistics(id: string): Promise<{
    event: Event;
    occupancyPercentage: number;
    registeredCount: number;
    availableSpots: number;
  } | null> {
    const event = await this.getEventById(id);

    if (!event) {
      return null;
    }

    const registeredCount = event.capacity - event.availableSpots;

    return {
      event,
      occupancyPercentage: event.getOccupancyPercentage(),
      registeredCount,
      availableSpots: event.availableSpots,
    };
  }
}