import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { Product, CreateProductInput } from '../../../domain/entities/Product';

export class CreateProductUseCase {
  constructor(private productRepo: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    if (!input.name || input.name.trim() === '') {
      throw new Error('Product name is required.');
    }

    if (!input.code || input.code.trim() === '') {
      throw new Error('Product barcode is required.');
    }

    if (input.price < 0) {
      throw new Error('Product price cannot be negative.');
    }

    const existing = await this.productRepo.findByCode(input.code);
    if (existing) {
      throw new Error(`Product with barcode "${input.code}" already exists.`);
    }

    return await this.productRepo.create(input);
  }
}
