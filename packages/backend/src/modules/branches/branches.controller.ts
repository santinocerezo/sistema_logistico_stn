/**
 * Controller público para sucursales
 * Permite a usuarios no autenticados ver sucursales activas
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * GET /branches — Listar sucursales activas (público)
 */
export async function getActiveBranches(_req: Request, res: Response): Promise<void> {
  try {
    // Obelisco: -34.6037, -58.3816 — ordenar por distancia ascendente
    const result = await pool.query(
      `SELECT id, name, address, lat, lng, schedule, is_active
       FROM branches
       WHERE is_active = true
       ORDER BY point(lat, lng) <-> point(-34.6037, -58.3816) ASC`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[getActiveBranches] Error:', error);
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
}
