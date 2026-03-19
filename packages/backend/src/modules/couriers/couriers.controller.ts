import { Request, Response } from 'express';
import pool from '../../db/pool';

// GET /couriers/shipments - Listar envios asignados al repartidor
export async function getAssignedShipments(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== 'courier') {
      res.status(403).json({ error: 'Solo repartidores pueden acceder a esta funcionalidad' });
      return;
    }

    // Obtener ID del repartidor
    const courierResult = await pool.query(
      `SELECT id FROM couriers WHERE user_id = $1`,
      [userId]
    );

    if (courierResult.rows.length === 0) {
      res.status(404).json({ error: 'Repartidor no encontrado' });
      return;
    }

    const courierId = courierResult.rows[0].id;

    // Obtener envios asignados ordenados por prioridad y proximidad
    const shipmentsResult = await pool.query(
      `SELECT 
        s.id,
        s.tracking_code,
        s.origin_address,
        s.destination_address,
        s.destination_lat,
        s.destination_lng,
        s.service_type,
        s.status,
        s.scheduled_pickup_date,
        s.created_at,
        u.full_name as recipient_name,
        u.phone as recipient_phone,
        u.email as recipient_email
       FROM shipments s
       JOIN users u ON s.user_id = u.id
       WHERE s.courier_id = $1 
         AND s.status IN ('Asignado', 'En Camino', 'En Entrega')
       ORDER BY 
         CASE WHEN s.service_type = 'express' THEN 1 ELSE 2 END,
         s.scheduled_pickup_date ASC NULLS LAST,
         s.created_at ASC`,
      [courierId]
    );

    res.json({
      shipments: shipmentsResult.rows,
      total: shipmentsResult.rows.length,
    });

  } catch (error) {
    console.error('Error al obtener envios asignados:', error);
    res.status(500).json({ error: 'Error al obtener envios asignados' });
  }
}

// PATCH /couriers/availability - Actualizar disponibilidad del repartidor
export async function updateAvailability(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { isAvailable } = req.body;

    if (userRole !== 'courier') {
      res.status(403).json({ error: 'Solo repartidores pueden actualizar su disponibilidad' });
      return;
    }

    await pool.query(
      `UPDATE couriers SET is_available = $1 WHERE user_id = $2`,
      [isAvailable, userId]
    );

    res.json({
      message: 'Disponibilidad actualizada correctamente',
      isAvailable,
    });

  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    res.status(500).json({ error: 'Error al actualizar disponibilidad' });
  }
}
