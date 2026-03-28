/**
 * Controller para incidencias, reclamaciones y tickets
 * Valida: Requerimientos 48.1-52.12
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * POST /incidents — Reportar incidencia
 * Valida: Requerimientos 48.1-48.9, 50.1-50.5
 */
export async function createIncident(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { shipment_id, type, description } = req.body;
    const userId = (req as any).user.userId;

    if (!shipment_id || !type || !description) {
      res.status(400).json({ error: 'Envío, tipo y descripción son requeridos' });
      return;
    }

    await client.query('BEGIN');

    // Verificar que el envío existe y pertenece al usuario
    const shipmentResult = await client.query(
      'SELECT * FROM shipments WHERE id = $1 AND sender_id = $2',
      [shipment_id, userId]
    );

    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    // Determinar si es crítica
    const isCritical = type === 'paquete_perdido';

    // Generar número de incidencia
    const incidentNumber = `INC${Date.now()}`;

    // Crear incidencia
    const result = await client.query(
      `INSERT INTO incidents 
       (incident_number, shipment_id, reported_by, type, description, status, is_critical, is_auto_generated)
       VALUES ($1, $2, $3, $4, $5, 'abierto', $6, false)
       RETURNING *`,
      [incidentNumber, shipment_id, userId, type, description, isCritical]
    );

    // Marcar envío con bandera de incidencia
    await client.query(
      'UPDATE shipments SET incident_flag = true WHERE id = $1',
      [shipment_id]
    );

    await client.query('COMMIT');

    // TODO: Notificar al administrador si es crítica (tarea 13.2)

    res.status(201).json({
      message: 'Incidencia reportada exitosamente',
      incident: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[createIncident] Error:', error);
    res.status(500).json({ error: 'Error al reportar incidencia' });
  } finally {
    client.release();
  }
}


/**
 * GET /incidents — Listar incidencias del usuario
 */
export async function listIncidents(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.*, s.tracking_code
      FROM incidents i
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE i.reported_by = $1
    `;
    
    const params: any[] = [userId];

    if (status) {
      query += ` AND i.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      incidents: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[listIncidents] Error:', error);
    res.status(500).json({ error: 'Error al listar incidencias' });
  }
}

/**
 * POST /claims — Crear reclamación formal
 * Valida: Requerimientos 49.1-49.9
 */
export async function createClaim(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { incident_id, description, claimed_amount } = req.body;
    const userId = (req as any).user.userId;

    if (!incident_id || !description) {
      res.status(400).json({ error: 'Incidencia y descripción son requeridos' });
      return;
    }

    await client.query('BEGIN');

    // Verificar que la incidencia existe y pertenece al usuario
    const incidentResult = await client.query(
      'SELECT * FROM incidents WHERE id = $1 AND reported_by = $2',
      [incident_id, userId]
    );

    if (incidentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Incidencia no encontrada' });
      return;
    }

    // Generar número de reclamación
    const claimNumber = `CLM${Date.now()}`;

    // Crear reclamación
    const result = await client.query(
      `INSERT INTO claims 
       (claim_number, incident_id, user_id, description, claimed_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'pendiente')
       RETURNING *`,
      [claimNumber, incident_id, userId, description, claimed_amount || 0]
    );

    await client.query('COMMIT');

    // TODO: Notificar al administrador (tarea 13.2)

    res.status(201).json({
      message: 'Reclamación creada exitosamente',
      claim: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[createClaim] Error:', error);
    res.status(500).json({ error: 'Error al crear reclamación' });
  } finally {
    client.release();
  }
}

/**
 * GET /claims — Listar reclamaciones del usuario
 */
export async function listClaims(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT c.*, i.incident_number, s.tracking_code
      FROM claims c
      LEFT JOIN incidents i ON c.incident_id = i.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE c.user_id = $1
    `;
    
    const params: any[] = [userId];

    if (status) {
      query += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      claims: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[listClaims] Error:', error);
    res.status(500).json({ error: 'Error al listar reclamaciones' });
  }
}

/**
 * PATCH /admin/claims/:id/resolve — Resolver reclamación (admin)
 * Valida: Requerimientos 49.1-49.9
 */
export async function resolveClaim(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { approved_amount, admin_notes, status } = req.body;
    const adminId = (req as any).user.userId;

    if (!status || !['aprobada', 'rechazada'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido. Debe ser "aprobada" o "rechazada"' });
      return;
    }

    await client.query('BEGIN');

    // Obtener reclamación
    const claimResult = await client.query(
      'SELECT * FROM claims WHERE id = $1',
      [id]
    );

    if (claimResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Reclamación no encontrada' });
      return;
    }

    const claim = claimResult.rows[0];

    // Actualizar reclamación
    await client.query(
      `UPDATE claims 
       SET status = $1, approved_amount = $2, admin_notes = $3, resolved_at = NOW()
       WHERE id = $4`,
      [status, approved_amount || 0, admin_notes, id]
    );

    // Si es aprobada, acreditar compensación al usuario
    if (status === 'aprobada' && approved_amount > 0) {
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [approved_amount, claim.user_id]
      );

      // Obtener nuevo saldo
      const balanceResult = await client.query(
        'SELECT balance FROM users WHERE id = $1',
        [claim.user_id]
      );

      // Registrar transacción
      await client.query(
        `INSERT INTO transactions 
         (user_id, type, amount, balance_after, concept, status)
         VALUES ($1, 'compensacion', $2, $3, $4, 'completado')`,
        [
          claim.user_id,
          approved_amount,
          parseFloat(balanceResult.rows[0].balance),
          `Compensación por reclamación ${claim.claim_number}`,
        ]
      );
    }

    // Registrar en audit_logs
    await client.query(
      `INSERT INTO audit_logs 
       (actor_id, actor_role, action, entity_type, entity_id, after_data, ip_address)
       VALUES ($1, 'admin', 'resolve_claim', 'claim', $2, $3, $4)`,
      [adminId, id, JSON.stringify({ status, approved_amount, admin_notes }), (req as any).ip || 'unknown']
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Reclamación resuelta exitosamente',
      claim_id: id,
      status,
      approved_amount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[resolveClaim] Error:', error);
    res.status(500).json({ error: 'Error al resolver reclamación' });
  } finally {
    client.release();
  }
}

/**
 * POST /tickets — Crear ticket de soporte
 * Valida: Requerimientos 52.1-52.12
 */
export async function createTicket(req: Request, res: Response): Promise<void> {
  try {
    const { shipment_id, subject, description } = req.body;
    const userId = (req as any).user.userId;

    if (!subject || !description) {
      res.status(400).json({ error: 'Asunto y descripción son requeridos' });
      return;
    }

    // Generar número de ticket
    const ticketNumber = `TKT${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO support_tickets 
       (ticket_number, user_id, shipment_id, subject, description, status, priority)
       VALUES ($1, $2, $3, $4, $5, 'abierto', 'normal')
       RETURNING *`,
      [ticketNumber, userId, shipment_id || null, subject, description]
    );

    res.status(201).json({
      message: 'Ticket creado exitosamente',
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error('[createTicket] Error:', error);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
}

/**
 * GET /tickets — Listar tickets del usuario
 */
export async function listTickets(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, s.tracking_code
      FROM support_tickets t
      LEFT JOIN shipments s ON t.shipment_id = s.id
      WHERE t.user_id = $1
    `;
    
    const params: any[] = [userId];

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      tickets: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[listTickets] Error:', error);
    res.status(500).json({ error: 'Error al listar tickets' });
  }
}

/**
 * GET /admin/tickets — Listar todos los tickets (admin)
 */
export async function listAllTickets(req: Request, res: Response): Promise<void> {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, u.email as user_email, u.full_name as user_name, s.tracking_code
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN shipments s ON t.shipment_id = s.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND t.priority = $${params.length + 1}`;
      params.push(priority);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      tickets: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[listAllTickets] Error:', error);
    res.status(500).json({ error: 'Error al listar tickets' });
  }
}

/**
 * PATCH /admin/tickets/:id — Actualizar ticket (admin)
 */
export async function updateTicket(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ticket no encontrado' });
      return;
    }

    // TODO: Notificar al usuario si hay respuesta (tarea 13.2)

    res.status(200).json({
      message: 'Ticket actualizado exitosamente',
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error('[updateTicket] Error:', error);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
}
