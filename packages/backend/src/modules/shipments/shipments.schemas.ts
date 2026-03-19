/**
 * Schemas de validación para el módulo de envíos
 */

import { z } from 'zod';

/**
 * Schema para coordenadas GPS
 */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Schema para dimensiones de paquete
 */
export const packageDimensionsSchema = z.object({
  length_cm: z.number().positive(),
  width_cm: z.number().positive(),
  height_cm: z.number().positive(),
  weight_kg: z.number().positive(),
});

/**
 * Schema para cotización pública
 * Valida: Requerimientos 51.1, 51.2, 51.3
 */
export const quoteRequestSchema = z.object({
  origin: coordinatesSchema,
  shipmentType: z.enum(['S2S', 'S2D']),
  modality: z.enum(['Normal', 'Express']),
  dimensions: packageDimensionsSchema,
  // Para S2S: se requiere destino (coordenadas de sucursal)
  destination: coordinatesSchema.optional(),
  // Para S2D: se requiere destAddress (coordenadas del domicilio)
  destAddress: coordinatesSchema.optional(),
}).refine(
  (data) => {
    // Validar que S2S tenga destination
    if (data.shipmentType === 'S2S' && !data.destination) {
      return false;
    }
    // Validar que S2D tenga destAddress
    if (data.shipmentType === 'S2D' && !data.destAddress) {
      return false;
    }
    return true;
  },
  {
    message: 'S2S requiere destination, S2D requiere destAddress',
  }
);

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

/**
 * Schema para respuesta de cotización
 */
export const quoteResponseSchema = z.object({
  cost: z.number(),
  breakdown: z.object({
    distance_km: z.number(),
    volumetric_weight_kg: z.number(),
    effective_weight_kg: z.number(),
    base_cost: z.number(),
    last_mile_cost: z.number(),
    express_surcharge: z.number(),
    total_cost: z.number(),
  }),
  estimated_delivery_days: z.number().int().positive(),
  nearest_branch: coordinatesSchema.optional(),
});

export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

/**
 * Schema para crear un envío
 * Valida: Requerimientos 15.1-15.17
 */
export const createShipmentSchema = z.object({
  origin_branch_id: z.string().uuid(),
  dest_branch_id: z.string().uuid().optional(),
  dest_address: z.string().optional(),
  dest_lat: z.number().min(-90).max(90).optional(),
  dest_lng: z.number().min(-180).max(180).optional(),
  shipment_type: z.enum(['S2S', 'S2D']),
  modality: z.enum(['Normal', 'Express']),
  weight_kg: z.number().positive(),
  length_cm: z.number().positive(),
  width_cm: z.number().positive(),
  height_cm: z.number().positive(),
  content_type: z.enum(['estandar', 'fragil', 'perecedero', 'peligroso']),
  special_instructions: z.string().optional(),
  declared_value: z.number().nonnegative().optional(),
  has_insurance: z.boolean().optional(),
  promo_code: z.string().optional(),
  scheduled_pickup_at: z.string().datetime().optional(),
}).refine(
  (data) => {
    // S2S requiere dest_branch_id
    if (data.shipment_type === 'S2S' && !data.dest_branch_id) {
      return false;
    }
    // S2D requiere dest_address, dest_lat, dest_lng
    if (data.shipment_type === 'S2D' && (!data.dest_address || data.dest_lat === undefined || data.dest_lng === undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'S2S requiere dest_branch_id, S2D requiere dest_address, dest_lat y dest_lng',
  }
);

export type CreateShipmentRequest = z.infer<typeof createShipmentSchema>;
