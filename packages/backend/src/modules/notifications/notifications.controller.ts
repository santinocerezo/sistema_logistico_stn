import { Request, Response } from 'express';
import pool from '../../db/pool';

// GET /notifications - Obtener notificaciones del usuario
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total, 
              COUNT(*) FILTER (WHERE is_read = false) as unread
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      unread: parseInt(countResult.rows[0].unread),
    });

  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
}

// PATCH /notifications/:id/read - Marcar notificacion como leida
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notificacion no encontrada' });
      return;
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al marcar notificacion como leida:', error);
    res.status(500).json({ error: 'Error al marcar notificacion como leida' });
  }
}

// PATCH /notifications/read-all - Marcar todas como leidas
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;

    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ message: 'Todas las notificaciones marcadas como leidas' });

  } catch (error) {
    console.error('Error al marcar todas como leidas:', error);
    res.status(500).json({ error: 'Error al marcar todas como leidas' });
  }
}

// PUT /notifications/preferences - Actualizar preferencias de notificaciones
export async function updatePreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { preferences } = req.body;

    // Verificar si ya existen preferencias
    const existingResult = await pool.query(
      `SELECT id FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    if (existingResult.rows.length === 0) {
      // Crear nuevas preferencias
      await pool.query(
        `INSERT INTO notification_preferences (user_id, preferences)
         VALUES ($1, $2)`,
        [userId, JSON.stringify(preferences)]
      );
    } else {
      // Actualizar preferencias existentes
      await pool.query(
        `UPDATE notification_preferences
         SET preferences = $1
         WHERE user_id = $2`,
        [JSON.stringify(preferences), userId]
      );
    }

    res.json({ message: 'Preferencias actualizadas correctamente', preferences });

  } catch (error) {
    console.error('Error al actualizar preferencias:', error);
    res.status(500).json({ error: 'Error al actualizar preferencias' });
  }
}

// GET /notifications/preferences - Obtener preferencias
export async function getPreferences(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;

    const result = await pool.query(
      `SELECT preferences FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Devolver preferencias por defecto
      res.json({
        preferences: {
          email: { shipment_status: true, incidents: true, promotions: false },
          push: { shipment_status: true, incidents: true, promotions: false },
          sms: { shipment_status: false, incidents: true, promotions: false },
        },
      });
      return;
    }

    res.json({ preferences: result.rows[0].preferences });

  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    res.status(500).json({ error: 'Error al obtener preferencias' });
  }
}
