import { Router } from 'express';
import { EventController } from '../controllers/EventController';

export function createEventRoutes(eventController: EventController): Router {
  const router = Router();

  /**
   * @route   POST /api/v1/events
   * @desc    Crear un nuevo evento
   * @access  Public
   */
  router.post('/', eventController.create);

  /**
   * @route   GET /api/v1/events
   * @desc    Obtener todos los eventos
   * @access  Public
   */
  router.get('/', eventController.getAll);

  /**
   * @route   GET /api/v1/events/available
   * @desc    Obtener eventos disponibles (con cupos)
   * @access  Public
   */
  router.get('/available', eventController.getAvailable);

  /**
   * @route   GET /api/v1/events/:id
   * @desc    Obtener un evento por ID
   * @access  Public
   */
  router.get('/:id', eventController.getById);

  /**
   * @route   GET /api/v1/events/:id/statistics
   * @desc    Obtener estadísticas de un evento
   * @access  Public
   */
  router.get('/:id/statistics', eventController.getStatistics);

  /**
   * @route   PUT /api/v1/events/:id
   * @desc    Actualizar un evento
   * @access  Public
   */
  router.put('/:id', eventController.update);

  /**
   * @route   DELETE /api/v1/events/:id
   * @desc    Eliminar un evento
   * @access  Public
   */
  router.delete('/:id', eventController.delete);

  return router;
}