import { create } from 'zustand';
import { StockMovement, CreateStockMovementInput } from '../../domain/entities/StockMovement';
import { Product } from '../../domain/entities/Product';
import { SqliteStockRepository } from '../../infrastructure/repositories/SqliteStockRepository';
import { RecordStockMovementUseCase, GetLowStockAlertsUseCase } from '../use-cases/stock/StockUseCases';
import { useSyncStore } from './useSyncStore';

const repo = new SqliteStockRepository();
const recordUseCase = new RecordStockMovementUseCase(repo);
const alertsUseCase = new GetLowStockAlertsUseCase(repo);

interface StockState {
  movements: StockMovement[];
  lowStockProducts: Product[];
  isLoading: boolean;
  error: string | null;
  loadMovements: () => Promise<void>;
  loadLowStockAlerts: () => Promise<void>;
  recordMovement: (input: CreateStockMovementInput) => Promise<StockMovement>;
}

export const useStockStore = create<StockState>((set, get) => ({
  movements: [],
  lowStockProducts: [],
  isLoading: false,
  error: null,

  loadMovements: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await repo.getAllMovements();
      set({ movements: list, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadLowStockAlerts: async () => {
    try {
      const alerts = await alertsUseCase.execute();
      set({ lowStockProducts: alerts });
    } catch (err) {
      console.error('Error loading low stock alerts:', err);
    }
  },

  recordMovement: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const movement = await recordUseCase.execute(input);
      await get().loadMovements();
      await get().loadLowStockAlerts();
      set({ isLoading: false });
      useSyncStore.getState().syncNow().catch(() => {});
      return movement;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },
}));
