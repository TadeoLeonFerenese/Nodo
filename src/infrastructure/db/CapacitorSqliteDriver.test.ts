import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapacitorSqliteDriver } from './CapacitorSqliteDriver';

describe('CapacitorSqliteDriver Transaction Management', () => {
  let driver: CapacitorSqliteDriver;
  let mockDb: any;

  beforeEach(() => {
    driver = new CapacitorSqliteDriver();
    mockDb = {
      isDBOpen: vi.fn().mockResolvedValue({ result: true }),
      open: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      query: vi.fn().mockResolvedValue({ values: [] }),
      beginTransaction: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      commitTransaction: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      rollbackTransaction: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
    };

    // Inject initialized mock database
    (driver as any).db = mockDb;
  });

  it('should pass useTransaction = true when execute is called outside a transaction', async () => {
    await driver.execute('UPDATE products SET stock = 10');
    expect(mockDb.execute).toHaveBeenCalledWith('UPDATE products SET stock = 10', true);

    await driver.execute('UPDATE products SET stock = ?', [15]);
    expect(mockDb.run).toHaveBeenCalledWith('UPDATE products SET stock = ?', [15], true);
  });

  it('should pass useTransaction = false when execute is called inside a transaction to prevent "Already in transaction"', async () => {
    await driver.transaction(async (d) => {
      await d.execute('UPDATE products SET stock = ?', [20]);
      await d.execute('INSERT INTO stock_movements (id) VALUES (?)', ['mov-1']);
    });

    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.run).toHaveBeenCalledWith('UPDATE products SET stock = ?', [20], false);
    expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO stock_movements (id) VALUES (?)', ['mov-1'], false);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('should rollback transaction and reset inTransaction state on error', async () => {
    await expect(
      driver.transaction(async (d) => {
        await d.execute('UPDATE products SET stock = 5');
        throw new Error('Simulated failure during transaction');
      })
    ).rejects.toThrow('Simulated failure during transaction');

    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();

    // Verify subsequent executes are recognized as outside transaction again
    await driver.execute('SELECT 1');
    expect(mockDb.execute).toHaveBeenCalledWith('SELECT 1', true);
  });
});
