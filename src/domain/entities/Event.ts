export class Event {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public date: Date,
    public location: string,
    public capacity: number,
    public availableSpots: number,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  // Método para verificar si hay cupos disponibles
  hasAvailableSpots(): boolean {
    return this.availableSpots > 0;
  }

  // Método para reducir cupos disponibles
  reduceSpots(amount: number = 1): void {
    if (this.availableSpots >= amount) {
      this.availableSpots -= amount;
    } else {
      throw new Error('No hay suficientes cupos disponibles');
    }
  }

  // Método para aumentar cupos (cancelación)
  increaseSpots(amount: number = 1): void {
    if (this.availableSpots + amount <= this.capacity) {
      this.availableSpots += amount;
    }
  }

  // Calcular ocupación en porcentaje
  getOccupancyPercentage(): number {
    return ((this.capacity - this.availableSpots) / this.capacity) * 100;
  }
}