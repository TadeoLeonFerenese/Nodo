import { IStockRepository } from '../../../domain/repositories/IStockRepository';
import { StockMovement, CreateStockMovementInput } from '../../../domain/entities/StockMovement';
import { Product } from '../../../domain/entities/Product';

export class RecordStockMovementUseCase {
  constructor(private stockRepo: IStockRepository) {}

  async execute(input: CreateStockMovementInput): Promise<StockMovement> {
    if (input.quantity <= 0) {
      throw new Error('Movement quantity must be greater than zero.');
    }

    if (!input.reason || input.reason.trim() === '') {
      throw new Error('Movement reason is required.');
    }

    return await this.stockRepo.recordMovement(input);
  }
}

export class GetLowStockAlertsUseCase {
  constructor(private stockRepo: IStockRepository) {}

  async execute(): Promise<Product[]> {
    return await this.stockRepo.getLowStockProducts();
  }
}
