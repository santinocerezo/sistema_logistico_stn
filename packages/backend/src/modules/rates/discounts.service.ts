/**
 * Servicio de descuentos y códigos promocionales
 * Implementa descuentos por volumen y validación de códigos promocionales
 */

import type { Pool } from 'pg';

export interface VolumeDiscountLevel {
  min_shipments: number;
  discount_percentage: number;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'porcentaje' | 'monto_fijo';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: Date;
  valid_to: Date | null;
  is_active: boolean;
}

export interface DiscountResult {
  discount_amount: number;
  discount_type: 'volume' | 'promo_code' | 'none';
  discount_description: string;
}

/**
 * Niveles de descuento por volumen según requerimiento 29.3
 */
const VOLUME_DISCOUNT_LEVELS: VolumeDiscountLevel[] = [
  { min_shipments: 100, discount_percentage: 15 },
  { min_shipments: 50, discount_percentage: 10 },
  { min_shipments: 10, discount_percentage: 5 },
  { min_shipments: 0, discount_percentage: 0 },
];

/**
 * Calcula el nivel de descuento por volumen según envíos del último mes
 * @param userId ID del usuario
 * @param pool Pool de conexión a PostgreSQL
 * @returns Porcentaje de descuento (0, 5, 10 o 15)
 */
export async function calculateVolumeDiscount(
  userId: string,
  pool: Pool
): Promise<number> {
  // Contar envíos del último mes (30 días)
  const result = await pool.query(
    `SELECT COUNT(*) as shipment_count
     FROM shipments
     WHERE sender_id = $1
       AND created_at >= NOW() - INTERVAL '30 days'
       AND status != 'Cancelado'`,
    [userId]
  );

  const shipmentCount = parseInt(result.rows[0].shipment_count, 10);

  // Determinar nivel de descuento
  for (const level of VOLUME_DISCOUNT_LEVELS) {
    if (shipmentCount >= level.min_shipments) {
      return level.discount_percentage;
    }
  }

  return 0;
}

/**
 * Actualiza el nivel de descuento del usuario en la tabla users
 * @param userId ID del usuario
 * @param discountLevel Nivel de descuento (0, 5, 10 o 15)
 * @param pool Pool de conexión a PostgreSQL
 */
export async function updateUserDiscountLevel(
  userId: string,
  discountLevel: number,
  pool: Pool
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET discount_level = $1
     WHERE id = $2`,
    [discountLevel, userId]
  );
}

/**
 * Valida un código promocional
 * @param code Código promocional
 * @param pool Pool de conexión a PostgreSQL
 * @returns Código promocional si es válido, null si no
 */
export async function validatePromoCode(
  code: string,
  pool: Pool
): Promise<PromoCode | null> {
  const result = await pool.query(
    `SELECT id, code, discount_type, discount_value, max_uses, used_count,
            valid_from, valid_to, is_active
     FROM promo_codes
     WHERE code = $1`,
    [code.toUpperCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const promoCode: PromoCode = result.rows[0];

  // Validar que esté activo
  if (!promoCode.is_active) {
    return null;
  }

  // Validar fecha de inicio
  const now = new Date();
  if (promoCode.valid_from > now) {
    return null;
  }

  // Validar fecha de expiración
  if (promoCode.valid_to && promoCode.valid_to < now) {
    return null;
  }

  // Validar usos disponibles
  if (promoCode.max_uses !== null && promoCode.used_count >= promoCode.max_uses) {
    return null;
  }

  return promoCode;
}

/**
 * Incrementa el contador de usos de un código promocional
 * @param promoCodeId ID del código promocional
 * @param pool Pool de conexión a PostgreSQL
 */
export async function incrementPromoCodeUsage(
  promoCodeId: string,
  pool: Pool
): Promise<void> {
  await pool.query(
    `UPDATE promo_codes
     SET used_count = used_count + 1
     WHERE id = $1`,
    [promoCodeId]
  );
}

/**
 * Calcula el descuento total aplicable a un envío
 * @param userId ID del usuario
 * @param baseCost Costo base del envío (antes de descuentos)
 * @param promoCode Código promocional (opcional)
 * @param pool Pool de conexión a PostgreSQL
 * @returns Resultado del descuento
 */
export async function calculateDiscount(
  userId: string,
  baseCost: number,
  promoCode: string | null,
  pool: Pool
): Promise<DiscountResult> {
  // Calcular descuento por volumen
  const volumeDiscountPercentage = await calculateVolumeDiscount(userId, pool);
  const volumeDiscountAmount = (baseCost * volumeDiscountPercentage) / 100;

  // Si no hay código promocional, aplicar solo descuento por volumen
  if (!promoCode) {
    if (volumeDiscountAmount > 0) {
      return {
        discount_amount: volumeDiscountAmount,
        discount_type: 'volume',
        discount_description: `Descuento por volumen: ${volumeDiscountPercentage}%`,
      };
    }
    return {
      discount_amount: 0,
      discount_type: 'none',
      discount_description: 'Sin descuento',
    };
  }

  // Validar código promocional
  const validPromoCode = await validatePromoCode(promoCode, pool);
  if (!validPromoCode) {
    // Si el código es inválido, aplicar solo descuento por volumen
    if (volumeDiscountAmount > 0) {
      return {
        discount_amount: volumeDiscountAmount,
        discount_type: 'volume',
        discount_description: `Descuento por volumen: ${volumeDiscountPercentage}%`,
      };
    }
    return {
      discount_amount: 0,
      discount_type: 'none',
      discount_description: 'Código promocional inválido',
    };
  }

  // Calcular descuento del código promocional
  let promoDiscountAmount = 0;
  if (validPromoCode.discount_type === 'porcentaje') {
    promoDiscountAmount = (baseCost * validPromoCode.discount_value) / 100;
  } else {
    promoDiscountAmount = validPromoCode.discount_value;
  }

  // Aplicar el mayor descuento (volumen vs código promocional)
  if (promoDiscountAmount > volumeDiscountAmount) {
    return {
      discount_amount: promoDiscountAmount,
      discount_type: 'promo_code',
      discount_description: `Código promocional: ${validPromoCode.code}`,
    };
  } else {
    return {
      discount_amount: volumeDiscountAmount,
      discount_type: 'volume',
      discount_description: `Descuento por volumen: ${volumeDiscountPercentage}%`,
    };
  }
}
