import { Request, Response } from 'express';
import { pool } from '../../db/pool';
import { createRateSchema, updateRateSchema } from './rates.schemas';

/**
 * GET /admin/rates - Listar todas las tarifas con historial
 * Req 27.7
 */
export async function listRates(_req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT 
        id, name, distance_min_km, distance_max_km, 
        base_price, price_per_extra_kg, last_mile_base, last_mile_per_kg,
        express_multiplier, is_active, valid_from, valid_to, created_at
      FROM rates
      ORDER BY distance_min_km ASC, created_at DESC`
    );

    res.status(200).json({ rates: result.rows });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[listRates] Error:', e);
    res.status(500).json({ error: 'Error al obtener tarifas' });
  }
}

/**
 * GET /admin/rates/active - Obtener tarifas activas vigentes
 * Req 27.6
 */
export async function getActiveRates(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    const result = await pool.query(
      `SELECT 
        id, name, distance_min_km, distance_max_km, 
        base_price, price_per_extra_kg, last_mile_base, last_mile_per_kg,
        express_multiplier, valid_from, valid_to, created_at
      FROM rates
      WHERE is_active = true
        AND valid_from <= $1
        AND (valid_to IS NULL OR valid_to > $1)
      ORDER BY distance_min_km ASC`,
      [now]
    );

    res.status(200).json({ rates: result.rows });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[getActiveRates] Error:', e);
    res.status(500).json({ error: 'Error al obtener tarifas activas' });
  }
}

/**
 * POST /admin/rates - Crear nueva versión de tarifas
 * Req 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.16
 */
export async function createRate(req: Request, res: Response): Promise<void> {
  const parsed = createRateSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ 
      error: 'Datos inválidos', 
      details: parsed.error.flatten().fieldErrors 
    });
    return;
  }

  const data = parsed.data;
  const validFrom = data.valid_from ? new Date(data.valid_from) : new Date();
  const validTo = data.valid_to ? new Date(data.valid_to) : null;

  try {
    const result = await pool.query(
      `INSERT INTO rates (
        name, distance_min_km, distance_max_km, 
        base_price, price_per_extra_kg, last_mile_base, last_mile_per_kg,
        express_multiplier, is_active, valid_from, valid_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
      RETURNING 
        id, name, distance_min_km, distance_max_km, 
        base_price, price_per_extra_kg, last_mile_base, last_mile_per_kg,
        express_multiplier, is_active, valid_from, valid_to, created_at`,
      [
        data.name,
        data.distance_min_km,
        data.distance_max_km,
        data.base_price,
        data.price_per_extra_kg,
        data.last_mile_base,
        data.last_mile_per_kg,
        data.express_multiplier,
        validFrom,
        validTo,
      ]
    );

    res.status(201).json({ rate: result.rows[0] });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[createRate] Error:', e);
    res.status(500).json({ error: 'Error al crear tarifa' });
  }
}

/**
 * PUT /admin/rates/:id - Actualizar tarifa (solo si no está vigente aún)
 * Req 27.2, 27.16
 */
export async function updateRate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateRateSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ 
      error: 'Datos inválidos', 
      details: parsed.error.flatten().fieldErrors 
    });
    return;
  }

  try {
    // Verificar que la tarifa existe y no está vigente aún
    const checkResult = await pool.query(
      `SELECT id, valid_from FROM rates WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Tarifa no encontrada' });
      return;
    }

    const rate = checkResult.rows[0];
    const now = new Date();
    const validFrom = new Date(rate.valid_from);

    // Solo permitir actualizar si la fecha de vigencia es futura
    if (validFrom <= now) {
      res.status(403).json({ 
        error: 'No se puede modificar una tarifa que ya está vigente' 
      });
      return;
    }

    const data = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.distance_min_km !== undefined) {
      updates.push(`distance_min_km = $${paramIndex++}`);
      values.push(data.distance_min_km);
    }
    if (data.distance_max_km !== undefined) {
      updates.push(`distance_max_km = $${paramIndex++}`);
      values.push(data.distance_max_km);
    }
    if (data.base_price !== undefined) {
      updates.push(`base_price = $${paramIndex++}`);
      values.push(data.base_price);
    }
    if (data.price_per_extra_kg !== undefined) {
      updates.push(`price_per_extra_kg = $${paramIndex++}`);
      values.push(data.price_per_extra_kg);
    }
    if (data.last_mile_base !== undefined) {
      updates.push(`last_mile_base = $${paramIndex++}`);
      values.push(data.last_mile_base);
    }
    if (data.last_mile_per_kg !== undefined) {
      updates.push(`last_mile_per_kg = $${paramIndex++}`);
      values.push(data.last_mile_per_kg);
    }
    if (data.express_multiplier !== undefined) {
      updates.push(`express_multiplier = $${paramIndex++}`);
      values.push(data.express_multiplier);
    }
    if (data.valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex++}`);
      values.push(new Date(data.valid_from));
    }
    if (data.valid_to !== undefined) {
      updates.push(`valid_to = $${paramIndex++}`);
      values.push(data.valid_to ? new Date(data.valid_to) : null);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE rates 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, name, distance_min_km, distance_max_km, 
        base_price, price_per_extra_kg, last_mile_base, last_mile_per_kg,
        express_multiplier, is_active, valid_from, valid_to, created_at`,
      values
    );

    res.status(200).json({ rate: result.rows[0] });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[updateRate] Error:', e);
    res.status(500).json({ error: 'Error al actualizar tarifa' });
  }
}

/**
 * DELETE /admin/rates/:id - Desactivar tarifa (soft delete)
 * Req 27.2
 */
export async function deleteRate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE rates 
      SET is_active = false
      WHERE id = $1
      RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Tarifa no encontrada' });
      return;
    }

    res.status(200).json({ message: 'Tarifa desactivada correctamente' });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[deleteRate] Error:', e);
    res.status(500).json({ error: 'Error al desactivar tarifa' });
  }
}
