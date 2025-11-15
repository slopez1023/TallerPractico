import { Participant } from '../entities/Participant';

export interface IParticipantRepository {
  // Crear un nuevo participante
  create(participant: Participant): Promise<Participant>;
  
  // Obtener participante por ID
  findById(id: string): Promise<Participant | null>;
  
  // Obtener todos los participantes
  findAll(): Promise<Participant[]>;
  
  // Buscar por email
  findByEmail(email: string): Promise<Participant | null>;
  
  // Actualizar un participante
  update(id: string, participant: Partial<Participant>): Promise<Participant | null>;
  
  // Eliminar un participante
  delete(id: string): Promise<boolean>;
}