import { describe, it, expect } from 'vitest';
import { SqliteProductRepository } from './SqliteProductRepository';
import { SqliteStockRepository } from './SqliteStockRepository';
import { SyncService } from '../sync/SyncService';

describe('SqliteProductRepository - Stock Inicial Atómico', () => {
  const productRepo = new SqliteProductRepository();
  const stockRepo = new SqliteStockRepository();
  const syncService = SyncService.getInstance();

  it('debe registrar automáticamente un movimiento IN "Stock inicial" al crear un producto con stock > 0', async () => {
    const code = `TEST-INIT-${Date.now()}`;
    const product = await productRepo.create({
      code,
      name: 'Yerba Mate Test',
      price: 1500,
      stock: 20,
      minStock: 5,
    });

    expect(product.id).toBeDefined();
    expect(product.stock).toBe(20);

    // 1. Verificar en la base de datos local que existe el registro en stock_movements
    const movements = await stockRepo.getMovementsByProduct(product.id);
    expect(movements.length).toBe(1);
    expect(movements[0].type).toBe('IN');
    expect(movements[0].quantity).toBe(20);
    expect(movements[0].reason).toBe('Stock inicial');

    // 2. Verificar que se hayan creado 2 registros en sync_outbox (uno para el producto y otro para el movimiento)
    const pending = await syncService.getPendingItems();
    const productOutbox = pending.find((i) => i.table_name === 'products' && i.record_id === product.id);
    const movementOutbox = pending.find((i) => i.table_name === 'stock_movements' && i.record_id === movements[0].id);

    expect(productOutbox).toBeDefined();
    expect(movementOutbox).toBeDefined();
  });

  it('NO debe generar movimiento en stock_movements al crear un producto con stock === 0', async () => {
    const code = `TEST-ZERO-${Date.now()}`;
    const product = await productRepo.create({
      code,
      name: 'Producto Sin Stock Inicial',
      price: 500,
      stock: 0,
      minStock: 2,
    });

    expect(product.id).toBeDefined();
    expect(product.stock).toBe(0);

    // Verificar que NO haya movimientos registrados para este producto
    const movements = await stockRepo.getMovementsByProduct(product.id);
    expect(movements.length).toBe(0);
  });
});
