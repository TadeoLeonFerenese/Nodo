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
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);`,
  `CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);`
];

export class TauriSqliteDriver implements IDatabaseDriver {
  private db: Database | null = null;
  private initPromise: Promise<void> | null = null;

  private convertPlaceholders(sql: string): string {
    let count = 1;
    return sql.replace(/\?/g, () => `$${count++}`);
  }

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[TauriSqliteDriver] Initializing SQLite connection to sqlite:nodo.db...');
        this.db = await Database.load('sqlite:nodo.db');
        console.log('[TauriSqliteDriver] SQLite connection established. Verifying schema...');
        for (const query of SCHEMA_QUERIES) {
          await this.db.execute(query);
        }
        console.log('[TauriSqliteDriver] SQLite schema initialized successfully.');
      } catch (err) {
        console.error('[TauriSqliteDriver] Initialization error:', err);
        this.db = null;
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.initialize();
    const convertedSql = this.convertPlaceholders(sql);
    try {
      await this.db!.execute(convertedSql, params);
    } catch (err) {
      console.error('[TauriSqliteDriver EXECUTE FAILED]', err, '\nOriginal SQL:', sql, '\nConverted SQL:', convertedSql, '\nParams:', params);
      throw err;
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.initialize();
    const convertedSql = this.convertPlaceholders(sql);
    try {
      const rows = await this.db!.select<T[]>(convertedSql, params);
      return rows;
    } catch (err) {
      console.error('[TauriSqliteDriver QUERY FAILED]', err, '\nOriginal SQL:', sql, '\nConverted SQL:', convertedSql, '\nParams:', params);
      throw err;
    }
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
