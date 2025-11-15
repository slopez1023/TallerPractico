import { Participant } from '../../../domain/entities/Participant';

// Interfaz que representa una fila de la tabla participants
export interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

// Clase que convierte entre ParticipantRow (BD) y Participant (Dominio)
export class ParticipantModel {
  // Convertir de fila de BD a entidad de dominio
  static toDomain(row: ParticipantRow): Participant {
    return new Participant(
      row.id,
      row.name,
      row.email,
      row.phone,
      row.created_at,
      row.updated_at
    );
  }

  // Convertir de entidad de dominio a objeto para insertar en BD
  static toPersistence(participant: Participant): Omit<ParticipantRow, 'id' | 'created_at' | 'updated_at'> {
    return {
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
    };
  }

  // Convertir datos parciales para actualización
  static toUpdate(participant: Partial<Participant>): Partial<ParticipantRow> {
    const update: Partial<ParticipantRow> = {};

    if (participant.name !== undefined) update.name = participant.name;
    if (participant.email !== undefined) update.email = participant.email;
    if (participant.phone !== undefined) update.phone = participant.phone;

    return update;
  }
}