/**
 * Controller para el módulo de envíos
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';
import { 
  quoteRequestSchema, 
  createShipmentSchema,
  type QuoteRequest, 
  type QuoteResponse 
} from './shipments.schemas';
import {
  calculateShipmentCost,
  findNearestBranch,
} from '../rates/rates.service';
import type { Coordinates } from '../rates/rates.types';
import { calculateDiscount, incrementPromoCodeUsage } from '../rates/discounts.service';
import crypto from 'crypto';

/**
 * Calcula el tiempo de entrega estimado según distancia y modalidad
 * Normal: 1 día por cada 300 km (mínimo 1 día, máximo 7 días)
 * Express: 1 día por cada 600 km (mínimo 1 día, máximo 4 días)
 */
function calculateEstimatedDeliveryDays(distance_km: number, modality: 'Normal' | 'Express'): number {
  if (modality === 'Express') {
    const days = Math.ceil(distance_km / 600);
    return Math.max(1, Math.min(days, 4));
  } else {
    const days = Math.ceil(distance_km / 300);
    return Math.max(1, Math.min(days, 7));
  }
}

/**
 * POST /shipments/quote — Cotización pública sin autenticación
 * Valida: Requerimientos 51.1, 51.2, 51.3, 15.17
 * Rate limit: 10 req/hora por IP (Req 6.4)
 */
export async function getPublicQuote(req: Request, res: Response): Promise<void> {
  try {
    // Validar entrada
    const validation = quoteRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: validation.error.errors,
      });
      return;
    }

    const quoteData: QuoteRequest = validation.data;

    // Obtener sucursales activas de la base de datos (necesario para S2D)
    let branches: Coordinates[] = [];
    
    if (quoteData.shipmentType === 'S2D') {
      const branchesResult = await pool.query(
        'SELECT lat, lng FROM branches WHERE is_active = true'
      );
      
      if (branchesResult.rows.length === 0) {
        res.status(503).json({
          error: 'No hay sucursales disponibles en este momento',
        });
        return;
      }
      
      branches = branchesResult.rows.map((row) => ({
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
      }));
    }

    // Calcular costo usando el servicio de tarifas
    const rateInput = {
      origin: quoteData.origin,
      destination: quoteData.destination || null,
      destAddress: quoteData.destAddress,
      shipmentType: quoteData.shipmentType,
      modality: quoteData.modality,
      dimensions: quoteData.dimensions,
    };

    const breakdown = calculateShipmentCost(rateInput, branches);

    // Calcular tiempo de entrega estimado
    const estimated_delivery_days = calculateEstimatedDeliveryDays(
      breakdown.distance_km,
      quoteData.modality
    );

    // Para S2D, calcular sucursal más cercana
    let nearest_branch: Coordinates | undefined;
    if (quoteData.shipmentType === 'S2D' && quoteData.destAddress) {
      nearest_branch = findNearestBranch(quoteData.destAddress, branches);
    }

    const response: QuoteResponse = {
      cost: breakdown.total_cost,
      breakdown,
      estimated_delivery_days,
      nearest_branch,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('[getPublicQuote] Error:', error);
    
    if (error instanceof Error) {
      res.status(500).json({
        error: 'Error al calcular cotización',
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Error interno del servidor',
      });
    }
  }
}

/**
 * Genera un código de seguimiento único
 */
function generateTrackingCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `STN${timestamp}${random}`;
}

/**
 * Genera un código de verificación de 6 dígitos
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Mapa de transiciones válidas de estado
 * Valida: Requerimientos 10.2, 10.3, 10.4, 10.5
 */
const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
  'Pendiente': ['En_Sucursal', 'Cancelado'],
  'En_Sucursal': ['Asignado', 'Cancelado'],
  'Asignado': ['En_Camino'],
  'En_Camino': ['En_Entrega'],
  'En_Entrega': ['Entregado', 'Entrega_Fallida'],
  'Entrega_Fallida': ['En_Entrega', 'Devuelto_a_Sucursal'],
  'Entregado': [],
  'Devuelto_a_Sucursal': [],
  'Cancelado': [],
};

/**
 * PATCH /shipments/:id/status — Actualizar estado de envío
 * Valida: Requerimientos 10.1-10.8
 */
export async function updateShipmentStatus(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { new_status, notes, location_lat, location_lng } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (!new_status) {
      res.status(400).json({ error: 'El nuevo estado es requerido' });
      return;
    }

    await client.query('BEGIN');

    // Obtener envío actual
    const shipmentResult = await client.query(
      'SELECT * FROM shipments WHERE id = $1',
      [id]
    );

    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    const shipment = shipmentResult.rows[0];
    const currentStatus = shipment.status;

    // Validar transición de estado
    const validTransitions = VALID_STATE_TRANSITIONS[currentStatus] || [];
    
    if (!validTransitions.includes(new_status)) {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: `Transición de estado no permitida: ${currentStatus} → ${new_status}`,
        current_status: currentStatus,
        valid_transitions: validTransitions,
      });
      return;
    }

    // Actualizar estado del envío
    await client.query(
      'UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2',
      [new_status, id]
    );

    // Registrar en historial de estados
    await client.query(
      `INSERT INTO shipment_status_history 
       (shipment_id, from_status, to_status, changed_by, changed_by_role, location_lat, location_lng, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, currentStatus, new_status, userId, userRole, location_lat || null, location_lng || null, notes || null]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Estado actualizado exitosamente',
      shipment_id: id,
      previous_status: currentStatus,
      new_status,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateShipmentStatus] Error:', error);
    res.status(500).json({ error: 'Error al actualizar estado del envío' });
  } finally {
    client.release();
  }
}

/**
 * POST /shipments — Crear un nuevo envío
 * Valida: Requerimientos 15.1-15.17
 */
export async function createShipment(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Validar entrada
    const validation = createShipmentSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: validation.error.errors,
      });
      return;
    }

    const shipmentData = validation.data;
    const userId = (req as any).user.userId; // ID del usuario autenticado

    // Iniciar transacción
    await client.query('BEGIN');

    // 1. Validar que la sucursal de origen esté activa
    const originBranch = await client.query(
      'SELECT id, lat, lng FROM branches WHERE id = $1 AND is_active = true',
      [shipmentData.origin_branch_id]
    );

    if (originBranch.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'La sucursal de origen no está activa' });
      return;
    }

    const origin: Coordinates = {
      lat: parseFloat(originBranch.rows[0].lat),
      lng: parseFloat(originBranch.rows[0].lng),
    };

    // 2. Obtener sucursales activas (necesario para S2D)
    let branches: Coordinates[] = [];
    let destBranchId: string | null = null;
    let destLat: number | null = null;
    let destLng: number | null = null;
    let destAddress: string | null = null;

    if (shipmentData.shipment_type === 'S2D') {
      const branchesResult = await client.query(
        'SELECT id, lat, lng FROM branches WHERE is_active = true'
      );
      
      branches = branchesResult.rows.map((row) => ({
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
      }));

      // Encontrar sucursal más cercana al domicilio
      const destCoords: Coordinates = {
        lat: shipmentData.dest_lat!,
        lng: shipmentData.dest_lng!,
      };
      
      const nearestBranch = findNearestBranch(destCoords, branches);
      
      // Buscar el ID de la sucursal más cercana
      const nearestBranchRecord = branchesResult.rows.find(
        (row) => parseFloat(row.lat) === nearestBranch.lat && parseFloat(row.lng) === nearestBranch.lng
      );
      
      destBranchId = nearestBranchRecord?.id || null;
      destLat = shipmentData.dest_lat!;
      destLng = shipmentData.dest_lng!;
      destAddress = shipmentData.dest_address!;
    } else {
      // S2S: validar sucursal de destino
      const destBranch = await client.query(
        'SELECT id, lat, lng FROM branches WHERE id = $1 AND is_active = true',
        [shipmentData.dest_branch_id]
      );

      if (destBranch.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'La sucursal de destino no está activa' });
        return;
      }

      destBranchId = destBranch.rows[0].id;
    }

    // 3. Calcular costo del envío
    const destination = shipmentData.shipment_type === 'S2S' 
      ? { lat: parseFloat((await client.query('SELECT lat, lng FROM branches WHERE id = $1', [destBranchId])).rows[0].lat), 
          lng: parseFloat((await client.query('SELECT lat, lng FROM branches WHERE id = $1', [destBranchId])).rows[0].lng) }
      : null;

    const rateInput = {
      origin,
      destination,
      destAddress: shipmentData.shipment_type === 'S2D' ? { lat: destLat!, lng: destLng! } : undefined,
      shipmentType: shipmentData.shipment_type,
      modality: shipmentData.modality,
      dimensions: {
        length_cm: shipmentData.length_cm,
        width_cm: shipmentData.width_cm,
        height_cm: shipmentData.height_cm,
        weight_kg: shipmentData.weight_kg,
      },
    };

    const breakdown = calculateShipmentCost(rateInput, branches.length > 0 ? branches : undefined);

    // 4. Calcular seguro si aplica
    let insuranceCost = 0;
    if (shipmentData.has_insurance && shipmentData.declared_value) {
      // Seguro: 2% del valor declarado (mínimo $100)
      insuranceCost = Math.max(100, shipmentData.declared_value * 0.02);
    }

    // 5. Calcular descuentos
    const discountResult = await calculateDiscount(
      userId,
      breakdown.total_cost + insuranceCost,
      shipmentData.promo_code || null,
      client
    );

    // 6. Calcular costo total
    const totalCost = breakdown.total_cost + insuranceCost - discountResult.discount_amount;

    // 7. Verificar saldo suficiente
    const userBalance = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );

    const currentBalance = parseFloat(userBalance.rows[0].balance);

    if (currentBalance < totalCost) {
      await client.query('ROLLBACK');
      res.status(422).json({
        error: 'Saldo insuficiente',
        required: totalCost,
        available: currentBalance,
      });
      return;
    }

    // 8. Generar códigos únicos
    const trackingCode = generateTrackingCode();
    const verificationCode = generateVerificationCode();

    // 9. Calcular fecha estimada de entrega
    const estimatedDeliveryDays = calculateEstimatedDeliveryDays(breakdown.distance_km, shipmentData.modality);
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + estimatedDeliveryDays);

    // 10. Crear envío
    const shipmentResult = await client.query(
      `INSERT INTO shipments (
        tracking_code, verification_code, sender_id, origin_branch_id, dest_branch_id,
        dest_address, dest_lat, dest_lng, shipment_type, modality,
        weight_kg, length_cm, width_cm, height_cm, content_type,
        special_instructions, declared_value, has_insurance, insurance_cost,
        base_cost, last_mile_cost, express_surcharge, discount_amount, total_cost,
        scheduled_pickup_at, estimated_delivery_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *`,
      [
        trackingCode, verificationCode, userId, shipmentData.origin_branch_id, destBranchId,
        destAddress, destLat, destLng, shipmentData.shipment_type, shipmentData.modality,
        shipmentData.weight_kg, shipmentData.length_cm, shipmentData.width_cm, shipmentData.height_cm,
        shipmentData.content_type, shipmentData.special_instructions || null,
        shipmentData.declared_value || 0, shipmentData.has_insurance || false, insuranceCost,
        breakdown.base_cost, breakdown.last_mile_cost, breakdown.express_surcharge,
        discountResult.discount_amount, totalCost,
        shipmentData.scheduled_pickup_at || null, estimatedDeliveryAt,
      ]
    );

    // 11. Deducir saldo del usuario
    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [totalCost, userId]
    );

    // 12. Registrar transacción
    await client.query(
      `INSERT INTO transactions (user_id, shipment_id, type, amount, balance_after, concept, status)
       VALUES ($1, $2, 'pago_envio', $3, $4, $5, 'completado')`,
      [
        userId,
        shipmentResult.rows[0].id,
        totalCost,
        currentBalance - totalCost,
        `Pago de envío ${trackingCode}`,
      ]
    );

    // 13. Incrementar uso de código promocional si aplica
    if (discountResult.discount_type === 'promo_code' && shipmentData.promo_code) {
      const promoCodeRecord = await client.query(
        'SELECT id FROM promo_codes WHERE code = $1',
        [shipmentData.promo_code.toUpperCase()]
      );
      
      if (promoCodeRecord.rows.length > 0) {
        await incrementPromoCodeUsage(promoCodeRecord.rows[0].id, client);
      }
    }

    // 14. Registrar historial de estado inicial
    await client.query(
      `INSERT INTO shipment_status_history (shipment_id, from_status, to_status, changed_by, changed_by_role)
       VALUES ($1, NULL, 'Pendiente', $2, 'user')`,
      [shipmentResult.rows[0].id, userId]
    );

    // Commit de la transacción
    await client.query('COMMIT');

    // TODO: Enviar email con tracking_code y verification_code (tarea 13.2)

    res.status(201).json({
      message: 'Envío creado exitosamente',
      shipment: {
        id: shipmentResult.rows[0].id,
        tracking_code: trackingCode,
        verification_code: verificationCode,
        total_cost: totalCost,
        discount_applied: discountResult.discount_amount,
        discount_description: discountResult.discount_description,
        estimated_delivery_at: estimatedDeliveryAt,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[createShipment] Error:', error);
    
    if (error instanceof Error) {
      res.status(500).json({
        error: 'Error al crear envío',
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Error interno del servidor',
      });
    }
  } finally {
    client.release();
  }
}


/**
 * GET /shipments — Listar envíos del usuario autenticado
 * Valida: Requerimientos 11.1, 11.2, 11.3, 11.4
 */
export async function listUserShipments(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT s.*, 
             ob.name as origin_branch_name, 
             db.name as dest_branch_name
      FROM shipments s
      LEFT JOIN branches ob ON s.origin_branch_id = ob.id
      LEFT JOIN branches db ON s.dest_branch_id = db.id
      WHERE s.sender_id = $1
    `;
    
    const params: any[] = [userId];

    if (status) {
      query += ` AND s.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      shipments: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[listUserShipments] Error:', error);
    res.status(500).json({ error: 'Error al listar envíos' });
  }
}

/**
 * GET /shipments/:trackingCode — Obtener detalle de envío por código de seguimiento
 * Valida: Requerimientos 12.1-12.6
 */
export async function getShipmentByTrackingCode(req: Request, res: Response): Promise<void> {
  try {
    const { trackingCode } = req.params;
    const userId = (req as any).user.userId;

    // Obtener envío
    const shipmentResult = await pool.query(
      `SELECT s.*, 
              ob.name as origin_branch_name, ob.address as origin_branch_address,
              db.name as dest_branch_name, db.address as dest_branch_address
       FROM shipments s
       LEFT JOIN branches ob ON s.origin_branch_id = ob.id
       LEFT JOIN branches db ON s.dest_branch_id = db.id
       WHERE s.tracking_code = $1 AND s.sender_id = $2`,
      [trackingCode, userId]
    );

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ error: 'Envío no encontrado o no pertenece al usuario' });
      return;
    }

    // Obtener historial de estados
    const historyResult = await pool.query(
      `SELECT * FROM shipment_status_history 
       WHERE shipment_id = $1 
       ORDER BY created_at ASC`,
      [shipmentResult.rows[0].id]
    );

    res.status(200).json({
      shipment: shipmentResult.rows[0],
      status_history: historyResult.rows,
    });
  } catch (error) {
    console.error('[getShipmentByTrackingCode] Error:', error);
    res.status(500).json({ error: 'Error al obtener detalle del envío' });
  }
}

/**
 * POST /shipments/:id/cancel — Cancelar envío
 * Valida: Requerimientos 47.1-47.13
 */
export async function cancelShipment(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    await client.query('BEGIN');

    // Obtener envío
    const shipmentResult = await client.query(
      'SELECT * FROM shipments WHERE id = $1 AND sender_id = $2',
      [id, userId]
    );

    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    const shipment = shipmentResult.rows[0];
    const currentStatus = shipment.status;

    // Validar que el estado permita cancelación
    const allowedStatuses = ['Pendiente', 'En_Sucursal'];
    
    if (!allowedStatuses.includes(currentStatus)) {
      await client.query('ROLLBACK');
      res.status(403).json({
        error: 'No se puede cancelar el envío en su estado actual',
        current_status: currentStatus,
        allowed_statuses: allowedStatuses,
      });
      return;
    }

    // Actualizar estado a Cancelado
    await client.query(
      'UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2',
      ['Cancelado', id]
    );

    // Registrar en historial
    await client.query(
      `INSERT INTO shipment_status_history 
       (shipment_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, $2, 'Cancelado', $3, 'user', 'Cancelado por el usuario')`,
      [id, currentStatus, userId]
    );

    // Reembolsar costo completo al usuario
    const refundAmount = parseFloat(shipment.total_cost);
    
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [refundAmount, userId]
    );

    // Obtener nuevo saldo
    const balanceResult = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    const newBalance = parseFloat(balanceResult.rows[0].balance);

    // Registrar transacción de reembolso
    await client.query(
      `INSERT INTO transactions (user_id, shipment_id, type, amount, balance_after, concept, status)
       VALUES ($1, $2, 'reembolso', $3, $4, $5, 'completado')`,
      [userId, id, refundAmount, newBalance, `Reembolso por cancelación de envío ${shipment.tracking_code}`]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Envío cancelado exitosamente',
      refund_amount: refundAmount,
      new_balance: newBalance,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[cancelShipment] Error:', error);
    res.status(500).json({ error: 'Error al cancelar envío' });
  } finally {
    client.release();
  }
}

/**
 * GET /shipments/track/:trackingCode — Seguimiento público sin autenticación
 */
export async function getPublicShipmentTracking(req: Request, res: Response): Promise<void> {
  try {
    const { trackingCode } = req.params;

    const shipmentResult = await pool.query(
      `SELECT s.tracking_code, s.status, s.shipment_type, s.modality,
              s.dest_address, s.weight_kg, s.total_cost, s.created_at,
              s.estimated_delivery_at,
              ob.name as origin_branch_name,
              db.name as dest_branch_name
       FROM shipments s
       LEFT JOIN branches ob ON s.origin_branch_id = ob.id
       LEFT JOIN branches db ON s.dest_branch_id = db.id
       WHERE s.tracking_code = $1`,
      [trackingCode]
    );

    if (shipmentResult.rows.length === 0) {
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    const historyResult = await pool.query(
      `SELECT from_status, to_status, notes, created_at
       FROM shipment_status_history
       WHERE shipment_id = (SELECT id FROM shipments WHERE tracking_code = $1)
       ORDER BY created_at ASC`,
      [trackingCode]
    );

    res.status(200).json({
      shipment: shipmentResult.rows[0],
      status_history: historyResult.rows,
    });
  } catch (error) {
    console.error('[getPublicShipmentTracking] Error:', error);
    res.status(500).json({ error: 'Error al obtener seguimiento' });
  }
}
