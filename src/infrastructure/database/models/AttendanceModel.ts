import { Attendance, AttendanceStatus } from '../../../domain/entities/Attendance';

// Interfaz que representa una fila de la tabla attendances
export interface AttendanceRow {
  id: string;
  event_id: string;
  participant_id: string;
  status: string;
  registration_date: Date;
  created_at: Date;
  updated_at: Date;
}

// Clase que convierte entre AttendanceRow (BD) y Attendance (Dominio)
export class AttendanceModel {
  // Convertir de fila de BD a entidad de dominio
  static toDomain(row: AttendanceRow): Attendance {
    return new Attendance(
      row.id,
      row.event_id,
      row.participant_id,
      row.status as AttendanceStatus,
      row.registration_date,
      row.created_at,
      row.updated_at
    );
  }

  // Convertir de entidad de dominio a objeto para insertar en BD
  static toPersistence(attendance: Attendance): Omit<AttendanceRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      event_id: attendance.eventId,
      participant_id: attendance.participantId,
      status: attendance.status,
      registration_date: attendance.registrationDate,
    };
  }

  // Convertir datos parciales para actualización
  static toUpdate(attendance: Partial<Attendance>): Partial<AttendanceRow> {
    const update: Partial<AttendanceRow> = {};

    if (attendance.status !== undefined) update.status = attendance.status;
    if (attendance.registrationDate !== undefined) update.registration_date = attendance.registrationDate;

    return update;
  }
}