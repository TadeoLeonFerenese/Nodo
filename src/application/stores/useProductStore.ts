import { create } from 'zustand';
import { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/Product';
import { SqliteProductRepository } from '../../infrastructure/repositories/SqliteProductRepository';
import { CreateProductUseCase } from '../use-cases/products/CreateProductUseCase';
import { UpdateProductUseCase, ListProductsUseCase, DeleteProductUseCase } from '../use-cases/products/ProductUseCases';
import { useSyncStore } from './useSyncStore';
import { useStockStore } from './useStockStore';

const repo = new SqliteProductRepository();
const createUseCase = new CreateProductUseCase(repo);
const updateUseCase = new UpdateProductUseCase(repo);
const listUseCase = new ListProductsUseCase(repo);
const deleteUseCase = new DeleteProductUseCase(repo);

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  createProduct: (input: CreateProductInput) => Promise<Product>;
  updateProduct: (id: string, input: UpdateProductInput) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  loadProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await listUseCase.execute();
      set({ products: list, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createProduct: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const newProduct = await createUseCase.execute(input);
      await get().loadProducts();
      // Recargar movimientos e historial de stock para actualizar la UI en tiempo real
      useStockStore.getState().loadMovements().catch(() => {});
      useStockStore.getState().loadLowStockAlerts().catch(() => {});
      set({ isLoading: false });
      useSyncStore.getState().syncNow().catch(() => {});
      return newProduct;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateProduct: async (id, input) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateUseCase.execute(id, input);
      await get().loadProducts();
      set({ isLoading: false });
      useSyncStore.getState().syncNow().catch(() => {});
      return updated;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteUseCase.execute(id);
      await get().loadProducts();
      set({ isLoading: false });
      useSyncStore.getState().syncNow().catch(() => {});
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },
}));
