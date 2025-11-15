import { Attendance } from '../entities/Attendance';

export interface IAttendanceRepository {
  // Crear un nuevo registro de asistencia
  create(attendance: Attendance): Promise<Attendance>;
  
  // Obtener asistencia por ID
  findById(id: string): Promise<Attendance | null>;
  
  // Obtener todas las asistencias
  findAll(): Promise<Attendance[]>;
  
  // Obtener asistencias por evento
  findByEventId(eventId: string): Promise<Attendance[]>;
  
  // Obtener asistencias por participante
  findByParticipantId(participantId: string): Promise<Attendance[]>;
  
  // Verificar si ya existe registro
  findByEventAndParticipant(eventId: string, participantId: string): Promise<Attendance | null>;
  
  // Actualizar asistencia
  update(id: string, attendance: Partial<Attendance>): Promise<Attendance | null>;
  
  // Eliminar asistencia
  delete(id: string): Promise<boolean>;
  
  // Contar asistencias activas de un evento
  countActiveAttendances(eventId: string): Promise<number>;
}