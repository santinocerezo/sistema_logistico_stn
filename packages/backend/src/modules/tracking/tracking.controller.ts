/**
 * Controller para el módulo de rastreo GPS
 * Valida: Requerimientos 20.1-20.4, 42.6-42.11, 43.1-43.5, 44.1-44.11
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * Calcula distancia Haversine entre dos puntos GPS
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * POST /shipments/:id/delivery/confirm — Confirmar entrega con evidencias
 * Valida: Requerimientos 44.1-44.11
 */
export async function confirmDelivery(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      verification_code,
      signature_url,
      photo_url,
      receiver_name,
      receiver_relation,
      location_lat,
      location_lng,
    } = req.body;
    
    const courierId = (req as any).user.id;

    // Validar que al menos una evidencia esté presente
    if (!verification_code && !signature_url && !photo_url) {
      res.status(400).json({
        error: 'Se requiere al menos una evidencia de entrega (código, firma o foto)',
      });
      return;
    }

    await client.query('BEGIN');

    // Obtener envío
    const shipmentResult = await client.query(
      'SELECT * FROM shipments WHERE id = $1 AND assigned_courier_id = $2',
      [id, courierId]
    );

    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Envío no encontrado o no asignado a este repartidor' });
      return;
    }

    const shipment = shipmentResult.rows[0];

    // Validar código de verificación si se proporciona
    if (verification_code && verification_code !== shipment.verification_code) {
      await client.query('ROLLBACK');
      res.status(401).json({ error: 'Código de verificación incorrecto' });
      return;
    }

    // Validar estado actual
    if (shipment.status !== 'En Entrega') {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: 'El envío debe estar en estado "En Entrega" para confirmar la entrega',
        current_status: shipment.status,
      });
      return;
    }

    // Actualizar estado a Entregado
    await client.query(
      'UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2',
      ['Entregado', id]
    );

    // Registrar en historial
    await client.query(
      `INSERT INTO shipment_status_history 
       (shipment_id, from_status, to_status, changed_by, changed_by_role, location_lat, location_lng, notes)
       VALUES ($1, 'En Entrega', 'Entregado', $2, 'courier', $3, $4, 'Entrega confirmada')`,
      [id, courierId, location_lat, location_lng]
    );

    // Guardar evidencias
    if (signature_url) {
      await client.query(
        `INSERT INTO delivery_evidences 
         (shipment_id, evidence_type, file_url, receiver_name, receiver_relation, location_lat, location_lng)
         VALUES ($1, 'firma', $2, $3, $4, $5, $6)`,
        [id, signature_url, receiver_name, receiver_relation, location_lat, location_lng]
      );
    }

    if (photo_url) {
      await client.query(
        `INSERT INTO delivery_evidences 
         (shipment_id, evidence_type, file_url, receiver_name, receiver_relation, location_lat, location_lng)
         VALUES ($1, 'foto', $2, $3, $4, $5, $6)`,
        [id, photo_url, receiver_name, receiver_relation, location_lat, location_lng]
      );
    }

    if (verification_code) {
      await client.query(
        `INSERT INTO delivery_evidences 
         (shipment_id, evidence_type, receiver_name, receiver_relation, location_lat, location_lng)
         VALUES ($1, 'codigo', $2, $3, $4, $5)`,
        [id, receiver_name, receiver_relation, location_lat, location_lng]
      );
    }

    await client.query('COMMIT');

    // TODO: Enviar notificación al usuario (tarea 13.2)

    res.status(200).json({
      message: 'Entrega confirmada exitosamente',
      shipment_id: id,
      status: 'Entregado',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[confirmDelivery] Error:', error);
    res.status(500).json({ error: 'Error al confirmar entrega' });
  } finally {
    client.release();
  }
}

/**
 * POST /shipments/:id/delivery/fail — Registrar entrega fallida
 * Valida: Requerimientos 42.6-42.11, 58.3, 58.6, 58.7, 50.6
 */
export async function failDelivery(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      failure_reason,
      photo_url,
      location_lat,
      location_lng,
    } = req.body;
    
    const courierId = (req as any).user.id;

    if (!failure_reason) {
      res.status(400).json({ error: 'El motivo de no entrega es requerido' });
      return;
    }

    await client.query('BEGIN');

    // Obtener envío
    const shipmentResult = await client.query(
      'SELECT * FROM shipments WHERE id = $1 AND assigned_courier_id = $2',
      [id, courierId]
    );

    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Envío no encontrado o no asignado a este repartidor' });
      return;
    }

    const shipment = shipmentResult.rows[0];

    // Validar estado actual
    if (shipment.status !== 'En Entrega') {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: 'El envío debe estar en estado "En Entrega" para registrar entrega fallida',
        current_status: shipment.status,
      });
      return;
    }

    // Validar geolocalización (máximo 200m del destino)
    if (location_lat && location_lng && shipment.dest_lat && shipment.dest_lng) {
      const distance = haversineDistance(
        location_lat,
        location_lng,
        parseFloat(shipment.dest_lat),
        parseFloat(shipment.dest_lng)
      );

      if (distance > 0.2) {
        await client.query('ROLLBACK');
        res.status(403).json({
          error: 'Debe estar a menos de 200 metros del destino para registrar entrega fallida',
          distance_km: distance,
          max_distance_km: 0.2,
        });
        return;
      }
    }

    // Validar foto obligatoria
    if (!photo_url) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'La foto del domicilio es obligatoria para entrega fallida' });
      return;
    }

    // Incrementar contador de intentos
    const newAttempts = (shipment.delivery_attempts || 0) + 1;
    
    await client.query(
      'UPDATE shipments SET delivery_attempts = $1, updated_at = NOW() WHERE id = $2',
      [newAttempts, id]
    );

    // Determinar nuevo estado
    let newStatus = 'Entrega_Fallida';
    let notes = `Intento ${newAttempts} fallido: ${failure_reason}`;
    
    if (newAttempts >= 3) {
      newStatus = 'Devuelto_a_Sucursal';
      notes = `Tercer intento fallido. Devuelto a sucursal: ${failure_reason}`;
      
      // Crear incidencia crítica automática
      await client.query(
        `INSERT INTO incidents 
         (incident_number, shipment_id, reported_by, type, description, status, is_critical, is_auto_generated)
         VALUES ($1, $2, $3, 'entrega_fallida', $4, 'abierto', true, true)`,
        [
          `INC${Date.now()}`,
          id,
          courierId,
          `Envío devuelto a sucursal tras 3 intentos fallidos. Último motivo: ${failure_reason}`,
        ]
      );
    }

    // Actualizar estado
    await client.query(
      'UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    );

    // Registrar en historial
    await client.query(
      `INSERT INTO shipment_status_history 
       (shipment_id, from_status, to_status, changed_by, changed_by_role, location_lat, location_lng, notes)
       VALUES ($1, 'En Entrega', $2, $3, 'courier', $4, $5, $6)`,
      [id, newStatus, courierId, location_lat, location_lng, notes]
    );

    // Guardar evidencia de entrega fallida
    await client.query(
      `INSERT INTO delivery_evidences 
       (shipment_id, evidence_type, file_url, failure_reason, location_lat, location_lng)
       VALUES ($1, 'entrega_fallida', $2, $3, $4, $5)`,
      [id, photo_url, failure_reason, location_lat, location_lng]
    );

    await client.query('COMMIT');

    // TODO: Enviar notificación al usuario (tarea 13.2)

    res.status(200).json({
      message: newAttempts >= 3 
        ? 'Envío devuelto a sucursal tras 3 intentos fallidos'
        : 'Entrega fallida registrada',
      shipment_id: id,
      status: newStatus,
      delivery_attempts: newAttempts,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[failDelivery] Error:', error);
    res.status(500).json({ error: 'Error al registrar entrega fallida' });
  } finally {
    client.release();
  }
}

/**
 * GET /tracking/:shipmentId/live — Ubicación actual del repartidor
 * Valida: Requerimientos 20.1-20.4, 43.1-43.5
 */
export async function getLiveLocation(req: Request, res: Response): Promise<void> {
  try {
    const { shipmentId } = req.params;
    const userId = (req as any).user.id;

    // Verificar que el envío pertenece al usuario
    const shipmentResult = await pool.query(
      'SELECT * FROM shipments WHERE id = $1 AND sender_id = $2',
      [shipmentId, userId]
    );

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    const shipment = shipmentResult.rows[0];

    if (!shipment.assigned_courier_id) {
      res.status(404).json({ error: 'No hay repartidor asignado a este envío' });
      return;
    }

    // Obtener ubicación del repartidor
    const courierResult = await pool.query(
      'SELECT current_lat, current_lng, location_updated_at FROM couriers WHERE id = $1',
      [shipment.assigned_courier_id]
    );

    if (courierResult.rows.length === 0) {
      res.status(404).json({ error: 'Repartidor no encontrado' });
      return;
    }

    const courier = courierResult.rows[0];

    // Calcular ETA si el envío está en entrega
    let eta_minutes = null;
    if (shipment.status === 'En Entrega' && courier.current_lat && courier.current_lng) {
      const distance = haversineDistance(
        parseFloat(courier.current_lat),
        parseFloat(courier.current_lng),
        parseFloat(shipment.dest_lat || shipment.dest_branch_id),
        parseFloat(shipment.dest_lng || 0)
      );
      
      // Velocidad promedio: 30 km/h
      eta_minutes = Math.ceil((distance / 30) * 60);
    }

    res.status(200).json({
      courier_location: {
        lat: courier.current_lat,
        lng: courier.current_lng,
        last_updated: courier.location_updated_at,
      },
      eta_minutes,
    });
  } catch (error) {
    console.error('[getLiveLocation] Error:', error);
    res.status(500).json({ error: 'Error al obtener ubicación' });
  }
}
