import { IStockRepository } from '../../domain/repositories/IStockRepository';
import { StockMovement, CreateStockMovementInput } from '../../domain/entities/StockMovement';
import { Product } from '../../domain/entities/Product';
import { DatabaseFactory } from '../db/DatabaseFactory';

export class SqliteStockRepository implements IStockRepository {
  private get db() {
    return DatabaseFactory.getDriver();
  }

  async recordMovement(input: CreateStockMovementInput): Promise<StockMovement> {
    return await this.db.transaction(async (driver) => {
      // 1. Fetch current product
      const products = await driver.query<{ id: string; stock: number }>(
        'SELECT id, stock FROM products WHERE id = ?',
        [input.productId]
      );

      if (products.length === 0) {
        throw new Error(`Product with ID ${input.productId} does not exist.`);
      }

      const currentStock = products[0].stock;
      const delta = input.type === 'IN' ? input.quantity : -input.quantity;
      const newStock = currentStock + delta;

      if (newStock < 0) {
        throw new Error(`Insufficient stock for product. Current: ${currentStock}, Requested exit: ${input.quantity}`);
      }

      // 2. Insert movement
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await driver.execute(
        `INSERT INTO stock_movements (id, product_id, type, quantity, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, input.productId, input.type, input.quantity, input.reason, now]
      );

      // 3. Update product current stock
      await driver.execute(
        'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?',
        [newStock, now, input.productId]
      );

      return {
        id,
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        createdAt: now,
      };
    });
  }

  async getMovementsByProduct(productId: string): Promise<StockMovement[]> {
    const rows = await this.db.query<{
      id: string;
      product_id: string;
      type: 'IN' | 'OUT';
      quantity: number;
      reason: string;
      created_at: string;
    }>('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC', [productId]);

    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      type: r.type,
      quantity: r.quantity,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  async getAllMovements(): Promise<StockMovement[]> {
    const rows = await this.db.query<{
      id: string;
      product_id: string;
      type: 'IN' | 'OUT';
      quantity: number;
      reason: string;
      created_at: string;
    }>('SELECT * FROM stock_movements ORDER BY created_at DESC');

    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      type: r.type,
      quantity: r.quantity,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  async getLowStockProducts(): Promise<Product[]> {
    const rows = await this.db.query<{
      id: string;
      code: string;
      name: string;
      price: number;
      stock: number;
      min_stock: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC');

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      price: r.price,
      stock: r.stock,
      minStock: r.min_stock,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}
