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

  it('debe registrar exactamente la cantidad del remito sin duplicar al crear con stock 0 y registrar movimiento', async () => {
    const code = `TEST-REMITO-${Date.now()}`;
    const product = await productRepo.create({
      code,
      name: 'Aceite Remito Test',
      price: 1200,
      stock: 0,
      minStock: 2,
    });

    expect(product.stock).toBe(0);

    const mov = await stockRepo.recordMovement({
      productId: product.id,
      type: 'IN',
      quantity: 2,
      reason: 'Alta catálogo desde Remito IA',
    });

    expect(mov.quantity).toBe(2);

    const refreshed = await productRepo.findById(product.id);
    expect(refreshed?.stock).toBe(2); // Exactly 2, not 4!
  });

  it('debe desaparecer de las alertas de stock bajo al ser eliminado el producto', async () => {
    const code = `TEST-LOW-${Date.now()}`;
    const product = await productRepo.create({
      code,
      name: 'Producto Poco Stock',
      price: 100,
      stock: 1,
      minStock: 5,
    });

    // 1. Verificar que aparece en alertas de stock bajo
    const alertsBefore = await stockRepo.getLowStockProducts();
    expect(alertsBefore.some((p) => p.id === product.id)).toBe(true);

    // 2. Eliminar el producto
    await productRepo.delete(product.id);

    // 3. Verificar que desapareció de las alertas de stock bajo
    const alertsAfter = await stockRepo.getLowStockProducts();
    expect(alertsAfter.some((p) => p.id === product.id)).toBe(false);
  });
});
