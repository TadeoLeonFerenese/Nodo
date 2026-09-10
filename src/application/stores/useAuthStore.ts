import { create } from 'zustand';
import { User, RegisterUserDto } from '../../domain/entities/User';
import { SqliteUserRepository } from '../../infrastructure/repositories/SqliteUserRepository';
import { RegisterUserUseCase } from '../use-cases/auth/RegisterUserUseCase';

const repo = new SqliteUserRepository();
const registerUseCase = new RegisterUserUseCase(repo);

const SESSION_KEY = 'nodo_session_user_id';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkCurrentUser: () => Promise<void>;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
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
      const savedUserId = localStorage.getItem(SESSION_KEY);
      if (savedUserId) {
        const user = await repo.findById(savedUserId);
        if (user) {
          set({ currentUser: user, isAuthenticated: true, isLoading: false });
          return;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      set({ currentUser: null, isAuthenticated: false, isLoading: false });
    } catch (err) {
      set({ currentUser: null, isAuthenticated: false, isLoading: false, error: (err as Error).message });
    }
  },

  login: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await repo.login(usernameOrEmail, password);
      localStorage.setItem(SESSION_KEY, user.id);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  register: async (dto) => {
    set({ isLoading: true, error: null });
    try {
      const user = await registerUseCase.execute(dto);
      localStorage.setItem(SESSION_KEY, user.id);
      set({ currentUser: user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ currentUser: null, isAuthenticated: false });
  },
}));
