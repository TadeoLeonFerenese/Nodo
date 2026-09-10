export interface IDatabaseDriver {
  initialize(): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(action: (driver: IDatabaseDriver) => Promise<T>): Promise<T>;
}
