import { describe, it, expect, beforeEach } from 'vitest';
import { SyncService, OutboxItem } from './SyncService';
import { DatabaseFactory } from '../db/DatabaseFactory';

describe('SyncService Offline & Deletion Replication', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = SyncService.getInstance();
  });

  it('should queue DELETE action in sync_outbox when offline', async () => {
    const productId = 'prod-del-999';
    await syncService.recordOutbox('products', 'DELETE', productId, { id: productId });

    const pending = await syncService.getPendingItems();
    const deleteRecord = pending.find((item) => item.record_id === productId && item.action === 'DELETE');

    expect(deleteRecord).toBeDefined();
    expect(deleteRecord?.table_name).toBe('products');
    expect(deleteRecord?.status).toBe('PENDING');
  });

  it('should successfully apply incoming batch containing DELETE operations for products', async () => {
    const db = DatabaseFactory.getDriver();
    // Pre-insert a product in the receiver's DB
    await db.execute(
      `INSERT OR REPLACE INTO products (id, code, name, price, stock, min_stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['prod-to-delete', 'DEL-01', 'Producto a Borrar', 100, 10, 2, new Date().toISOString(), new Date().toISOString()]
    );

    // Verify it exists
    const beforeCheck = await db.query('SELECT * FROM products WHERE id = ?', ['prod-to-delete']);
    expect(beforeCheck.length).toBe(1);

    // Incoming batch with DELETE action
    const batchPayload = JSON.stringify({
      items: [
        {
          id: 'sync-item-1',
          table_name: 'products',
          action: 'DELETE',
          record_id: 'prod-to-delete',
          payload: JSON.stringify({ id: 'prod-to-delete' }),
          status: 'PENDING',
          created_at: new Date().toISOString(),
        } as OutboxItem,
      ],
    });

    const applied = await syncService.applyIncomingBatch(batchPayload);
    expect(applied).toBe(1);

    // Verify the product was deleted from DB
    const afterCheck = await db.query('SELECT * FROM products WHERE id = ?', ['prod-to-delete']);
    expect(afterCheck.length).toBe(0);
  });

  it('should successfully apply incoming batch with mixed INSERT and DELETE operations', async () => {
    const db = DatabaseFactory.getDriver();
    await db.execute(
      `INSERT OR REPLACE INTO products (id, code, name, price, stock, min_stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['prod-old-1', 'OLD-01', 'Viejo Item', 50, 5, 1, new Date().toISOString(), new Date().toISOString()]
    );

    const batchPayload = JSON.stringify({
      items: [
        {
          id: 'sync-item-del',
          table_name: 'products',
          action: 'DELETE',
          record_id: 'prod-old-1',
          payload: JSON.stringify({ id: 'prod-old-1' }),
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
        {
          id: 'sync-item-ins',
          table_name: 'products',
          action: 'INSERT',
          record_id: 'prod-new-1',
          payload: JSON.stringify({
            id: 'prod-new-1',
            code: 'NEW-01',
            name: 'Nuevo Item Sincronizado',
            price: 250,
            stock: 30,
            minStock: 5,
          }),
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const applied = await syncService.applyIncomingBatch(batchPayload);
    expect(applied).toBe(2);

    const checkOld = await db.query('SELECT * FROM products WHERE id = ?', ['prod-old-1']);
    expect(checkOld.length).toBe(0);

    const checkNew = await db.query<{ name: string }>('SELECT name FROM products WHERE id = ?', ['prod-new-1']);
    expect(checkNew.length).toBe(1);
    expect(checkNew[0].name).toBe('Nuevo Item Sincronizado');
  });

  it('should successfully apply incoming batch containing DELETE operations for stock_movements', async () => {
    const db = DatabaseFactory.getDriver();
    await db.execute(
      `INSERT OR REPLACE INTO stock_movements (id, product_id, type, quantity, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['mov-to-delete', 'prod-1', 'IN', 10, 'Entrada errónea', new Date().toISOString()]
    );

    const batchPayload = JSON.stringify({
      items: [
        {
          id: 'sync-item-mov-del',
          table_name: 'stock_movements',
          action: 'DELETE',
          record_id: 'mov-to-delete',
          payload: JSON.stringify({ id: 'mov-to-delete' }),
          status: 'PENDING',
          created_at: new Date().toISOString(),
        } as OutboxItem,
      ],
    });

    const applied = await syncService.applyIncomingBatch(batchPayload);
    expect(applied).toBe(1);

    const checkMov = await db.query('SELECT * FROM stock_movements WHERE id = ?', ['mov-to-delete']);
    expect(checkMov.length).toBe(0);
  });
});
