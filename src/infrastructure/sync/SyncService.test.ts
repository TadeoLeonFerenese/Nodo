import { describe, it, expect, beforeEach } from 'vitest';
import { SyncService } from './SyncService';
import { DatabaseFactory } from '../db/DatabaseFactory';

describe('SyncService (Local-First Wi-Fi Engine)', () => {
  let syncService: SyncService;

  beforeEach(() => {
    syncService = SyncService.getInstance();
  });

  it('should be a singleton instance', () => {
    const instanceA = SyncService.getInstance();
    const instanceB = SyncService.getInstance();
    expect(instanceA).toBe(instanceB);
  });

  it('should record an outbox mutation for product creation', async () => {
    const payload = {
      id: 'prod-123',
      code: 'TEST-CODE',
      name: 'Yerba Mate 1kg',
      price: 1500,
      stock: 10,
      minStock: 2,
    };

    await expect(
      syncService.recordOutbox('products', 'INSERT', 'prod-123', payload)
    ).resolves.not.toThrow();
  });

  it('should parse and apply incoming product batch without errors', async () => {
    const batch = JSON.stringify({
      items: [
        {
          id: 'out-1',
          table_name: 'products',
          action: 'INSERT',
          record_id: 'prod-456',
          payload: JSON.stringify({
            id: 'prod-456',
            code: 'ALFA-789',
            name: 'Alfajor Triple',
            price: 800,
            stock: 24,
            minStock: 5,
          }),
          status: 'PENDING',
          created_at: new Date().toISOString(),
        },
      ],
    });

    const applied = await syncService.applyIncomingBatch(batch);
    expect(applied).toBe(1);
  });

  it('should gracefully handle malformed batch payload', async () => {
    const applied = await syncService.applyIncomingBatch('invalid-json');
    expect(applied).toBe(0);
  });
});
