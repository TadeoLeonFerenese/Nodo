import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User, RegisterUserDto } from '../../../domain/entities/User';

export class RegisterUserUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    // Restricción Estricta de UI/UX: Exactamente 4 campos
    const keys = Object.keys(dto);
    const requiredKeys = ['username', 'email', 'password', 'passwordConfirmation'];

    for (const key of requiredKeys) {
      if (!dto[key as keyof RegisterUserDto] || dto[key as keyof RegisterUserDto].trim() === '') {
        throw new Error(`The field '${key}' is strictly required.`);
      }
    }

    if (dto.password !== dto.passwordConfirmation) {
      throw new Error('Password confirmation does not match password.');
    }

    return await this.userRepo.register(dto);
  }
}
