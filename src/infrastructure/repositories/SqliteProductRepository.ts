import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { Product, CreateProductInput, UpdateProductInput } from '../../domain/entities/Product';
import { DatabaseFactory } from '../db/DatabaseFactory';
import { SyncService } from '../sync/SyncService';
import { generateId } from '../../utils/uuid';

export class SqliteProductRepository implements IProductRepository {
  private get db() {
    return DatabaseFactory.getDriver();
  }

  async findAll(): Promise<Product[]> {
    const rows = await this.db.query<{
      id: string;
      code: string;
      name: string;
      price: number;
      stock: number;
      min_stock: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM products ORDER BY name ASC');

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

  async findById(id: string): Promise<Product | null> {
    const rows = await this.db.query<{
      id: string;
      code: string;
      name: string;
      price: number;
      stock: number;
      min_stock: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM products WHERE id = ?', [id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      price: r.price,
      stock: r.stock,
      minStock: r.min_stock,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async findByCode(code: string): Promise<Product | null> {
    const rows = await this.db.query<{
      id: string;
      code: string;
      name: string;
      price: number;
      stock: number;
      min_stock: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM products WHERE code = ?', [code]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      price: r.price,
      stock: r.stock,
      minStock: r.min_stock,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async create(input: CreateProductInput): Promise<Product> {
    const id = generateId('prod');
    const now = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO products (id, code, name, price, stock, min_stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.code, input.name, input.price, input.stock, input.minStock, now, now]
    );

    const product: Product = {
      id,
      code: input.code,
      name: input.name,
      price: input.price,
      stock: input.stock,
      minStock: input.minStock,
      createdAt: now,
      updatedAt: now,
    };

    // Record to Local-First sync outbox
    SyncService.getInstance().recordOutbox('products', 'INSERT', id, product).catch(console.error);

    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const current = await this.findById(id);
    if (!current) {
      throw new Error(`Product with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updatedCode = input.code ?? current.code;
    const updatedName = input.name ?? current.name;
    const updatedPrice = input.price ?? current.price;
    const updatedMinStock = input.minStock ?? current.minStock;

    await this.db.execute(
      `UPDATE products SET code = ?, name = ?, price = ?, min_stock = ?, updated_at = ? WHERE id = ?`,
      [updatedCode, updatedName, updatedPrice, updatedMinStock, now, id]
    );

    const updatedProduct: Product = {
      ...current,
      code: updatedCode,
      name: updatedName,
      price: updatedPrice,
      minStock: updatedMinStock,
      updatedAt: now,
    };

    SyncService.getInstance().recordOutbox('products', 'UPDATE', id, updatedProduct).catch(console.error);

    return updatedProduct;
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM products WHERE id = ?', [id]);
    SyncService.getInstance().recordOutbox('products', 'DELETE', id, { id }).catch(console.error);
  }
}
