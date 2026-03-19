/**
 * Controlador para gestión de códigos promocionales (Admin)
 */

import type { Request, Response } from 'express';
import { pool } from '../../db/pool';
import { z } from 'zod';

// Schema de validación para crear código promocional
const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(50).transform(val => val.toUpperCase()),
  discount_type: z.enum(['porcentaje', 'monto_fijo']),
  discount_value: z.number().positive(),
  max_uses: z.number().int().positive().nullable().optional(),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().nullable().optional(),
});

// Schema de validación para actualizar código promocional
const updatePromoCodeSchema = z.object({
  discount_type: z.enum(['porcentaje', 'monto_fijo']).optional(),
  discount_value: z.number().positive().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Crear un nuevo código promocional
 * POST /admin/promo-codes
 */
export async function createPromoCode(req: Request, res: Response): Promise<void> {
  try {
    const data = createPromoCodeSchema.parse(req.body);

    // Verificar que el código no exista
    const existingCode = await pool.query(
      'SELECT id FROM promo_codes WHERE code = $1',
      [data.code]
    );

    if (existingCode.rows.length > 0) {
      res.status(409).json({ error: 'El código promocional ya existe' });
      return;
    }

    // Validar que discount_value sea apropiado según el tipo
    if (data.discount_type === 'porcentaje' && data.discount_value > 100) {
      res.status(400).json({ error: 'El porcentaje de descuento no puede ser mayor a 100' });
      return;
    }

    // Crear código promocional
    const result = await pool.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.code,
        data.discount_type,
        data.discount_value,
        data.max_uses || null,
        data.valid_from || new Date(),
        data.valid_to || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error al crear código promocional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Listar todos los códigos promocionales
 * GET /admin/promo-codes
 */
export async function listPromoCodes(req: Request, res: Response): Promise<void> {
  try {
    const { is_active } = req.query;

    let query = 'SELECT * FROM promo_codes';
    const params: any[] = [];

    if (is_active !== undefined) {
      query += ' WHERE is_active = $1';
      params.push(is_active === 'true');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar códigos promocionales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Obtener un código promocional por ID
 * GET /admin/promo-codes/:id
 */
export async function getPromoCode(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM promo_codes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Código promocional no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener código promocional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Actualizar un código promocional
 * PATCH /admin/promo-codes/:id
 */
export async function updatePromoCode(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = updatePromoCodeSchema.parse(req.body);

    // Verificar que el código existe
    const existing = await pool.query(
      'SELECT * FROM promo_codes WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Código promocional no encontrado' });
      return;
    }

    // Validar discount_value si se proporciona
    if (data.discount_type === 'porcentaje' && data.discount_value && data.discount_value > 100) {
      res.status(400).json({ error: 'El porcentaje de descuento no puede ser mayor a 100' });
      return;
    }

    // Construir query de actualización dinámica
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.discount_type !== undefined) {
      updates.push(`discount_type = $${paramIndex++}`);
      values.push(data.discount_type);
    }
    if (data.discount_value !== undefined) {
      updates.push(`discount_value = $${paramIndex++}`);
      values.push(data.discount_value);
    }
    if (data.max_uses !== undefined) {
      updates.push(`max_uses = $${paramIndex++}`);
      values.push(data.max_uses);
    }
    if (data.valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex++}`);
      values.push(data.valid_from);
    }
    if (data.valid_to !== undefined) {
      updates.push(`valid_to = $${paramIndex++}`);
      values.push(data.valid_to);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      return;
    }

    values.push(id);
    const query = `UPDATE promo_codes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error al actualizar código promocional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Eliminar (desactivar) un código promocional
 * DELETE /admin/promo-codes/:id
 */
export async function deletePromoCode(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE promo_codes SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Código promocional no encontrado' });
      return;
    }

    res.json({ message: 'Código promocional desactivado exitosamente', promo_code: result.rows[0] });
  } catch (error) {
    console.error('Error al eliminar código promocional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
