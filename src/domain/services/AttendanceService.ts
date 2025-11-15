import { IAttendanceRepository } from '../interfaces/IAttendanceRepository';
import { IEventRepository } from '../interfaces/IEventRepository';
import { IParticipantRepository } from '../interfaces/IParticipantRepository';
import { ICacheService } from '../../infrastructure/config/cache';
import { Attendance, AttendanceStatus } from '../entities/Attendance';
import { Pool } from 'pg';

export class AttendanceService {
  constructor(
    private attendanceRepository: IAttendanceRepository,
    private eventRepository: IEventRepository,
    private participantRepository: IParticipantRepository,
    private cacheService: ICacheService,
    private pool: Pool
  ) {}

  async registerAttendance(eventId: string, participantId: string): Promise<Attendance> {
    // Iniciar transacción para garantizar consistencia
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verificar que el evento existe y usar FOR UPDATE para bloquear la fila
      const eventQuery = 'SELECT * FROM events WHERE id = $1 FOR UPDATE';
      const eventResult = await client.query(eventQuery, [eventId]);

      if (eventResult.rows.length === 0) {
        throw new Error('El evento no existe');
      }

      const event = eventResult.rows[0];

      // Verificar que el participante existe
      const participant = await this.participantRepository.findById(participantId);
      if (!participant) {
        throw new Error('El participante no existe');
      }

      // Verificar que hay cupos disponibles
      if (event.available_spots <= 0) {
        throw new Error('No hay cupos disponibles para este evento');
      }

      // Verificar que no exista un registro previo
      const existingAttendance = await this.attendanceRepository.findByEventAndParticipant(
        eventId,
        participantId
      );

      if (existingAttendance && existingAttendance.status !== AttendanceStatus.CANCELLED) {
        throw new Error('El participante ya está registrado en este evento');
      }

      // Si existe pero está cancelado, podemos reutilizarlo
      let attendance: Attendance;

      if (existingAttendance && existingAttendance.status === AttendanceStatus.CANCELLED) {
        // Reactivar el registro
        existingAttendance.status = AttendanceStatus.REGISTERED;
        existingAttendance.registrationDate = new Date();
        attendance = (await this.attendanceRepository.update(
          existingAttendance.id,
          existingAttendance
        ))!;
      } else {
        // Crear nuevo registro de asistencia
        attendance = new Attendance(
          '',
          eventId,
          participantId,
          AttendanceStatus.REGISTERED,
          new Date(),
          new Date(),
          new Date()
        );

        attendance = await this.attendanceRepository.create(attendance);
      }

      // Reducir los cupos disponibles del evento
      const updateQuery = `
        UPDATE events 
        SET available_spots = available_spots - 1 
        WHERE id = $1
      `;
      await client.query(updateQuery, [eventId]);

      // Confirmar transacción
      await client.query('COMMIT');

      // Invalidar cachés relevantes
      await this.cacheService.delete(`event:${eventId}`);
      await this.cacheService.delete('events:available');
      await this.cacheService.delete('events:all');
      await this.cacheService.delete(`attendances:event:${eventId}`);

      return attendance;
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelAttendance(attendanceId: string): Promise<Attendance> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Obtener la asistencia
      const attendance = await this.attendanceRepository.findById(attendanceId);

      if (!attendance) {
        throw new Error('Registro de asistencia no encontrado');
      }

      if (attendance.status === AttendanceStatus.CANCELLED) {
        throw new Error('La asistencia ya está cancelada');
      }

      // Cancelar la asistencia
      attendance.cancel();
      const updatedAttendance = (await this.attendanceRepository.update(attendanceId, attendance))!;

      // Incrementar los cupos disponibles del evento
      const updateQuery = `
        UPDATE events 
        SET available_spots = available_spots + 1 
        WHERE id = $1
      `;
      await client.query(updateQuery, [attendance.eventId]);

      await client.query('COMMIT');

      // Invalidar cachés
      await this.cacheService.delete(`event:${attendance.eventId}`);
      await this.cacheService.delete('events:available');
      await this.cacheService.delete('events:all');
      await this.cacheService.delete(`attendances:event:${attendance.eventId}`);

      return updatedAttendance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmAttendance(attendanceId: string): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findById(attendanceId);

    if (!attendance) {
      throw new Error('Registro de asistencia no encontrado');
    }

    attendance.confirm();
    const updated = await this.attendanceRepository.update(attendanceId, attendance);

    // Invalidar caché
    await this.cacheService.delete(`attendances:event:${attendance.eventId}`);

    return updated!;
  }

  async markAsAttended(attendanceId: string): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findById(attendanceId);

    if (!attendance) {
      throw new Error('Registro de asistencia no encontrado');
    }

    attendance.markAsAttended();
    const updated = await this.attendanceRepository.update(attendanceId, attendance);

    // Invalidar caché
    await this.cacheService.delete(`attendances:event:${attendance.eventId}`);

    return updated!;
  }

  async getAttendancesByEvent(eventId: string): Promise<Attendance[]> {
    // Intentar obtener del caché
    const cacheKey = `attendances:event:${eventId}`;
    const cached = await this.cacheService.get<Attendance[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Si no está en caché, buscar en BD
    const attendances = await this.attendanceRepository.findByEventId(eventId);

    // Guardar en caché por 2 minutos
    await this.cacheService.set(cacheKey, attendances, 120);

    return attendances;
  }

  async getAttendancesByParticipant(participantId: string): Promise<Attendance[]> {
    return await this.attendanceRepository.findByParticipantId(participantId);
  }

  async getEventStatistics(eventId: string): Promise<{
    totalRegistered: number;
    confirmed: number;
    cancelled: number;
    attended: number;
    active: number;
  }> {
    const attendances = await this.getAttendancesByEvent(eventId);

    return {
      totalRegistered: attendances.length,
      confirmed: attendances.filter((a) => a.status === AttendanceStatus.CONFIRMED).length,
      cancelled: attendances.filter((a) => a.status === AttendanceStatus.CANCELLED).length,
      attended: attendances.filter((a) => a.status === AttendanceStatus.ATTENDED).length,
      active: attendances.filter((a) => a.isActive()).length,
    };
  }
}