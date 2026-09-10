import { User, RegisterUserDto } from '../entities/User';

export interface IUserRepository {
  register(dto: RegisterUserDto): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  getCurrentUser(): Promise<User | null>;
}
