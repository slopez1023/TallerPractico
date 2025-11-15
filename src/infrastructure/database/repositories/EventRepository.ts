import { Pool } from 'pg';
import { IEventRepository } from '../../../domain/interfaces/IEventRepository';
import { Event } from '../../../domain/entities/Event';
import { EventModel, EventRow } from '../models/EventModel';

export class EventRepository implements IEventRepository {
  constructor(private pool: Pool) {}

  async create(event: Event): Promise<Event> {
    const data = EventModel.toPersistence(event);
    
    const query = `
      INSERT INTO events (name, description, date, location, capacity, available_spots)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      data.name,
      data.description,
      data.date,
      data.location,
      data.capacity,
      data.available_spots,
    ];
    
    const result = await this.pool.query<EventRow>(query, values);
    return EventModel.toDomain(result.rows[0]);
  }

  async findById(id: string): Promise<Event | null> {
    const query = 'SELECT * FROM events WHERE id = $1';
    const result = await this.pool.query<EventRow>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return EventModel.toDomain(result.rows[0]);
  }

  async findAll(): Promise<Event[]> {
    const query = 'SELECT * FROM events ORDER BY date DESC';
    const result = await this.pool.query<EventRow>(query);
    
    return result.rows.map(row => EventModel.toDomain(row));
  }

  async update(id: string, event: Partial<Event>): Promise<Event | null> {
    const data = EventModel.toUpdate(event);
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return this.findById(id);
    }
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `
      UPDATE events 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(data)];
    const result = await this.pool.query<EventRow>(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return EventModel.toDomain(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM events WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }

  async findByDate(date: Date): Promise<Event[]> {
    const query = `
      SELECT * FROM events 
      WHERE DATE(date) = DATE($1)
      ORDER BY date ASC
    `;
    const result = await this.pool.query<EventRow>(query, [date]);
    
    return result.rows.map(row => EventModel.toDomain(row));
  }

  async findAvailableEvents(): Promise<Event[]> {
    const query = `
      SELECT * FROM events 
      WHERE available_spots > 0 AND date > NOW()
      ORDER BY date ASC
    `;
    const result = await this.pool.query<EventRow>(query);
    
    return result.rows.map(row => EventModel.toDomain(row));
  }
}