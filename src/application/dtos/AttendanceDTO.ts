// DTO para registrar asistencia
export interface RegisterAttendanceDTO {
  eventId: string;
  participantId: string;
}

// DTO de respuesta de asistencia
export interface AttendanceResponseDTO {
  id: string;
  eventId: string;
  participantId: string;
  status: string;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
}

// Validación de RegisterAttendanceDTO
export function validateRegisterAttendanceDTO(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.eventId || typeof data.eventId !== 'string' || data.eventId.trim().length === 0) {
    errors.push('El ID del evento es requerido');
  }

  if (!data.participantId || typeof data.participantId !== 'string' || data.participantId.trim().length === 0) {
    errors.push('El ID del participante es requerido');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}