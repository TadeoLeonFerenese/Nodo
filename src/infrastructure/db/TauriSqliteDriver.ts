import Database from '@tauri-apps/plugin-sql';
import { IDatabaseDriver } from './IDatabaseDriver';

const SCHEMA_QUERIES = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);`,
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);`
];

export class TauriSqliteDriver implements IDatabaseDriver {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = await Database.load('sqlite:nodo.db');
    for (const query of SCHEMA_QUERIES) {
      await this.db.execute(query);
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.execute(sql, params);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) await this.initialize();
    return await this.db!.select<T>(sql, params);
  }

  async transaction<T>(action: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    await this.execute('BEGIN TRANSACTION');
    try {
      const result = await action(this);
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      throw error;
    }
  }
}
