import { Pool } from 'pg';
import { IParticipantRepository } from '../../../domain/interfaces/IParticipantRepository';
import { Participant } from '../../../domain/entities/Participant';
import { ParticipantModel, ParticipantRow } from '../models/ParticipantModel';

export class ParticipantRepository implements IParticipantRepository {
  constructor(private pool: Pool) {}

  async create(participant: Participant): Promise<Participant> {
    const data = ParticipantModel.toPersistence(participant);
    
    const query = `
      INSERT INTO participants (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [data.name, data.email, data.phone];
    
    const result = await this.pool.query<ParticipantRow>(query, values);
    return ParticipantModel.toDomain(result.rows[0]);
  }

  async findById(id: string): Promise<Participant | null> {
    const query = 'SELECT * FROM participants WHERE id = $1';
    const result = await this.pool.query<ParticipantRow>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return ParticipantModel.toDomain(result.rows[0]);
  }

  async findAll(): Promise<Participant[]> {
    const query = 'SELECT * FROM participants ORDER BY created_at DESC';
    const result = await this.pool.query<ParticipantRow>(query);
    
    return result.rows.map(row => ParticipantModel.toDomain(row));
  }

  async findByEmail(email: string): Promise<Participant | null> {
    const query = 'SELECT * FROM participants WHERE email = $1';
    const result = await this.pool.query<ParticipantRow>(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return ParticipantModel.toDomain(result.rows[0]);
  }

  async update(id: string, participant: Partial<Participant>): Promise<Participant | null> {
    const data = ParticipantModel.toUpdate(participant);
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return this.findById(id);
    }
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `
      UPDATE participants 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(data)];
    const result = await this.pool.query<ParticipantRow>(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return ParticipantModel.toDomain(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM participants WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }
}