/**
 * Controller público para sucursales
 * Permite a usuarios no autenticados ver sucursales activas
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * GET /branches — Listar sucursales activas (público)
 */
export async function getActiveBranches(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT id, name, address, lat, lng, schedule FROM branches WHERE is_active = true ORDER BY name ASC'
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[getActiveBranches] Error:', error);
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
}
