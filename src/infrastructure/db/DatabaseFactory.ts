import { IDatabaseDriver } from './IDatabaseDriver';
import { TauriSqliteDriver } from './TauriSqliteDriver';
import { CapacitorSqliteDriver } from './CapacitorSqliteDriver';
import { MockSqliteDriver } from './MockSqliteDriver';

export class DatabaseFactory {
  private static instance: IDatabaseDriver | null = null;

  static getDriver(): IDatabaseDriver {
    if (this.instance) {
      return this.instance;
    }

    // Detect environment dynamically
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    const isCapacitor = typeof window !== 'undefined' && 'Capacitor' in window && (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();

    if (isTauri) {
      this.instance = new TauriSqliteDriver();
    } else if (isCapacitor) {
      this.instance = new CapacitorSqliteDriver();
    } else {
      this.instance = new MockSqliteDriver();
    }

    return this.instance;
  }
}
