// DTO para crear un participante
export interface CreateParticipantDTO {
  name: string;
  email: string;
  phone: string;
}

// DTO para actualizar un participante
export interface UpdateParticipantDTO {
  name?: string;
  email?: string;
  phone?: string;
}

// DTO de respuesta de participante
export interface ParticipantResponseDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

// Validación de CreateParticipantDTO
export function validateCreateParticipantDTO(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('El nombre es requerido y debe ser un texto');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('El email es requerido');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('El formato del email es inválido');
    }
  }

  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('El teléfono es requerido');
  } else {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push('El formato del teléfono es inválido');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validación de UpdateParticipantDTO
export function validateUpdateParticipantDTO(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
    errors.push('El nombre debe ser un texto válido');
  }

  if (data.email !== undefined) {
    if (typeof data.email !== 'string') {
      errors.push('El email debe ser un texto');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('El formato del email es inválido');
      }
    }
  }

  if (data.phone !== undefined) {
    if (typeof data.phone !== 'string') {
      errors.push('El teléfono debe ser un texto');
    } else {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push('El formato del teléfono es inválido');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}