import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { IDatabaseDriver } from './IDatabaseDriver';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
`;

export class CapacitorSqliteDriver implements IDatabaseDriver {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    const isConn = await this.sqlite.isConnection('nodo', false);
    if (isConn.result) {
      this.db = await this.sqlite.retrieveConnection('nodo', false);
    } else {
      this.db = await this.sqlite.createConnection('nodo', false, 'no-encryption', 1, false);
    }

    const isOpen = await this.db.isDBOpen();
    if (!isOpen.result) {
      await this.db.open();
    }

    // Initialize core schema on startup
    await this.db.execute(SCHEMA_SQL);
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) await this.initialize();
    if (params && params.length > 0) {
      await this.db!.run(sql, params as (string | number | null)[]);
    } else {
      await this.db!.execute(sql);
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) await this.initialize();
    const res = await this.db!.query(sql, (params || []) as (string | number | null)[]);
    return (res.values as T[]) || [];
  }

  async transaction<T>(action: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    if (!this.db) await this.initialize();
    await this.db!.beginTransaction();
    try {
      const result = await action(this);
      await this.db!.commitTransaction();
      return result;
    } catch (error) {
      await this.db!.rollbackTransaction();
      throw error;
    }
  }
}

