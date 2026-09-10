import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { Product, UpdateProductInput } from '../../../domain/entities/Product';

export class UpdateProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(id: string, input: UpdateProductInput): Promise<Product> {
    return await this.productRepo.update(id, input);
  }
}

export class ListProductsUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(): Promise<Product[]> {
    return await this.productRepo.findAll();
  }
}

export class DeleteProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(id: string): Promise<void> {
    await this.productRepo.delete(id);
  }
}
