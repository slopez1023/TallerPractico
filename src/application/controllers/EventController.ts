import { Request, Response } from 'express';
import { EventService } from '../../domain/services/EventService';
import {
  CreateEventDTO,
  UpdateEventDTO,
  EventResponseDTO,
  validateCreateEventDTO,
  validateUpdateEventDTO,
} from '../dtos/EventDTO';

export class EventController {
  constructor(private eventService: EventService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateCreateEventDTO(req.body);
      if (!validation.valid) {
        res.status(400).json({ success: false, errors: validation.errors });
        return;
      }
      const dto: CreateEventDTO = req.body;
      const event = await this.eventService.createEvent({
        name: dto.name,
        description: dto.description,
        date: new Date(dto.date),
        location: dto.location,
        capacity: dto.capacity,
      });
      const response: EventResponseDTO = {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        capacity: event.capacity,
        availableSpots: event.availableSpots,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      };
      res.status(201).json({ success: true, data: response });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: _error instanceof Error ? (_error instanceof Error ? _error.message : 'Error') : 'Error al crear el evento',
      });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const events = await this.eventService.getAllEvents();
      const response: EventResponseDTO[] = events.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        capacity: event.capacity,
        availableSpots: event.availableSpots,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      }));
      res.status(200).json({ success: true, data: response });
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Error al obtener los eventos' });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const event = await this.eventService.getEventById(id);
      if (!event) {
        res.status(404).json({ success: false, error: 'Evento no encontrado' });
        return;
      }
      const response: EventResponseDTO = {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        capacity: event.capacity,
        availableSpots: event.availableSpots,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      };
      res.status(200).json({ success: true, data: response });
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Error al obtener el evento' });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validation = validateUpdateEventDTO(req.body);
      if (!validation.valid) {
        res.status(400).json({ success: false, errors: validation.errors });
        return;
      }
      const dto: UpdateEventDTO = req.body;
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.date !== undefined) updateData.date = new Date(dto.date);
      if (dto.location !== undefined) updateData.location = dto.location;
      if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
      const event = await this.eventService.updateEvent(id, updateData);
      if (!event) {
        res.status(404).json({ success: false, error: 'Evento no encontrado' });
        return;
      }
      const response: EventResponseDTO = {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        capacity: event.capacity,
        availableSpots: event.availableSpots,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      };
      res.status(200).json({ success: true, data: response });
    } catch (_error) {
      res.status(400).json({
        success: false,
        error: (_error instanceof Error ? _error.message : 'Error'),
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.eventService.deleteEvent(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Evento no encontrado' });
        return;
      }
      res.status(200).json({ success: true, message: 'Evento eliminado correctamente' });
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Error al eliminar el evento' });
    }
  };

  getAvailable = async (req: Request, res: Response): Promise<void> => {
    try {
      const events = await this.eventService.getAvailableEvents();
      const response: EventResponseDTO[] = events.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        location: event.location,
        capacity: event.capacity,
        availableSpots: event.availableSpots,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      }));
      res.status(200).json({ success: true, data: response });
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Error al obtener eventos disponibles' });
    }
  };

  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statistics = await this.eventService.getEventStatistics(id);
      if (!statistics) {
        res.status(404).json({ success: false, error: 'Evento no encontrado' });
        return;
      }
      res.status(200).json({ success: true, data: statistics });
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Error al obtener estadísticas del evento' });
    }
  };
}
