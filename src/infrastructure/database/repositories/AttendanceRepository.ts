import { Pool } from 'pg';
import { IAttendanceRepository } from '../../../domain/interfaces/IAttendanceRepository';
import { Attendance, AttendanceStatus } from '../../../domain/entities/Attendance';
import { AttendanceModel, AttendanceRow } from '../models/AttendanceModel';

export class AttendanceRepository implements IAttendanceRepository {
  constructor(private pool: Pool) {}

  async create(attendance: Attendance): Promise<Attendance> {
    const data = AttendanceModel.toPersistence(attendance);
    
    const query = `
      INSERT INTO attendances (event_id, participant_id, status, registration_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      data.event_id,
      data.participant_id,
      data.status,
      data.registration_date,
    ];
    
    const result = await this.pool.query<AttendanceRow>(query, values);
    return AttendanceModel.toDomain(result.rows[0]);
  }

  async findById(id: string): Promise<Attendance | null> {
    const query = 'SELECT * FROM attendances WHERE id = $1';
    const result = await this.pool.query<AttendanceRow>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return AttendanceModel.toDomain(result.rows[0]);
  }

  async findAll(): Promise<Attendance[]> {
    const query = 'SELECT * FROM attendances ORDER BY created_at DESC';
    const result = await this.pool.query<AttendanceRow>(query);
    
    return result.rows.map(row => AttendanceModel.toDomain(row));
  }

  async findByEventId(eventId: string): Promise<Attendance[]> {
    const query = 'SELECT * FROM attendances WHERE event_id = $1 ORDER BY registration_date ASC';
    const result = await this.pool.query<AttendanceRow>(query, [eventId]);
    
    return result.rows.map(row => AttendanceModel.toDomain(row));
  }

  async findByParticipantId(participantId: string): Promise<Attendance[]> {
    const query = 'SELECT * FROM attendances WHERE participant_id = $1 ORDER BY registration_date DESC';
    const result = await this.pool.query<AttendanceRow>(query, [participantId]);
    
    return result.rows.map(row => AttendanceModel.toDomain(row));
  }

  async findByEventAndParticipant(eventId: string, participantId: string): Promise<Attendance | null> {
    const query = 'SELECT * FROM attendances WHERE event_id = $1 AND participant_id = $2';
    const result = await this.pool.query<AttendanceRow>(query, [eventId, participantId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return AttendanceModel.toDomain(result.rows[0]);
  }

  async update(id: string, attendance: Partial<Attendance>): Promise<Attendance | null> {
    const data = AttendanceModel.toUpdate(attendance);
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return this.findById(id);
    }
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `
      UPDATE attendances 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(data)];
    const result = await this.pool.query<AttendanceRow>(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return AttendanceModel.toDomain(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM attendances WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }

  async countActiveAttendances(eventId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM attendances 
      WHERE event_id = $1 AND status != $2
    `;
    const result = await this.pool.query(query, [eventId, AttendanceStatus.CANCELLED]);
    
    return parseInt(result.rows[0].count, 10);
  }
}