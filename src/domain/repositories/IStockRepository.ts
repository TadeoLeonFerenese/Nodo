import { StockMovement, CreateStockMovementInput } from '../entities/StockMovement';
import { Product } from '../entities/Product';

export interface IStockRepository {
  recordMovement(input: CreateStockMovementInput): Promise<StockMovement>;
  getMovementsByProduct(productId: string): Promise<StockMovement[]>;
  getAllMovements(): Promise<StockMovement[]>;
  getLowStockProducts(): Promise<Product[]>;
}
