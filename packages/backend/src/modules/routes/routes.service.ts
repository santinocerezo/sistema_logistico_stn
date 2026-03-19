import pool from '../../db/pool';

interface Shipment {
  id: number;
  destination_lat: number;
  destination_lng: number;
  priority: 'express' | 'standard';
  scheduled_pickup_date?: Date;
}

interface OptimizedRoute {
  shipmentId: number;
  order: number;
  distance: number;
  estimatedTime: number;
}

// Calcular ruta optimizada usando algoritmo del vecino mas cercano (Nearest Neighbor)
export async function calculateOptimizedRoute(
  courierId: number,
  currentLat: number,
  currentLng: number
): Promise<OptimizedRoute[]> {
  // Obtener todos los envios asignados al repartidor que estan pendientes de entrega
  const shipmentsResult = await pool.query(
    `SELECT 
      id,
      destination_lat,
      destination_lng,
      service_type as priority,
      scheduled_pickup_date
     FROM shipments
     WHERE courier_id = $1 
       AND status IN ('Asignado', 'En Camino', 'En Entrega')
     ORDER BY 
       CASE WHEN service_type = 'express' THEN 1 ELSE 2 END,
       scheduled_pickup_date ASC NULLS LAST`,
    [courierId]
  );

  const shipments: Shipment[] = shipmentsResult.rows;

  if (shipments.length === 0) {
    return [];
  }

  // Algoritmo del vecino mas cercano con prioridad
  const route: OptimizedRoute[] = [];
  const visited = new Set<number>();
  let currentPosition = { lat: currentLat, lng: currentLng };
  let totalDistance = 0;

  // Primero procesar envios express
  const expressShipments = shipments.filter(s => s.priority === 'express');
  const standardShipments = shipments.filter(s => s.priority === 'standard');

  // Procesar express primero
  for (const expressShipment of expressShipments) {
    const distance = haversine(
      currentPosition.lat,
      currentPosition.lng,
      expressShipment.destination_lat,
      expressShipment.destination_lng
    );

    totalDistance += distance;
    const estimatedTime = calculateTravelTime(distance);

    route.push({
      shipmentId: expressShipment.id,
      order: route.length + 1,
      distance: Math.round(distance * 100) / 100,
      estimatedTime,
    });

    visited.add(expressShipment.id);
    currentPosition = {
      lat: expressShipment.destination_lat,
      lng: expressShipment.destination_lng,
    };
  }

  // Luego procesar standard con vecino mas cercano
  while (visited.size < shipments.length) {
    let nearestShipment: Shipment | null = null;
    let minDistance = Infinity;

    for (const shipment of standardShipments) {
      if (visited.has(shipment.id)) continue;

      const distance = haversine(
        currentPosition.lat,
        currentPosition.lng,
        shipment.destination_lat,
        shipment.destination_lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestShipment = shipment;
      }
    }

    if (!nearestShipment) break;

    totalDistance += minDistance;
    const estimatedTime = calculateTravelTime(minDistance);

    route.push({
      shipmentId: nearestShipment.id,
      order: route.length + 1,
      distance: Math.round(minDistance * 100) / 100,
      estimatedTime,
    });

    visited.add(nearestShipment.id);
    currentPosition = {
      lat: nearestShipment.destination_lat,
      lng: nearestShipment.destination_lng,
    };
  }

  return route;
}

// Formula de Haversine para calcular distancia entre dos puntos GPS
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateTravelTime(distanceKm: number): number {
  const averageSpeed = parseFloat(process.env.COURIER_AVERAGE_SPEED ?? '30'); // km/h
  const timeMinutes = (distanceKm / averageSpeed) * 60;
  return Math.round(timeMinutes);
}
