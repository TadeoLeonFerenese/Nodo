import { IDatabaseDriver } from './IDatabaseDriver';
import { TauriSqliteDriver } from './TauriSqliteDriver';
import { CapacitorSqliteDriver } from './CapacitorSqliteDriver';
import { MockSqliteDriver } from './MockSqliteDriver';

import { isTauri, isCapacitor } from '../../utils/platform';

export class DatabaseFactory {
  private static instance: IDatabaseDriver | null = null;

  static getDriver(): IDatabaseDriver {
    if (this.instance) {
      return this.instance;
    }

    if (isTauri()) {
      this.instance = new TauriSqliteDriver();
    } else if (isCapacitor()) {
      this.instance = new CapacitorSqliteDriver();
    } else {
      this.instance = new MockSqliteDriver();
    }

    return this.instance;
  }
}
