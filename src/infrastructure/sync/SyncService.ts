import { DatabaseFactory } from '../db/DatabaseFactory';
import { generateId } from '../../utils/uuid';

export interface OutboxItem {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  created_at: string;
}

export interface SyncPushPayload {
  items: OutboxItem[];
}

export interface SyncPushResponse {
  status: 'success' | 'error';
  message: string;
}

export class SyncService {
  private static instance: SyncService | null = null;

  private get db() {
    return DatabaseFactory.getDriver();
  }

  static getInstance(): SyncService {
    if (!this.instance) {
      this.instance = new SyncService();
    }
    return this.instance;
  }

  async recordOutbox(
    tableName: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    payloadData: unknown
  ): Promise<void> {
    const id = generateId('sync');
    const payloadStr = JSON.stringify(payloadData);
    const now = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO sync_outbox (id, table_name, action, record_id, payload, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [id, tableName, action, recordId, payloadStr, now]
    );
  }

  async getPendingCount(): Promise<number> {
    try {
      const rows = await this.db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'PENDING'`
      );
      return rows[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }

  async getPendingItems(): Promise<OutboxItem[]> {
    return await this.db.query<OutboxItem>(
      `SELECT * FROM sync_outbox WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 100`
    );
  }

  async markAsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await this.db.execute(
        `UPDATE sync_outbox SET status = 'SYNCED' WHERE id = ?`,
        [id]
      );
    }
  }

  async pingServer(serverUrl: string): Promise<boolean> {
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/ping`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { status?: string };
      return data.status === 'nodo-online';
    } catch {
      return false;
    }
  }

  async pushPending(serverUrl: string): Promise<{ pushed: number; error: string | null }> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const pending = await this.getPendingItems();

    if (pending.length === 0) {
      return { pushed: 0, error: null };
    }

    try {
      const payload: SyncPushPayload = { items: pending };
      const response = await fetch(`${cleanUrl}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const resJson = (await response.json()) as SyncPushResponse;
      if (resJson.status === 'success') {
        const syncedIds = pending.map((item) => item.id);
        await this.markAsSynced(syncedIds);
        return { pushed: syncedIds.length, error: null };
      } else {
        throw new Error(resJson.message || 'Push sync failed');
      }
    } catch (err) {
      return { pushed: 0, error: (err as Error).message };
    }
  }

  async applyIncomingBatch(payloadString: string): Promise<number> {
    try {
      const parsed = JSON.parse(payloadString) as SyncPushPayload;
      if (!parsed.items || !Array.isArray(parsed.items)) return 0;

      let appliedCount = 0;
      for (const item of parsed.items) {
        if (item.action === 'DELETE') {
          const targetId = item.record_id;
          if (item.table_name === 'products') {
            await this.db.execute('DELETE FROM products WHERE id = ?', [targetId]);
            appliedCount++;
          } else if (item.table_name === 'stock_movements') {
            await this.db.execute('DELETE FROM stock_movements WHERE id = ?', [targetId]);
            appliedCount++;
          }
          continue;
        }

        if (item.table_name === 'products') {
          interface ProductPayload {
            id: string;
            code: string;
            name: string;
            price: number;
            stock: number;
            minStock?: number;
            min_stock?: number;
            createdAt?: string;
            created_at?: string;
            updatedAt?: string;
            updated_at?: string;
          }
          const p = JSON.parse(item.payload) as ProductPayload;
          const minStock = p.minStock ?? p.min_stock ?? 0;
          const createdAt = p.createdAt ?? p.created_at ?? new Date().toISOString();
          const updatedAt = p.updatedAt ?? p.updated_at ?? new Date().toISOString();

          await this.db.execute(
            `INSERT OR REPLACE INTO products (id, code, name, price, stock, min_stock, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.code, p.name, p.price, p.stock, minStock, createdAt, updatedAt]
          );
          appliedCount++;
        } else if (item.table_name === 'stock_movements') {
          interface StockMovementPayload {
            id: string;
            productId?: string;
            product_id?: string;
            type: 'IN' | 'OUT';
            quantity: number;
            reason: string;
            createdAt?: string;
            created_at?: string;
          }
          const m = JSON.parse(item.payload) as StockMovementPayload;
          const productId = m.productId ?? m.product_id ?? '';
          const createdAt = m.createdAt ?? m.created_at ?? new Date().toISOString();

          await this.db.execute(
            `INSERT OR REPLACE INTO stock_movements (id, product_id, type, quantity, reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [m.id, productId, m.type, m.quantity, m.reason, createdAt]
          );
          appliedCount++;
        }
      }

      return appliedCount;
    } catch (error) {
      console.error('[SyncService] Error applying incoming batch:', error);
      return 0;
    }
  }
}
