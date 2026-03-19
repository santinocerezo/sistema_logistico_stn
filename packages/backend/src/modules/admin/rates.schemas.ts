import { z } from 'zod';

/**
 * Schema para crear una nueva versión de tarifas
 * Req 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.16
 */
export const createRateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  distance_min_km: z.number().int().min(0, 'La distancia mínima debe ser mayor o igual a 0'),
  distance_max_km: z.number().int().min(1, 'La distancia máxima debe ser mayor a 0'),
  base_price: z.number().min(0, 'El precio base debe ser mayor o igual a 0'),
  price_per_extra_kg: z.number().min(0, 'El precio por kg extra debe ser mayor o igual a 0'),
  last_mile_base: z.number().min(0, 'El costo base de última milla debe ser mayor o igual a 0').default(1500),
  last_mile_per_kg: z.number().min(0, 'El costo por kg de última milla debe ser mayor o igual a 0').default(200),
  express_multiplier: z.number().min(1, 'El multiplicador express debe ser mayor o igual a 1').default(1.4),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional().nullable(),
}).refine(
  (data) => data.distance_max_km > data.distance_min_km,
  {
    message: 'La distancia máxima debe ser mayor que la distancia mínima',
    path: ['distance_max_km'],
  }
);

/**
 * Schema para actualizar una tarifa existente (solo si no está vigente aún)
 * Req 27.2, 27.16
 */
export const updateRateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  distance_min_km: z.number().int().min(0).optional(),
  distance_max_km: z.number().int().min(1).optional(),
  base_price: z.number().min(0).optional(),
  price_per_extra_kg: z.number().min(0).optional(),
  last_mile_base: z.number().min(0).optional(),
  last_mile_per_kg: z.number().min(0).optional(),
  express_multiplier: z.number().min(1).optional(),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional().nullable(),
});

export type CreateRateInput = z.infer<typeof createRateSchema>;
export type UpdateRateInput = z.infer<typeof updateRateSchema>;
