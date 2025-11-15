import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';

export function createAttendanceRoutes(attendanceController: AttendanceController): Router {
  const router = Router();

  /**
   * @route   POST /api/v1/attendances
   * @desc    Registrar asistencia a un evento
   * @access  Public
   */
  router.post('/', attendanceController.register);

  /**
   * @route   PUT /api/v1/attendances/:id/cancel
   * @desc    Cancelar asistencia
   * @access  Public
   */
  router.put('/:id/cancel', attendanceController.cancel);

  /**
   * @route   PUT /api/v1/attendances/:id/confirm
   * @desc    Confirmar asistencia
   * @access  Public
   */
  router.put('/:id/confirm', attendanceController.confirm);

  /**
   * @route   PUT /api/v1/attendances/:id/attended
   * @desc    Marcar como asistido
   * @access  Public
   */
  router.put('/:id/attended', attendanceController.markAttended);

  /**
   * @route   GET /api/v1/attendances/event/:eventId
   * @desc    Obtener asistencias de un evento
   * @access  Public
   */
  router.get('/event/:eventId', attendanceController.getByEvent);

  /**
   * @route   GET /api/v1/attendances/participant/:participantId
   * @desc    Obtener asistencias de un participante
   * @access  Public
   */
  router.get('/participant/:participantId', attendanceController.getByParticipant);

  /**
   * @route   GET /api/v1/attendances/event/:eventId/statistics
   * @desc    Obtener estadísticas de asistencias de un evento
   * @access  Public
   */
  router.get('/event/:eventId/statistics', attendanceController.getEventStatistics);

  return router;
}