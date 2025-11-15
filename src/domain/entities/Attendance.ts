export enum AttendanceStatus {
  REGISTERED = 'registered',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  ATTENDED = 'attended'
}

export class Attendance {
  constructor(
    public id: string,
    public eventId: string,
    public participantId: string,
    public status: AttendanceStatus,
    public registrationDate: Date,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  // Confirmar asistencia
  confirm(): void {
    if (this.status === AttendanceStatus.CANCELLED) {
      throw new Error('No se puede confirmar una asistencia cancelada');
    }
    this.status = AttendanceStatus.CONFIRMED;
  }

  // Cancelar asistencia
  cancel(): void {
    if (this.status === AttendanceStatus.ATTENDED) {
      throw new Error('No se puede cancelar una asistencia ya completada');
    }
    this.status = AttendanceStatus.CANCELLED;
  }

  // Marcar como asistido
  markAsAttended(): void {
    if (this.status === AttendanceStatus.CANCELLED) {
      throw new Error('No se puede marcar como asistido una asistencia cancelada');
    }
    this.status = AttendanceStatus.ATTENDED;
  }

  // Verificar si está activa
  isActive(): boolean {
    return this.status !== AttendanceStatus.CANCELLED;
  }
}