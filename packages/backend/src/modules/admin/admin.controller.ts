/**
 * Controller para el módulo de administración
 * Valida: Requerimientos 23.1-25.6, 36.1-38.6, 41.1-41.6
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * GET /admin/shipments — Buscar todos los envíos
 * Valida: Requerimientos 23.1-23.4
 */
export async function searchAllShipments(req: Request, res: Response): Promise<void> {
  try {
    const { tracking_code, user_email, destination, status, branch_id, start_date, end_date, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT s.*, 
             u.email as sender_email, u.full_name as sender_name,
             ob.name as origin_branch_name,
             db.name as dest_branch_name,
             c.full_name as courier_name
      FROM shipments s
      LEFT JOIN users u ON s.sender_id = u.id
      LEFT JOIN branches ob ON s.origin_branch_id = ob.id
      LEFT JOIN branches db ON s.dest_branch_id = db.id
      LEFT JOIN couriers c ON s.assigned_courier_id = c.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (tracking_code) {
      query += ` AND s.tracking_code ILIKE $${params.length + 1}`;
      params.push(`%${tracking_code}%`);
    }

    if (user_email) {
      query += ` AND u.email ILIKE $${params.length + 1}`;
      params.push(`%${user_email}%`);
    }

    if (destination) {
      query += ` AND s.dest_address ILIKE $${params.length + 1}`;
      params.push(`%${destination}%`);
    }

    if (status) {
      query += ` AND s.status = $${params.length + 1}`;
      params.push(status);
    }

    if (branch_id) {
      query += ` AND (s.origin_branch_id = $${params.length + 1} OR s.dest_branch_id = $${params.length + 1})`;
      params.push(branch_id);
    }

    if (start_date) {
      query += ` AND s.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND s.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      shipments: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[searchAllShipments] Error:', error);
    res.status(500).json({ error: 'Error al buscar envíos' });
  }
}

/**
 * PATCH /admin/shipments/:id — Modificar envío
 * Valida: Requerimientos 24.1-24.5
 */
export async function updateShipment(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { dest_address, dest_lat, dest_lng, weight_kg, length_cm, width_cm, height_cm, special_instructions, status } = req.body;
    const adminId = (req as any).user.id;

    await client.query('BEGIN');

    // Obtener envío actual
    const shipmentResult = await client.query('SELECT * FROM shipments WHERE id = $1', [id]);
    
    if (shipmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Envío no encontrado' });
      return;
    }

    const oldData = shipmentResult.rows[0];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dest_address !== undefined) {
      updates.push(`dest_address = $${paramIndex++}`);
      values.push(dest_address);
    }

    if (dest_lat !== undefined) {
      updates.push(`dest_lat = $${paramIndex++}`);
      values.push(dest_lat);
    }

    if (dest_lng !== undefined) {
      updates.push(`dest_lng = $${paramIndex++}`);
      values.push(dest_lng);
    }

    if (weight_kg !== undefined) {
      updates.push(`weight_kg = $${paramIndex++}`);
      values.push(weight_kg);
    }

    if (length_cm !== undefined) {
      updates.push(`length_cm = $${paramIndex++}`);
      values.push(length_cm);
    }

    if (width_cm !== undefined) {
      updates.push(`width_cm = $${paramIndex++}`);
      values.push(width_cm);
    }

    if (height_cm !== undefined) {
      updates.push(`height_cm = $${paramIndex++}`);
      values.push(height_cm);
    }

    if (special_instructions !== undefined) {
      updates.push(`special_instructions = $${paramIndex++}`);
      values.push(special_instructions);
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE shipments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await client.query(query, values);

    // Registrar en audit_logs
    await client.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES ($1, 'admin', 'update_shipment', 'shipment', $2, $3, $4, $5)`,
      [adminId, id, JSON.stringify(oldData), JSON.stringify(result.rows[0]), (req as any).ip || 'unknown']
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Envío actualizado exitosamente',
      shipment: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateShipment] Error:', error);
    res.status(500).json({ error: 'Error al actualizar envío' });
  } finally {
    client.release();
  }
}

/**
 * GET /admin/users — Listar usuarios
 * Valida: Requerimientos 25.1-25.6
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const { email, role, is_active, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT id, email, full_name, phone, role, balance, is_active, discount_level, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (email) {
      query += ` AND email ILIKE $${params.length + 1}`;
      params.push(`%${email}%`);
    }

    if (role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      users: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[listUsers] Error:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

/**
 * PATCH /admin/users/:id — Modificar usuario
 * Valida: Requerimientos 25.1-25.6
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { balance, full_name, phone, is_active, role } = req.body;
    const adminId = (req as any).user.id;

    await client.query('BEGIN');

    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const oldData = userResult.rows[0];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (balance !== undefined) {
      updates.push(`balance = $${paramIndex++}`);
      values.push(balance);
    }

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, phone, role, balance, is_active`;
    const result = await client.query(query, values);

    // Registrar en audit_logs
    await client.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES ($1, 'admin', 'update_user', 'user', $2, $3, $4, $5)`,
      [adminId, id, JSON.stringify(oldData), JSON.stringify(result.rows[0]), (req as any).ip || 'unknown']
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      user: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[updateUser] Error:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  } finally {
    client.release();
  }
}

/**
 * POST /admin/branches — Crear sucursal
 * Valida: Requerimientos 36.1-36.5
 */
export async function createBranch(req: Request, res: Response): Promise<void> {
  try {
    const { name, address, lat, lng, schedule } = req.body;

    if (!name || !address || !lat || !lng) {
      res.status(400).json({ error: 'Nombre, dirección y coordenadas son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO branches (name, address, lat, lng, schedule, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [name, address, lat, lng, schedule || 'Lun-Vie 9:00-18:00']
    );

    res.status(201).json({
      message: 'Sucursal creada exitosamente',
      branch: result.rows[0],
    });
  } catch (error) {
    console.error('[createBranch] Error:', error);
    res.status(500).json({ error: 'Error al crear sucursal' });
  }
}

/**
 * GET /admin/branches — Listar sucursales
 */
export async function listBranches(req: Request, res: Response): Promise<void> {
  try {
    const { is_active } = req.query;

    let query = 'SELECT * FROM branches WHERE 1=1';
    const params: any[] = [];

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    res.status(200).json({
      branches: result.rows,
    });
  } catch (error) {
    console.error('[listBranches] Error:', error);
    res.status(500).json({ error: 'Error al listar sucursales' });
  }
}

/**
 * PATCH /admin/branches/:id — Actualizar sucursal
 */
export async function updateBranch(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, address, lat, lng, schedule, is_active } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
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

    if (schedule !== undefined) {
      updates.push(`schedule = $${paramIndex++}`);
      values.push(schedule);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    const query = `UPDATE branches SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }

    res.status(200).json({
      message: 'Sucursal actualizada exitosamente',
      branch: result.rows[0],
    });
  } catch (error) {
    console.error('[updateBranch] Error:', error);
    res.status(500).json({ error: 'Error al actualizar sucursal' });
  }
}

/**
 * POST /admin/couriers — Registrar repartidor
 * Valida: Requerimientos 37.1-37.5
 */
export async function createCourier(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name || !phone) {
      res.status(400).json({ error: 'Todos los campos son requeridos' });
      return;
    }

    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO couriers (email, password_hash, full_name, phone, is_active, is_available)
       VALUES ($1, $2, $3, $4, true, false)
       RETURNING id, email, full_name, phone, is_active, is_available, created_at`,
      [email, password_hash, full_name, phone]
    );

    res.status(201).json({
      message: 'Repartidor registrado exitosamente',
      courier: result.rows[0],
    });
  } catch (error) {
    console.error('[createCourier] Error:', error);
    
    if ((error as any).code === '23505') {
      res.status(409).json({ error: 'El email ya está registrado' });
    } else {
      res.status(500).json({ error: 'Error al registrar repartidor' });
    }
  }
}

/**
 * GET /admin/couriers — Listar repartidores
 */
export async function listCouriers(req: Request, res: Response): Promise<void> {
  try {
    const { is_active, is_available } = req.query;

    let query = 'SELECT id, email, full_name, phone, is_active, is_available, current_lat, current_lng, location_updated_at, created_at FROM couriers WHERE 1=1';
    const params: any[] = [];

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    if (is_available !== undefined) {
      query += ` AND is_available = $${params.length + 1}`;
      params.push(is_available === 'true');
    }

    query += ' ORDER BY full_name ASC';

    const result = await pool.query(query, params);

    res.status(200).json({
      couriers: result.rows,
    });
  } catch (error) {
    console.error('[listCouriers] Error:', error);
    res.status(500).json({ error: 'Error al listar repartidores' });
  }
}

/**
 * PATCH /admin/couriers/:id — Actualizar repartidor
 */
export async function updateCourier(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { full_name, phone, is_active, is_available } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (is_available !== undefined) {
      updates.push(`is_available = $${paramIndex++}`);
      values.push(is_available);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    values.push(id);
    const query = `UPDATE couriers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, phone, is_active, is_available`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Repartidor no encontrado' });
      return;
    }

    res.status(200).json({
      message: 'Repartidor actualizado exitosamente',
      courier: result.rows[0],
    });
  } catch (error) {
    console.error('[updateCourier] Error:', error);
    res.status(500).json({ error: 'Error al actualizar repartidor' });
  }
}

/**
 * POST /admin/shipments/:id/assign — Asignar repartidor a envío
 * Valida: Requerimientos 41.1-41.6
 */
export async function assignCourier(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { courier_id } = req.body;
    const adminId = (req as any).user.id;

    if (!courier_id) {
      res.status(400).json({ error: 'ID de repartidor requerido' });
      return;
    }

    await client.query('BEGIN');

    // Verificar que el envío existe y está en estado válido
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

    if (shipment.status !== 'En Sucursal') {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: 'Solo se pueden asignar envíos en estado "En Sucursal"',
        current_status: shipment.status,
      });
      return;
    }

    // Verificar que el repartidor existe y está disponible
    const courierResult = await client.query(
      'SELECT * FROM couriers WHERE id = $1 AND is_active = true AND is_available = true',
      [courier_id]
    );

    if (courierResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Repartidor no encontrado o no disponible' });
      return;
    }

    // Asignar repartidor y cambiar estado
    await client.query(
      'UPDATE shipments SET assigned_courier_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [courier_id, 'Asignado', id]
    );

    // Registrar en historial
    await client.query(
      `INSERT INTO shipment_status_history 
       (shipment_id, from_status, to_status, changed_by, changed_by_role, notes)
       VALUES ($1, 'En Sucursal', 'Asignado', $2, 'admin', $3)`,
      [id, adminId, `Asignado a repartidor ${courierResult.rows[0].full_name}`]
    );

    await client.query('COMMIT');

    // TODO: Notificar al repartidor (tarea 13.2)

    res.status(200).json({
      message: 'Repartidor asignado exitosamente',
      shipment_id: id,
      courier: courierResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[assignCourier] Error:', error);
    res.status(500).json({ error: 'Error al asignar repartidor' });
  } finally {
    client.release();
  }
}

/**
 * GET /admin/audit-logs — Ver logs de auditoría
 * Valida: Requerimientos 4.1-4.7
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { actor_id, action, entity_type, start_date, end_date, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT al.*, u.email as actor_email, u.full_name as actor_name
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (actor_id) {
      query += ` AND al.actor_id = $${params.length + 1}`;
      params.push(actor_id);
    }

    if (action) {
      query += ` AND al.action = $${params.length + 1}`;
      params.push(action);
    }

    if (entity_type) {
      query += ` AND al.entity_type = $${params.length + 1}`;
      params.push(entity_type);
    }

    if (start_date) {
      query += ` AND al.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND al.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      logs: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[getAuditLogs] Error:', error);
    res.status(500).json({ error: 'Error al obtener logs de auditoría' });
  }
}
