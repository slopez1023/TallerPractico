export class Participant {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public phone: string,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  // Validar formato de email
  isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  // Validar formato de teléfono (básico)
  isPhoneValid(): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(this.phone);
  }
}