import { Request, Response } from 'express';
import { ParticipantService } from '../../domain/services/ParticipantService';
import {
  CreateParticipantDTO,
  UpdateParticipantDTO,
  ParticipantResponseDTO,
  validateCreateParticipantDTO,
  validateUpdateParticipantDTO,
} from '../dtos/ParticipantDTO';

export class ParticipantController {
  constructor(private participantService: ParticipantService) {}

  // Crear un nuevo participante
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateCreateParticipantDTO(req.body);

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
        });
        return;
      }

      const dto: CreateParticipantDTO = req.body;

      const participant = await this.participantService.createParticipant({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      });

      const response: ParticipantResponseDTO = {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString(),
      };

      res.status(201).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? _error.message : 'Error al crear el participante',
      });
    }
  };

  // Obtener todos los participantes
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const participants = await this.participantService.getAllParticipants();

      const response: ParticipantResponseDTO[] = participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener los participantes',
      });
    }
  };

  // Obtener un participante por ID
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const participant = await this.participantService.getParticipantById(id);

      if (!participant) {
        res.status(404).json({
          success: false,
          error: 'Participante no encontrado',
        });
        return;
      }

      const response: ParticipantResponseDTO = {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener el participante',
      });
    }
  };

  // Obtener participante por email
  getByEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      const participant = await this.participantService.getParticipantByEmail(email);

      if (!participant) {
        res.status(404).json({
          success: false,
          error: 'Participante no encontrado',
        });
        return;
      }

      const response: ParticipantResponseDTO = {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener el participante',
      });
    }
  };

  // Actualizar un participante
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validation = validateUpdateParticipantDTO(req.body);

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
        });
        return;
      }

      const dto: UpdateParticipantDTO = req.body;
      const updateData: any = {};

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.email !== undefined) updateData.email = dto.email;
      if (dto.phone !== undefined) updateData.phone = dto.phone;

      const participant = await this.participantService.updateParticipant(id, updateData);

      if (!participant) {
        res.status(404).json({
          success: false,
          error: 'Participante no encontrado',
        });
        return;
      }

      const response: ParticipantResponseDTO = {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        createdAt: participant.createdAt.toISOString(),
        updatedAt: participant.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? _error.message : 'Error al actualizar el participante',
      });
    }
  };

  // Eliminar un participante
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.participantService.deleteParticipant(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Participante no encontrado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Participante eliminado correctamente',
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: 'Error al eliminar el participante',
      });
    }
  };
}
