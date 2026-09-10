import { create } from 'zustand';
import { User, RegisterUserDto } from '../../domain/entities/User';
import { SqliteUserRepository } from '../../infrastructure/repositories/SqliteUserRepository';
import { RegisterUserUseCase } from '../use-cases/auth/RegisterUserUseCase';

const repo = new SqliteUserRepository();
const registerUseCase = new RegisterUserUseCase(repo);

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkCurrentUser: () => Promise<void>;
  register: (dto: RegisterUserDto) => Promise<User>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await repo.getCurrentUser();
      set({ currentUser: user, isAuthenticated: !!user, isLoading: false });
    } catch (err) {
      set({ currentUser: null, isAuthenticated: false, isLoading: false, error: (err as Error).message });
    }
  },

  register: async (dto) => {
    set({ isLoading: true, error: null });
    try {
      const user = await registerUseCase.execute(dto);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },
}));
