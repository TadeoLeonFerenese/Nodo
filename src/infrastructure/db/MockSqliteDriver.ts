import { IDatabaseDriver } from './IDatabaseDriver';

export class MockSqliteDriver implements IDatabaseDriver {
  private tables: Record<string, Record<string, any>[]> = {
    products: [],
    stock_movements: [],
    users: [],
    sync_outbox: [],
  };

  async initialize(): Promise<void> {
    console.log('[MockSqliteDriver] Initialized in-memory SQLite mock for Web/Test environment.');
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    const cleanSql = sql.trim();

    // INSERT INTO sync_outbox
    if (/^INSERT INTO sync_outbox/i.test(cleanSql)) {
      const [id, table_name, action, record_id, payload, created_at] = params as any[];
      this.tables.sync_outbox.push({
        id,
        table_name,
        action,
        record_id,
        payload,
        status: 'PENDING',
        created_at: created_at ?? new Date().toISOString(),
      });
      return;
    }

    // INSERT OR REPLACE INTO products
    if (/^INSERT OR REPLACE INTO products/i.test(cleanSql)) {
      const [id, code, name, price, stock, min_stock, created_at, updated_at] = params as any[];
      const idx = this.tables.products.findIndex((p) => p.id === id);
      const row = { id, code, name, price, stock, min_stock, created_at, updated_at };
      if (idx >= 0) {
        this.tables.products[idx] = row;
      } else {
        this.tables.products.push(row);
      }
      return;
    }

    // INSERT OR REPLACE INTO stock_movements
    if (/^INSERT OR REPLACE INTO stock_movements/i.test(cleanSql)) {
      const [id, product_id, type, quantity, reason, created_at] = params as any[];
      const idx = this.tables.stock_movements.findIndex((m) => m.id === id);
      const row = { id, product_id, type, quantity, reason, created_at };
      if (idx >= 0) {
        this.tables.stock_movements[idx] = row;
      } else {
        this.tables.stock_movements.push(row);
      }
      return;
    }

    // DELETE FROM products WHERE id = ?
    if (/^DELETE FROM products WHERE id = \?/i.test(cleanSql)) {
      const targetId = params[0];
      this.tables.products = this.tables.products.filter((p) => p.id !== targetId);
      return;
    }

    // DELETE FROM stock_movements WHERE id = ?
    if (/^DELETE FROM stock_movements WHERE id = \?/i.test(cleanSql)) {
      const targetId = params[0];
      this.tables.stock_movements = this.tables.stock_movements.filter((m) => m.id !== targetId);
      return;
    }

    // UPDATE products SET ... WHERE id = ?
    if (/^UPDATE products/i.test(cleanSql)) {
      const targetId = params[params.length - 1];
      const prod = this.tables.products.find((p) => p.id === targetId);
      if (prod && params.length >= 6) {
        const [code, name, price, min_stock, updated_at] = params as any[];
        prod.code = code;
        prod.name = name;
        prod.price = price;
        prod.min_stock = min_stock;
        prod.updated_at = updated_at;
      }
      return;
    }

    // UPDATE sync_outbox SET status = 'SYNCED'
    if (/^UPDATE sync_outbox/i.test(cleanSql)) {
      const targetId = params[0];
      const item = this.tables.sync_outbox.find((o) => o.id === targetId);
      if (item) {
        item.status = 'SYNCED';
      }
      return;
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const cleanSql = sql.trim();

    // SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'PENDING'
    if (/SELECT COUNT\(\*\) as count FROM sync_outbox WHERE status = 'PENDING'/i.test(cleanSql)) {
      const count = this.tables.sync_outbox.filter((i) => i.status === 'PENDING').length;
      return [{ count }] as T[];
    }

    // SELECT * FROM sync_outbox WHERE status = 'PENDING'
    if (/SELECT \* FROM sync_outbox WHERE status = 'PENDING'/i.test(cleanSql)) {
      const pending = this.tables.sync_outbox.filter((i) => i.status === 'PENDING');
      return pending as T[];
    }

    // SELECT * FROM products WHERE id = ? or SELECT name FROM products WHERE id = ?
    if (/SELECT .* FROM products WHERE id = \?/i.test(cleanSql)) {
      const targetId = params[0];
      const found = this.tables.products.filter((p) => p.id === targetId);
      return found as T[];
    }

    // SELECT * FROM products
    if (/SELECT \* FROM products/i.test(cleanSql)) {
      return [...this.tables.products] as T[];
    }

    // SELECT * FROM stock_movements WHERE id = ?
    if (/SELECT .* FROM stock_movements WHERE id = \?/i.test(cleanSql)) {
      const targetId = params[0];
      const found = this.tables.stock_movements.filter((m) => m.id === targetId);
      return found as T[];
    }

    // SELECT * FROM stock_movements
    if (/SELECT \* FROM stock_movements/i.test(cleanSql)) {
      return [...this.tables.stock_movements] as T[];
    }

    return [] as T[];
  }

  async transaction<T>(action: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    return await action(this);
  }
}
