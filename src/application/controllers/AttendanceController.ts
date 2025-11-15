import { Request, Response } from 'express';
import { AttendanceService } from '../../domain/services/AttendanceService';
import {
  RegisterAttendanceDTO,
  AttendanceResponseDTO,
  validateRegisterAttendanceDTO,
} from '../dtos/AttendanceDTO';

export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  // Registrar asistencia a un evento
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateRegisterAttendanceDTO(req.body);

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
        });
        return;
      }

      const dto: RegisterAttendanceDTO = req.body;

      const attendance = await this.attendanceService.registerAttendance(
        dto.eventId,
        dto.participantId
      );

      const response: AttendanceResponseDTO = {
        id: attendance.id,
        eventId: attendance.eventId,
        participantId: attendance.participantId,
        status: attendance.status,
        registrationDate: attendance.registrationDate.toISOString(),
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString(),
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'Asistencia registrada correctamente',
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? _error.message : 'Error al registrar la asistencia',
      });
    }
  };

  // Cancelar asistencia
  cancel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const attendance = await this.attendanceService.cancelAttendance(id);

      const response: AttendanceResponseDTO = {
        id: attendance.id,
        eventId: attendance.eventId,
        participantId: attendance.participantId,
        status: attendance.status,
        registrationDate: attendance.registrationDate.toISOString(),
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
        message: 'Asistencia cancelada correctamente',
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? _error.message : 'Error al cancelar la asistencia',
      });
    }
  };

  // Confirmar asistencia
  confirm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const attendance = await this.attendanceService.confirmAttendance(id);

      const response: AttendanceResponseDTO = {
        id: attendance.id,
        eventId: attendance.eventId,
        participantId: attendance.participantId,
        status: attendance.status,
        registrationDate: attendance.registrationDate.toISOString(),
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
        message: 'Asistencia confirmada correctamente',
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? _error.message : 'Error al confirmar la asistencia',
      });
    }
  };

  // Marcar como asistido
  markAttended = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const attendance = await this.attendanceService.markAsAttended(id);

      const response: AttendanceResponseDTO = {
        id: attendance.id,
        eventId: attendance.eventId,
        participantId: attendance.participantId,
        status: attendance.status,
        registrationDate: attendance.registrationDate.toISOString(),
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
        message: 'Participante marcado como asistido',
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? _error.message : 'Error al marcar como asistido',
      });
    }
  };

  // Obtener asistencias de un evento
  getByEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      const attendances = await this.attendanceService.getAttendancesByEvent(eventId);

      const response: AttendanceResponseDTO[] = attendances.map((attendance) => ({
        id: attendance.id,
        eventId: attendance.eventId,
        participantId: attendance.participantId,
        status: attendance.status,
        registrationDate: attendance.registrationDate.toISOString(),
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener las asistencias del evento',
      });
    }
  };

  // Obtener asistencias de un participante
  getByParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { participantId } = req.params;

      const attendances = await this.attendanceService.getAttendancesByParticipant(participantId);

      const response: AttendanceResponseDTO[] = attendances.map((attendance) => ({
        id: attendance.id,
        eventId: attendance.eventId,
        participantId: attendance.participantId,
        status: attendance.status,
        registrationDate: attendance.registrationDate.toISOString(),
        createdAt: attendance.createdAt.toISOString(),
        updatedAt: attendance.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener las asistencias del participante',
      });
    }
  };

  // Obtener estadísticas de un evento
  getEventStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      const statistics = await this.attendanceService.getEventStatistics(eventId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener las estadísticas del evento',
      });
    }
  };
}
