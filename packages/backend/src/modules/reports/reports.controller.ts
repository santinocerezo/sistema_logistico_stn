/**
 * Controller para reportes y dashboard
 * Valida: Requerimientos 30.1-32.6
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';

/**
 * GET /reports/dashboard — Métricas en tiempo real
 * Valida: Requerimientos 30.1-30.8, 50.5
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { start_date, end_date } = req.query;

    // Envíos por período
    const shipmentsQuery = `
      SELECT 
        COUNT(*) as total_shipments,
        COUNT(CASE WHEN status = 'Entregado' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'En Entrega' THEN 1 END) as in_delivery,
        COUNT(CASE WHEN status = 'Pendiente' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as cancelled
      FROM shipments
      WHERE created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($2::timestamp, NOW())
    `;
    
    const shipmentsResult = await pool.query(shipmentsQuery, [start_date || null, end_date || null]);

    // Ingresos
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE type = 'pago_envio'
        AND created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($2::timestamp, NOW())
    `;
    
    const revenueResult = await pool.query(revenueQuery, [start_date || null, end_date || null]);

    // Usuarios activos
    const usersQuery = `
      SELECT COUNT(DISTINCT sender_id) as active_users
      FROM shipments
      WHERE created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($2::timestamp, NOW())
    `;
    
    const usersResult = await pool.query(usersQuery, [start_date || null, end_date || null]);

    // Incidencias críticas
    const incidentsQuery = `
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN is_critical = true THEN 1 END) as critical_incidents
      FROM incidents
      WHERE status = 'abierto'
    `;
    
    const incidentsResult = await pool.query(incidentsQuery);

    // Tiempo promedio de entrega
    const avgTimeQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_delivery_hours
      FROM shipments
      WHERE status = 'Entregado'
        AND created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($2::timestamp, NOW())
    `;
    
    const avgTimeResult = await pool.query(avgTimeQuery, [start_date || null, end_date || null]);

    res.status(200).json({
      shipments: shipmentsResult.rows[0],
      revenue: revenueResult.rows[0],
      active_users: usersResult.rows[0].active_users,
      incidents: incidentsResult.rows[0],
      avg_delivery_hours: parseFloat(avgTimeResult.rows[0].avg_delivery_hours || 0).toFixed(2),
    });
  } catch (error) {
    console.error('[getDashboard] Error:', error);
    res.status(500).json({ error: 'Error al obtener métricas del dashboard' });
  }
}

/**
 * GET /reports/couriers/:id/performance — Desempeño de repartidor
 * Valida: Requerimientos 31.1-31.6
 */
export async function getCourierPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Entregas completadas
    const deliveriesQuery = `
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'Entregado' THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN status = 'Entrega_Fallida' THEN 1 END) as failed_deliveries
      FROM shipments
      WHERE assigned_courier_id = $1
        AND created_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($3::timestamp, NOW())
    `;
    
    const deliveriesResult = await pool.query(deliveriesQuery, [id, start_date || null, end_date || null]);

    // Tiempo promedio de entrega
    const avgTimeQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_delivery_hours
      FROM shipments
      WHERE assigned_courier_id = $1
        AND status = 'Entregado'
        AND created_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($3::timestamp, NOW())
    `;
    
    const avgTimeResult = await pool.query(avgTimeQuery, [id, start_date || null, end_date || null]);

    // Porcentaje a tiempo (estimado vs real)
    const onTimeQuery = `
      SELECT 
        COUNT(CASE WHEN updated_at <= estimated_delivery_at THEN 1 END) as on_time,
        COUNT(*) as total
      FROM shipments
      WHERE assigned_courier_id = $1
        AND status = 'Entregado'
        AND created_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($3::timestamp, NOW())
    `;
    
    const onTimeResult = await pool.query(onTimeQuery, [id, start_date || null, end_date || null]);

    // Incidencias
    const incidentsQuery = `
      SELECT COUNT(*) as total_incidents
      FROM incidents
      WHERE shipment_id IN (
        SELECT id FROM shipments WHERE assigned_courier_id = $1
      )
      AND created_at >= COALESCE($2::timestamp, NOW() - INTERVAL '30 days')
      AND created_at <= COALESCE($3::timestamp, NOW())
    `;
    
    const incidentsResult = await pool.query(incidentsQuery, [id, start_date || null, end_date || null]);

    const onTimePercentage = onTimeResult.rows[0].total > 0
      ? ((onTimeResult.rows[0].on_time / onTimeResult.rows[0].total) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      courier_id: id,
      deliveries: deliveriesResult.rows[0],
      avg_delivery_hours: parseFloat(avgTimeResult.rows[0].avg_delivery_hours || 0).toFixed(2),
      on_time_percentage: onTimePercentage,
      incidents: incidentsResult.rows[0].total_incidents,
    });
  } catch (error) {
    console.error('[getCourierPerformance] Error:', error);
    res.status(500).json({ error: 'Error al obtener desempeño del repartidor' });
  }
}

/**
 * GET /reports/financial — Reporte financiero
 * Valida: Requerimientos 32.1-32.6
 */
export async function getFinancialReport(req: Request, res: Response): Promise<void> {
  try {
    const { start_date, end_date } = req.query;

    // Ingresos por servicio
    const byServiceQuery = `
      SELECT 
        shipment_type,
        modality,
        COUNT(*) as total_shipments,
        SUM(total_cost) as total_revenue
      FROM shipments
      WHERE created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($2::timestamp, NOW())
      GROUP BY shipment_type, modality
      ORDER BY total_revenue DESC
    `;
    
    const byServiceResult = await pool.query(byServiceQuery, [start_date || null, end_date || null]);

    // Ingresos por sucursal
    const byBranchQuery = `
      SELECT 
        b.name as branch_name,
        COUNT(s.id) as total_shipments,
        SUM(s.total_cost) as total_revenue
      FROM shipments s
      JOIN branches b ON s.origin_branch_id = b.id
      WHERE s.created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND s.created_at <= COALESCE($2::timestamp, NOW())
      GROUP BY b.name
      ORDER BY total_revenue DESC
    `;
    
    const byBranchResult = await pool.query(byBranchQuery, [start_date || null, end_date || null]);

    // Ingresos por método de pago
    const byPaymentMethodQuery = `
      SELECT 
        payment_method,
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount
      FROM transactions
      WHERE type = 'recarga'
        AND created_at >= COALESCE($1::timestamp, NOW() - INTERVAL '30 days')
        AND created_at <= COALESCE($2::timestamp, NOW())
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;
    
    const byPaymentMethodResult = await pool.query(byPaymentMethodQuery, [start_date || null, end_date || null]);

    res.status(200).json({
      by_service: byServiceResult.rows,
      by_branch: byBranchResult.rows,
      by_payment_method: byPaymentMethodResult.rows,
    });
  } catch (error) {
    console.error('[getFinancialReport] Error:', error);
    res.status(500).json({ error: 'Error al obtener reporte financiero' });
  }
}

/**
 * GET /reports/export/shipments — Exportar envíos (CSV/Excel)
 * Valida: Requerimientos 12.7, 33.1-33.5
 */
export async function exportShipments(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { start_date, end_date, status, format = 'csv' } = req.query;

    let query = `
      SELECT 
        s.tracking_code,
        s.created_at,
        s.status,
        s.shipment_type,
        s.modality,
        s.dest_address,
        s.total_cost,
        ob.name as origin_branch,
        db.name as dest_branch
      FROM shipments s
      LEFT JOIN branches ob ON s.origin_branch_id = ob.id
      LEFT JOIN branches db ON s.dest_branch_id = db.id
      WHERE s.sender_id = $1
    `;
    
    const params: any[] = [userId];

    if (start_date) {
      query += ` AND s.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND s.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (status) {
      query += ` AND s.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);

    // TODO: Generar archivo CSV/Excel real (implementación futura)
    res.status(200).json({
      message: 'Exportación disponible',
      format,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[exportShipments] Error:', error);
    res.status(500).json({ error: 'Error al exportar envíos' });
  }
}
