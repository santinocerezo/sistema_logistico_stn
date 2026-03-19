/**
 * Controller para perfil de usuario y libreta de direcciones
 * Valida: Requerimientos 9.1-9.8, 18.1-18.6
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';
import bcrypt from 'bcrypt';

/**
 * GET /profile — Obtener perfil del usuario
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      'SELECT id, email, full_name, phone, avatar_url, balance, discount_level, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('[getProfile] Error:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

/**
 * PATCH /profile — Actualizar perfil del usuario
 * Valida: Requerimientos 9.1-9.8
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { full_name, phone, avatar_url, current_password, new_password } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Actualizar nombre
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }

    // Actualizar teléfono con validación
    if (phone !== undefined) {
      // Validación básica de formato de teléfono
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(phone)) {
        res.status(400).json({ error: 'Formato de teléfono inválido' });
        return;
      }
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }

    // Actualizar foto de perfil
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatar_url);
    }

    // Cambiar contraseña
    if (current_password && new_password) {
      // Verificar contraseña actual
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
      
      if (!isValid) {
        res.status(401).json({ error: 'Contraseña actual incorrecta' });
        return;
      }

      // Validar nueva contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(new_password)) {
        res.status(400).json({
          error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial',
        });
        return;
      }

      const password_hash = await bcrypt.hash(new_password, 12);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(password_hash);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, phone, avatar_url`;
    const result = await pool.query(query, values);

    res.status(200).json({
      message: 'Perfil actualizado exitosamente',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('[updateProfile] Error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
}

/**
 * POST /addresses — Crear dirección en libreta
 * Valida: Requerimientos 18.1-18.6
 */
export async function createAddress(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { label, address, lat, lng, is_favorite } = req.body;

    if (!label || !address || !lat || !lng) {
      res.status(400).json({ error: 'Etiqueta, dirección y coordenadas son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO address_book (user_id, label, address, lat, lng, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, label, address, lat, lng, is_favorite || false]
    );

    res.status(201).json({
      message: 'Dirección guardada exitosamente',
      address: result.rows[0],
    });
  } catch (error) {
    console.error('[createAddress] Error:', error);
    res.status(500).json({ error: 'Error al guardar dirección' });
  }
}

/**
 * GET /addresses — Listar direcciones del usuario
 */
export async function listAddresses(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      'SELECT * FROM address_book WHERE user_id = $1 ORDER BY is_favorite DESC, created_at DESC',
      [userId]
    );

    res.status(200).json({
      addresses: result.rows,
    });
  } catch (error) {
    console.error('[listAddresses] Error:', error);
    res.status(500).json({ error: 'Error al listar direcciones' });
  }
}

/**
 * PATCH /addresses/:id — Actualizar dirección
 */
export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { label, address, lat, lng, is_favorite } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(label);
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }

    if (lat !== undefined) {
      updates.push(`lat = $${paramIndex++}`);
      values.push(lat);
    }

    if (lng !== undefined) {
      updates.push(`lng = $${paramIndex++}`);
      values.push(lng);
    }

    if (is_favorite !== undefined) {
      updates.push(`is_favorite = $${paramIndex++}`);
      values.push(is_favorite);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id, userId);
    const query = `UPDATE address_book SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Dirección no encontrada' });
      return;
    }

    res.status(200).json({
      message: 'Dirección actualizada exitosamente',
      address: result.rows[0],
    });
  } catch (error) {
    console.error('[updateAddress] Error:', error);
    res.status(500).json({ error: 'Error al actualizar dirección' });
  }
}

/**
 * DELETE /addresses/:id — Eliminar dirección
 */
export async function deleteAddress(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await pool.query(
      'DELETE FROM address_book WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Dirección no encontrada' });
      return;
    }

    res.status(200).json({
      message: 'Dirección eliminada exitosamente',
    });
  } catch (error) {
    console.error('[deleteAddress] Error:', error);
    res.status(500).json({ error: 'Error al eliminar dirección' });
  }
}
