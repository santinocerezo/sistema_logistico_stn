import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from './auth.schemas';

describe('registerSchema', () => {
  const validInput = {
    email: 'test@example.com',
    password: 'Password1!',
    fullName: 'Juan Pérez',
  };

  it('acepta datos válidos', () => {
    expect(registerSchema.safeParse(validInput).success).toBe(true);
  });

  it('rechaza email inválido', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'no-es-email' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña sin mayúscula', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'password1!' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña sin número', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Password!' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña sin carácter especial', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Password1' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña menor a 8 caracteres', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'P1!' });
    expect(result.success).toBe(false);
  });

  it('rechaza fullName vacío', () => {
    const result = registerSchema.safeParse({ ...validInput, fullName: 'A' });
    expect(result.success).toBe(false);
  });

  it('acepta phone opcional', () => {
    const result = registerSchema.safeParse({ ...validInput, phone: '+5491112345678' });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('acepta credenciales válidas', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: 'anypass' });
    expect(result.success).toBe(true);
  });

  it('rechaza email inválido', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rechaza contraseña vacía', () => {
    const result = loginSchema.safeParse({ email: 'user@test.com', password: '' });
    expect(result.success).toBe(false);
  });
});
