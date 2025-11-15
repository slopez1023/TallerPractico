import { Router } from 'express';
import { ParticipantController } from '../controllers/ParticipantController';

export function createParticipantRoutes(participantController: ParticipantController): Router {
  const router = Router();

  /**
   * @route   POST /api/v1/participants
   * @desc    Crear un nuevo participante
   * @access  Public
   */
  router.post('/', participantController.create);

  /**
   * @route   GET /api/v1/participants
   * @desc    Obtener todos los participantes
   * @access  Public
   */
  router.get('/', participantController.getAll);

  /**
   * @route   GET /api/v1/participants/:id
   * @desc    Obtener un participante por ID
   * @access  Public
   */
  router.get('/:id', participantController.getById);

  /**
   * @route   GET /api/v1/participants/email/:email
   * @desc    Obtener un participante por email
   * @access  Public
   */
  router.get('/email/:email', participantController.getByEmail);

  /**
   * @route   PUT /api/v1/participants/:id
   * @desc    Actualizar un participante
   * @access  Public
   */
  router.put('/:id', participantController.update);

  /**
   * @route   DELETE /api/v1/participants/:id
   * @desc    Eliminar un participante
   * @access  Public
   */
  router.delete('/:id', participantController.delete);

  return router;
}