// DTO para crear un evento
export interface CreateEventDTO {
  name: string;
  description: string;
  date: string; // ISO string
  location: string;
  capacity: number;
}

// DTO para actualizar un evento
export interface UpdateEventDTO {
  name?: string;
  description?: string;
  date?: string; // ISO string
  location?: string;
  capacity?: number;
}

// DTO de respuesta de evento
export interface EventResponseDTO {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  availableSpots: number;
  createdAt: string;
  updatedAt: string;
}

// Validación de CreateEventDTO
export function validateCreateEventDTO(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('El nombre es requerido y debe ser un texto');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('La descripción es requerida y debe ser un texto');
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push('La fecha es requerida y debe ser un texto en formato ISO');
  } else {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push('La fecha tiene un formato inválido');
    }
  }

  if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
    errors.push('La ubicación es requerida y debe ser un texto');
  }

  if (!data.capacity || typeof data.capacity !== 'number' || data.capacity <= 0) {
    errors.push('La capacidad es requerida y debe ser un número mayor a 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validación de UpdateEventDTO
export function validateUpdateEventDTO(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
    errors.push('El nombre debe ser un texto válido');
  }

  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('La descripción debe ser un texto');
  }

  if (data.date !== undefined) {
    if (typeof data.date !== 'string') {
      errors.push('La fecha debe ser un texto en formato ISO');
    } else {
      const date = new Date(data.date);
      if (isNaN(date.getTime())) {
        errors.push('La fecha tiene un formato inválido');
      }
    }
  }

  if (data.location !== undefined && (typeof data.location !== 'string' || data.location.trim().length === 0)) {
    errors.push('La ubicación debe ser un texto válido');
  }

  if (data.capacity !== undefined && (typeof data.capacity !== 'number' || data.capacity <= 0)) {
    errors.push('La capacidad debe ser un número mayor a 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}