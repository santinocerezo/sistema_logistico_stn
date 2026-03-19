import pool from '../../db/pool';
import { queueNotification } from './notifications.queue';

interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

// Crear notificacion y enviarla via WebSocket + cola
export async function createNotification(
  data: NotificationData,
  io?: any
): Promise<void> {
  try {
    const { userId, type, title, message, relatedEntityType, relatedEntityId } = data;

    // Guardar notificacion en la base de datos
    const result = await pool.query(
      `INSERT INTO notifications (
        user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
       RETURNING *`,
      [userId, type, title, message, relatedEntityType, relatedEntityId]
    );

    const notification = result.rows[0];

    // Enviar via WebSocket si esta disponible
    if (io) {
      io.to(`notifications:${userId}`).emit('notification:new', notification);
    }

    // Determinar canales segun tipo de notificacion
    const channels = getChannelsForNotificationType(type);

    // Agregar a cola para envio por email/SMS/push
    await queueNotification({
      userId,
      type,
      title,
      message,
      channels,
      relatedEntityType,
      relatedEntityId,
    });

  } catch (error) {
    console.error('Error al crear notificacion:', error);
    throw error;
  }
}

// Determinar canales segun tipo de notificacion
function getChannelsForNotificationType(type: string): ('email' | 'sms' | 'push')[] {
  const criticalTypes = [
    'shipment_delivered',
    'shipment_failed',
    'shipment_returned',
    'incident_critical',
  ];

  if (criticalTypes.includes(type)) {
    return ['email', 'sms', 'push'];
  }

  return ['email', 'push'];
}

// Notificar cambio de estado de envio
export async function notifyShipmentStatusChange(
  shipmentId: number,
  newStatus: string,
  io?: any
): Promise<void> {
  try {
    const shipmentResult = await pool.query(
      `SELECT user_id, tracking_code FROM shipments WHERE id = $1`,
      [shipmentId]
    );

    if (shipmentResult.rows.length === 0) {
      return;
    }

    const { user_id, tracking_code } = shipmentResult.rows[0];

    const statusMessages: Record<string, string> = {
      'Pendiente': 'Tu envio ha sido creado y esta pendiente de procesamiento',
      'En Sucursal': 'Tu envio ha llegado a la sucursal',
      'Asignado': 'Tu envio ha sido asignado a un repartidor',
      'En Camino': 'Tu envio esta en camino',
      'En Entrega': 'Tu envio esta siendo entregado',
      'Entregado': 'Tu envio ha sido entregado exitosamente',
      'Entrega_Fallida': 'No se pudo entregar tu envio',
      'Devuelto_a_Sucursal': 'Tu envio ha sido devuelto a la sucursal',
      'Cancelado': 'Tu envio ha sido cancelado',
    };

    await createNotification({
      userId: user_id,
      type: 'shipment_status',
      title: `Envio ${tracking_code}`,
      message: statusMessages[newStatus] || `Estado actualizado a: ${newStatus}`,
      relatedEntityType: 'shipment',
      relatedEntityId: shipmentId,
    }, io);

  } catch (error) {
    console.error('Error al notificar cambio de estado:', error);
  }
}

// Notificar recarga de saldo exitosa
export async function notifyBalanceTopup(
  userId: number,
  amount: number,
  io?: any
): Promise<void> {
  try {
    await createNotification({
      userId,
      type: 'balance_topup',
      title: 'Recarga exitosa',
      message: `Se han acreditado $${amount.toFixed(2)} a tu cuenta`,
    }, io);
  } catch (error) {
    console.error('Error al notificar recarga:', error);
  }
}

// Notificar creacion de incidencia
export async function notifyIncidentCreated(
  shipmentId: number,
  incidentType: string,
  io?: any
): Promise<void> {
  try {
    const shipmentResult = await pool.query(
      `SELECT user_id, tracking_code FROM shipments WHERE id = $1`,
      [shipmentId]
    );

    if (shipmentResult.rows.length === 0) {
      return;
    }

    const { user_id, tracking_code } = shipmentResult.rows[0];

    await createNotification({
      userId: user_id,
      type: 'incident',
      title: 'Incidencia reportada',
      message: `Se ha reportado una incidencia (${incidentType}) en tu envio ${tracking_code}`,
      relatedEntityType: 'shipment',
      relatedEntityId: shipmentId,
    }, io);

  } catch (error) {
    console.error('Error al notificar incidencia:', error);
  }
}
