import { IDatabaseDriver } from './IDatabaseDriver';

export class TauriSqliteDriver implements IDatabaseDriver {
  private db: unknown = null;

  async initialize(): Promise<void> {
    const pkgName = '@tauri-apps/plugin-sql';
    const Database = (await import(/* @vite-ignore */ pkgName)).default;
    this.db = await Database.load('sqlite:nodo.db');
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.db) await this.initialize();
    await (this.db as { execute: (sql: string, params?: unknown[]) => Promise<void> }).execute(sql, params);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) await this.initialize();
    return await (this.db as { select: <R>(sql: string, params?: unknown[]) => Promise<R[]> }).select<T>(sql, params);
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
