import { describe, it, expect } from 'vitest';
import { SqliteProductRepository } from '../../../infrastructure/repositories/SqliteProductRepository';
import { UpdateProductUseCase } from './ProductUseCases';

describe('UpdateProductUseCase - Modificación de Precio y Atributos', () => {
  const repo = new SqliteProductRepository();
  const updateUseCase = new UpdateProductUseCase(repo);
  it('debe actualizar el precio de un producto existente', async () => {
    const code = `TEST-PRICE-${Date.now()}`;
    const product = await repo.create({
      code,
      name: 'Alfajor Marplatense',
      price: 1000,
      stock: 10,
      minStock: 2,
    });

    const updated = await updateUseCase.execute(product.id, { price: 1450.5 });
    expect(updated.price).toBe(1450.5);

    const fromDb = await repo.findById(product.id);
    expect(fromDb?.price).toBe(1450.5);
    expect(fromDb?.name).toBe('Alfajor Marplatense');
    expect(fromDb?.stock).toBe(10);
  });
});
