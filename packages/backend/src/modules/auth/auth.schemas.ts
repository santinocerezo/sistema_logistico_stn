import { z } from 'zod';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      PASSWORD_REGEX,
      'La contraseña debe contener al menos una mayúscula, un número y un carácter especial',
    ),
  fullName: z.string().min(2, 'El nombre completo es requerido').max(255),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// 2FA schemas
export const twoFactorVerifySchema = z.object({
  token: z.string().min(6, 'El código debe tener al menos 6 caracteres').max(8),
});

export const twoFactorCompleteSchema = z.object({
  tempToken: z.string().min(1, 'El token temporal es requerido'),
  token: z.string().min(6, 'El código debe tener al menos 6 caracteres').max(8),
});

// Password reset schemas
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      PASSWORD_REGEX,
      'La contraseña debe contener al menos una mayúscula, un número y un carácter especial',
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorCompleteInput = z.infer<typeof twoFactorCompleteSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
