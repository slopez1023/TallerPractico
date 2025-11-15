import { IParticipantRepository } from '../interfaces/IParticipantRepository';
import { ICacheService } from '../../infrastructure/config/cache';
import { Participant } from '../entities/Participant';

export class ParticipantService {
  constructor(
    private participantRepository: IParticipantRepository,
    private cacheService: ICacheService
  ) {}

  async createParticipant(participantData: {
    name: string;
    email: string;
    phone: string;
  }): Promise<Participant> {
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(participantData.email)) {
      throw new Error('Formato de email inválido');
    }

    // Verificar que el email no esté registrado
    const existingParticipant = await this.participantRepository.findByEmail(participantData.email);
    if (existingParticipant) {
      throw new Error('Ya existe un participante con este email');
    }

    // Validar formato de teléfono básico
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(participantData.phone)) {
      throw new Error('Formato de teléfono inválido');
    }

    const participant = new Participant(
      '', // El ID se genera en la BD
      participantData.name,
      participantData.email,
      participantData.phone,
      new Date(),
      new Date()
    );

    const createdParticipant = await this.participantRepository.create(participant);

    // Invalidar caché de lista de participantes
    await this.cacheService.delete('participants:all');

    return createdParticipant;
  }

  async getParticipantById(id: string): Promise<Participant | null> {
    // Intentar obtener del caché
    const cacheKey = `participant:${id}`;
    const cached = await this.cacheService.get<Participant>(cacheKey);

    if (cached) {
      return cached;
    }

    // Si no está en caché, buscar en BD
    const participant = await this.participantRepository.findById(id);

    if (participant) {
      // Guardar en caché por 5 minutos
      await this.cacheService.set(cacheKey, participant, 300);
    }

    return participant;
  }

  async getParticipantByEmail(email: string): Promise<Participant | null> {
    return await this.participantRepository.findByEmail(email);
  }

  async getAllParticipants(): Promise<Participant[]> {
    // Intentar obtener del caché
    const cacheKey = 'participants:all';
    const cached = await this.cacheService.get<Participant[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Si no está en caché, buscar en BD
    const participants = await this.participantRepository.findAll();

    // Guardar en caché por 3 minutos
    await this.cacheService.set(cacheKey, participants, 180);

    return participants;
  }

  async updateParticipant(id: string, participantData: Partial<Participant>): Promise<Participant | null> {
    const existingParticipant = await this.participantRepository.findById(id);

    if (!existingParticipant) {
      throw new Error('Participante no encontrado');
    }

    // Si se está actualizando el email, verificar que no exista
    if (participantData.email && participantData.email !== existingParticipant.email) {
      const emailExists = await this.participantRepository.findByEmail(participantData.email);
      if (emailExists) {
        throw new Error('Ya existe un participante con este email');
      }

      // Validar formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(participantData.email)) {
        throw new Error('Formato de email inválido');
      }
    }

    // Validar teléfono si se está actualizando
    if (participantData.phone) {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(participantData.phone)) {
        throw new Error('Formato de teléfono inválido');
      }
    }

    const updatedParticipant = await this.participantRepository.update(id, participantData);

    // Invalidar cachés
    await this.cacheService.delete(`participant:${id}`);
    await this.cacheService.delete('participants:all');

    return updatedParticipant;
  }

  async deleteParticipant(id: string): Promise<boolean> {
    const deleted = await this.participantRepository.delete(id);

    if (deleted) {
      // Invalidar cachés
      await this.cacheService.delete(`participant:${id}`);
      await this.cacheService.delete('participants:all');
    }

    return deleted;
  }
}