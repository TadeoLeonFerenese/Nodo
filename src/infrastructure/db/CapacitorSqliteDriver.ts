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

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);
`;

export class CapacitorSqliteDriver implements IDatabaseDriver {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private initPromise: Promise<void> | null = null;
  private inTransaction = false;

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[CapacitorSqliteDriver] Initializing SQLite connection to database "nodo"...');
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
        await this.db.execute(SCHEMA_SQL, false);
        console.log('[CapacitorSqliteDriver] Database initialized successfully.');
      } catch (err) {
        console.error('[CapacitorSqliteDriver] Initialization error:', err);
        this.db = null;
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.initialize();
    // When inside a manual transaction, transaction must be false to prevent "Already in transaction" error
    const useTransaction = !this.inTransaction;
    try {
      if (params && params.length > 0) {
        await this.db!.run(sql, params as (string | number | null)[], useTransaction);
      } else {
        await this.db!.execute(sql, useTransaction);
      }
    } catch (err) {
      console.error('[CapacitorSqliteDriver EXECUTE FAILED]', err, '\nSQL:', sql, '\nParams:', params, '\ninTransaction:', this.inTransaction);
      throw err;
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.initialize();
    try {
      const res = await this.db!.query(sql, (params || []) as (string | number | null)[]);
      return (res.values as T[]) || [];
    } catch (err) {
      console.error('[CapacitorSqliteDriver QUERY FAILED]', err, '\nSQL:', sql, '\nParams:', params);
      throw err;
    }
  }

  async transaction<T>(action: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    await this.initialize();

    // Prevent nested beginTransaction calls
    if (this.inTransaction) {
      return await action(this);
    }

    this.inTransaction = true;
    try {
      await this.db!.beginTransaction();
      const result = await action(this);
      await this.db!.commitTransaction();
      return result;
    } catch (error) {
      try {
        await this.db!.rollbackTransaction();
      } catch (rollbackErr) {
        console.error('[CapacitorSqliteDriver] Rollback error:', rollbackErr);
      }
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }
}

