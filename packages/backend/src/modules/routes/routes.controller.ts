import { Request, Response } from 'express';
import pool from '../../db/pool';
import { calculateOptimizedRoute } from './routes.service';

// GET /couriers/route/optimized - Obtener ruta optimizada para el repartidor
export async function getOptimizedRoute(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (userRole !== 'courier') {
      res.status(403).json({ error: 'Solo repartidores pueden acceder a esta funcionalidad' });
      return;
    }

    // Obtener informacion del repartidor
    const courierResult = await pool.query(
      `SELECT id, current_lat, current_lng FROM couriers WHERE user_id = $1`,
      [userId]
    );

    if (courierResult.rows.length === 0) {
      res.status(404).json({ error: 'Repartidor no encontrado' });
      return;
    }

    const courier = courierResult.rows[0];

    // Si no tiene ubicacion actual, usar ubicacion por defecto (sucursal principal)
    let currentLat = courier.current_lat;
    let currentLng = courier.current_lng;

    if (!currentLat || !currentLng) {
      const branchResult = await pool.query(
        `SELECT latitude, longitude FROM branches WHERE is_active = true LIMIT 1`
      );
      
      if (branchResult.rows.length > 0) {
        currentLat = branchResult.rows[0].latitude;
        currentLng = branchResult.rows[0].longitude;
      } else {
        res.status(400).json({ error: 'No se pudo determinar la ubicacion actual' });
        return;
      }
    }

    // Calcular ruta optimizada
    const optimizedRoute = await calculateOptimizedRoute(
      courier.id,
      currentLat,
      currentLng
    );

    // Obtener detalles completos de los envios en el orden optimizado
    if (optimizedRoute.length === 0) {
      res.json({
        currentLocation: { lat: currentLat, lng: currentLng },
        route: [],
        totalDistance: 0,
        totalEstimatedTime: 0,
      });
      return;
    }

    const shipmentIds = optimizedRoute.map(r => r.shipmentId);
    const shipmentsResult = await pool.query(
      `SELECT 
        s.id,
        s.tracking_code,
        s.destination_address,
        s.destination_lat,
        s.destination_lng,
        s.service_type,
        s.status,
        u.full_name as recipient_name,
        u.phone as recipient_phone
       FROM shipments s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ANY($1)`,
      [shipmentIds]
    );

    // Combinar informacion de ruta con detalles de envios
    const routeWithDetails = optimizedRoute.map(routeItem => {
      const shipment = shipmentsResult.rows.find(s => s.id === routeItem.shipmentId);
      return {
        ...routeItem,
        shipment,
      };
    });

    const totalDistance = optimizedRoute.reduce((sum, r) => sum + r.distance, 0);
    const totalEstimatedTime = optimizedRoute.reduce((sum, r) => sum + r.estimatedTime, 0);

    res.json({
      currentLocation: { lat: currentLat, lng: currentLng },
      route: routeWithDetails,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalEstimatedTime,
    });

  } catch (error) {
    console.error('Error al calcular ruta optimizada:', error);
    res.status(500).json({ error: 'Error al calcular ruta optimizada' });
  }
}
