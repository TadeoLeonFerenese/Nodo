import { describe, it, expect } from 'vitest';
import { RegisterUserUseCase } from './RegisterUserUseCase';
import { SqliteUserRepository } from '../../../infrastructure/repositories/SqliteUserRepository';

describe('RegisterUserUseCase (Strict 4-field validation)', () => {
  const repo = new SqliteUserRepository();
  const useCase = new RegisterUserUseCase(repo);

  it('should register successfully when exactly 4 fields are valid and passwords match', async () => {
    const user = await useCase.execute({
      username: 'tadeotest',
      email: 'tadeo@test.com',
      password: 'SecretPassword123!',
      passwordConfirmation: 'SecretPassword123!',
    });

    expect(user).toBeDefined();
    expect(user.username).toBe('tadeotest');
    expect(user.email).toBe('tadeo@test.com');
  });

  it('should throw validation error when password confirmation does not match', async () => {
    await expect(
      useCase.execute({
        username: 'failuser',
        email: 'fail@test.com',
        password: 'Password123!',
        passwordConfirmation: 'Mismatched123!',
      })
    ).rejects.toThrow('Password confirmation does not match password.');
  });

  it('should validate login inputs in SqliteUserRepository', async () => {
    await expect(repo.login('', '1234')).rejects.toThrow('Usuario/Email y contraseña son obligatorios.');
    await expect(repo.login('user', '')).rejects.toThrow('Usuario/Email y contraseña son obligatorios.');
    await expect(repo.login('nonexistent', '1234')).rejects.toThrow('Usuario o email no encontrado.');
  });
});
