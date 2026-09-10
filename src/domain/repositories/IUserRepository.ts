import { User, RegisterUserDto } from '../entities/User';

export interface IUserRepository {
  register(dto: RegisterUserDto): Promise<User>;
  login(usernameOrEmail: string, password: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  getCurrentUser(): Promise<User | null>;
}
