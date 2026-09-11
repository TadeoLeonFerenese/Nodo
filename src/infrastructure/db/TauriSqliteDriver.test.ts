import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriSqliteDriver } from './TauriSqliteDriver';

describe('TauriSqliteDriver SQL and Placeholder Conversion', () => {
  let driver: TauriSqliteDriver;
  let mockDb: any;

  beforeEach(() => {
    driver = new TauriSqliteDriver();
    mockDb = {
      execute: vi.fn().mockResolvedValue({ rowsAffected: 1, lastInsertId: 1 }),
      select: vi.fn().mockResolvedValue([]),
    };
    (driver as any).db = mockDb;
  });

  it('should convert ? placeholders to $1, $2, $3 for SQLite sqlx compatibility', async () => {
    await driver.query('SELECT * FROM users WHERE username = ? OR email = ?', ['test', 'test@mail.com']);
    expect(mockDb.select).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      ['test', 'test@mail.com']
    );

    await driver.execute(
      'INSERT INTO products (id, code, name, price) VALUES (?, ?, ?, ?)',
      ['p1', '123', 'Item', 50]
    );
    expect(mockDb.execute).toHaveBeenCalledWith(
      'INSERT INTO products (id, code, name, price) VALUES ($1, $2, $3, $4)',
      ['p1', '123', 'Item', 50]
    );
  });

  it('should preserve queries without placeholders untouched', async () => {
    await driver.query('SELECT * FROM products ORDER BY name ASC');
    expect(mockDb.select).toHaveBeenCalledWith('SELECT * FROM products ORDER BY name ASC', []);
  });

  it('should execute transaction with BEGIN and COMMIT', async () => {
    await driver.transaction(async (d) => {
      await d.execute('UPDATE products SET stock = ? WHERE id = ?', [10, 'p1']);
    });

    expect(mockDb.execute).toHaveBeenCalledWith('BEGIN TRANSACTION', []);
    expect(mockDb.execute).toHaveBeenCalledWith('UPDATE products SET stock = $1 WHERE id = $2', [10, 'p1']);
    expect(mockDb.execute).toHaveBeenCalledWith('COMMIT', []);
  });
});
