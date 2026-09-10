import { IDatabaseDriver } from './IDatabaseDriver';

export class MockSqliteDriver implements IDatabaseDriver {
  private tables: Record<string, Record<string, unknown>[]> = {
    products: [],
    stock_movements: [],
    users: [],
  };

  async initialize(): Promise<void> {
    console.log('[MockSqliteDriver] Initialized in-memory SQLite mock for Web/Test environment.');
  }

  async execute(sql: string, _params: unknown[] = []): Promise<void> {
    console.log('[MockSqliteDriver EXECUTE]', sql);
  }

  async query<T>(sql: string, _params: unknown[] = []): Promise<T[]> {
    console.log('[MockSqliteDriver QUERY]', sql);
    return [] as T[];
  }

  async transaction<T>(action: (driver: IDatabaseDriver) => Promise<T>): Promise<T> {
    return await action(this);
  }
}
