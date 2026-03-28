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

// POST /chat/:shipmentId/messages - Enviar mensaje
export async function sendChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (!content || !String(content).trim()) {
      res.status(400).json({ error: 'El contenido del mensaje es requerido' });
      return;
    }

    const shipmentResult = await pool.query(
      `SELECT id, sender_id, assigned_courier_id FROM shipments WHERE id = $1`,
      [shipmentId]
    );

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    const shipment = shipmentResult.rows[0];
    const isOwner = shipment.sender_id === userId;
    const isAdmin = userRole === 'admin';
    let isCourier = false;

    if (shipment.assigned_courier_id) {
      const courierCheck = await pool.query(
        `SELECT id FROM couriers WHERE id = $1 AND user_id = $2`,
        [shipment.assigned_courier_id, userId]
      );
      isCourier = courierCheck.rows.length > 0;
    }

    if (!isOwner && !isCourier && !isAdmin) {
      res.status(403).json({ error: 'No tienes permiso para enviar mensajes en este chat' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (shipment_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, shipment_id, sender_id, message, created_at`,
      [shipmentId, userId, String(content).trim()]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
}
