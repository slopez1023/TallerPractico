import { Event } from '../entities/Event';

export interface IEventRepository {
  // Crear un nuevo evento
  create(event: Event): Promise<Event>;
  
  // Obtener evento por ID
  findById(id: string): Promise<Event | null>;
  
  // Obtener todos los eventos
  findAll(): Promise<Event[]>;
  
  // Actualizar un evento
  update(id: string, event: Partial<Event>): Promise<Event | null>;
  
  // Eliminar un evento
  delete(id: string): Promise<boolean>;
  
  // Buscar eventos por fecha
  findByDate(date: Date): Promise<Event[]>;
  
  // Buscar eventos disponibles (con cupos)
  findAvailableEvents(): Promise<Event[]>;
}