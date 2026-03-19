import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del pool de PostgreSQL
vi.mock('../../db/pool', () => ({
  default: {
    query: vi.fn(),
  },
}));

import pool from '../../db/pool';
import { registerUser, loginUser } from './auth.service';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_min_32_chars_here';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_min_32_chars_here';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
});

describe('registerUser', () => {
  it('crea usuario con balance 0 y devuelve tokens', async () => {
    // Email no existe
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // INSERT devuelve el usuario creado
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'uuid-123',
        email: 'nuevo@test.com',
        full_name: 'Nuevo Usuario',
        role: 'user',
        balance: '0.00',
      }],
    });

    const result = await registerUser({
      email: 'nuevo@test.com',
      password: 'Password1!',
      fullName: 'Nuevo Usuario',
    });

    expect(result.user.balance).toBe(0);
    expect(result.user.role).toBe('user');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('lanza error 409 si el email ya existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing' }] });

    await expect(
      registerUser({ email: 'existente@test.com', password: 'Password1!', fullName: 'Ya Existe' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('loginUser', () => {
  it('lanza error 401 si el usuario no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      loginUser({ email: 'noexiste@test.com', password: 'Password1!' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza error 401 si la contraseña es incorrecta', async () => {
    // bcrypt hash de 'Password1!' — usamos un hash real para la prueba
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password1!', 1);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'uuid-456',
        email: 'user@test.com',
        password_hash: hash,
        full_name: 'Test User',
        role: 'user',
        balance: '100.00',
        is_active: true,
      }],
    });

    await expect(
      loginUser({ email: 'user@test.com', password: 'WrongPass1!' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('devuelve tokens y datos del usuario con login correcto', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password1!', 1);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'uuid-789',
        email: 'admin@test.com',
        password_hash: hash,
        full_name: 'Admin User',
        role: 'admin',
        balance: '500.00',
        is_active: true,
      }],
    });
    // UPDATE last_login
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await loginUser({ email: 'admin@test.com', password: 'Password1!' });

    expect(result.user.role).toBe('admin');
    expect(result.user.balance).toBe(500);
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('lanza error 401 si la cuenta está desactivada', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password1!', 1);

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'uuid-000',
        email: 'inactive@test.com',
        password_hash: hash,
        full_name: 'Inactive User',
        role: 'user',
        balance: '0.00',
        is_active: false,
      }],
    });

    await expect(
      loginUser({ email: 'inactive@test.com', password: 'Password1!' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('la respuesta incluye el rol para redirección por rol', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Password1!', 1);

    for (const role of ['user', 'admin', 'courier'] as const) {
      vi.clearAllMocks();
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: `uuid-${role}`,
          email: `${role}@test.com`,
          password_hash: hash,
          full_name: `${role} User`,
          role,
          balance: '0.00',
          is_active: true,
        }],
      });
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await loginUser({ email: `${role}@test.com`, password: 'Password1!' });
      expect(result.user.role).toBe(role);
    }
  });
});
