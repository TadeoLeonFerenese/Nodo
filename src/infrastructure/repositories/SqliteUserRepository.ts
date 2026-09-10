import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, RegisterUserDto } from '../../domain/entities/User';
import { DatabaseFactory } from '../db/DatabaseFactory';

export class SqliteUserRepository implements IUserRepository {
  private get db() {
    return DatabaseFactory.getDriver();
  }

  async register(dto: RegisterUserDto): Promise<User> {
    // 1. Strict 4-field validation
    if (!dto.username || !dto.email || !dto.password || !dto.passwordConfirmation) {
      throw new Error('All 4 registration fields (username, email, password, passwordConfirmation) are strictly required.');
    }

    if (dto.password !== dto.passwordConfirmation) {
      throw new Error('Password and Password Confirmation do not match.');
    }

    // 2. Uniqueness check
    const existing = await this.db.query<{ id: string }>('SELECT id FROM users WHERE username = ? OR email = ?', [
      dto.username,
      dto.email,
    ]);

    if (existing.length > 0) {
      throw new Error('User with this username or email already exists.');
    }

    // 3. Simple hash simulation for local MVP (In production, use bcrypt/argon2)
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = `hashed_${dto.password}`;

    await this.db.execute(
      `INSERT INTO users (id, username, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, dto.username, dto.email, passwordHash, now]
    );

    return {
      id,
      username: dto.username,
      email: dto.email,
      createdAt: now,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.query<{ id: string; username: string; email: string; created_at: string }>(
      'SELECT id, username, email, created_at FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      username: r.username,
      email: r.email,
      createdAt: r.created_at,
    };
  }

  async getCurrentUser(): Promise<User | null> {
    const rows = await this.db.query<{ id: string; username: string; email: string; created_at: string }>(
      'SELECT id, username, email, created_at FROM users ORDER BY created_at ASC LIMIT 1'
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      username: r.username,
      email: r.email,
      createdAt: r.created_at,
    };
  }
}
