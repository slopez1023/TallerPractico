import { Event } from '../../../domain/entities/Event';

// Interfaz que representa una fila de la tabla events
export interface EventRow {
  id: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  available_spots: number;
  created_at: Date;
  updated_at: Date;
}

// Clase que convierte entre EventRow (BD) y Event (Dominio)
export class EventModel {
  // Convertir de fila de BD a entidad de dominio
  static toDomain(row: EventRow): Event {
    return new Event(
      row.id,
      row.name,
      row.description,
      row.date,
      row.location,
      row.capacity,
      row.available_spots,
      row.created_at,
      row.updated_at
    );
  }

  // Convertir de entidad de dominio a objeto para insertar en BD
  static toPersistence(event: Event): Omit<EventRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      capacity: event.capacity,
      available_spots: event.availableSpots,
    };
  }

  // Convertir datos parciales para actualización
  static toUpdate(event: Partial<Event>): Partial<EventRow> {
    const update: Partial<EventRow> = {};

    if (event.name !== undefined) update.name = event.name;
    if (event.description !== undefined) update.description = event.description;
    if (event.date !== undefined) update.date = event.date;
    if (event.location !== undefined) update.location = event.location;
    if (event.capacity !== undefined) update.capacity = event.capacity;
    if (event.availableSpots !== undefined) update.available_spots = event.availableSpots;

    return update;
  }
}