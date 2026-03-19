import { Request, Response } from 'express';
import pool from '../../db/pool';

// GET /chat/:shipmentId/messages - Obtener historial de mensajes del chat
export async function getChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Verificar que el usuario tiene acceso al envio
    const shipmentResult = await pool.query(
      `SELECT id, user_id, courier_id, status
       FROM shipments
       WHERE id = $1`,
      [shipmentId]
    );

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ error: 'Envio no encontrado' });
      return;
    }

    const shipment = shipmentResult.rows[0];

    // Verificar permisos
    const isOwner = shipment.user_id === userId;
    const isCourier = shipment.courier_id && await pool.query(
      `SELECT id FROM couriers WHERE id = $1 AND user_id = $2`,
      [shipment.courier_id, userId]
    ).then(r => r.rows.length > 0);
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isCourier && !isAdmin) {
      res.status(403).json({ error: 'No tienes permiso para ver este chat' });
      return;
    }

    // Obtener mensajes
    const messagesResult = await pool.query(
      `SELECT 
        cm.id,
        cm.shipment_id,
        cm.sender_id,
        cm.message,
        cm.created_at,
        u.full_name as sender_name,
        u.role as sender_role
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.shipment_id = $1
       ORDER BY cm.created_at ASC`,
      [shipmentId]
    );

    res.json({
      shipmentId: parseInt(shipmentId),
      messages: messagesResult.rows,
    });

  } catch (error) {
    console.error('Error al obtener historial de chat:', error);
    res.status(500).json({ error: 'Error al obtener historial de chat' });
  }
}
