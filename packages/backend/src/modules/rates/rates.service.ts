/**
 * Servicio de cálculo de tarifas
 * Implementa las fórmulas de cálculo según el diseño técnico
 */

import type {
  Coordinates,
  PackageDimensions,
  RateCalculationInput,
  RateBreakdown,
  BaseRate,
} from './rates.types';

/**
 * Calcula la distancia entre dos puntos GPS usando la fórmula Haversine
 * @param lat1 Latitud del punto 1 en grados
 * @param lng1 Longitud del punto 1 en grados
 * @param lat2 Latitud del punto 2 en grados
 * @param lng2 Longitud del punto 2 en grados
 * @returns Distancia en kilómetros
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  
  // Convertir grados a radianes
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calcula el peso volumétrico de un paquete
 * @param dimensions Dimensiones del paquete en cm
 * @returns Peso volumétrico en kg
 */
export function calculateVolumetricWeight(
  dimensions: PackageDimensions
): number {
  const { length_cm, width_cm, height_cm } = dimensions;
  return (length_cm * width_cm * height_cm) / 5000;
}

/**
 * Calcula el peso efectivo (máximo entre peso real y volumétrico)
 * @param dimensions Dimensiones y peso del paquete
 * @returns Peso efectivo en kg
 */
export function calculateEffectiveWeight(
  dimensions: PackageDimensions
): number {
  const volumetricWeight = calculateVolumetricWeight(dimensions);
  return Math.max(dimensions.weight_kg, volumetricWeight);
}

/**
 * Tarifas base por tramo de distancia
 * Estos valores corresponden a los insertados en la base de datos
 */
const BASE_RATES: BaseRate[] = [
  {
    distance_min_km: 0,
    distance_max_km: 100,
    base_price: 500,
    price_per_extra_kg: 80,
    last_mile_base: 1500,
    last_mile_per_kg: 200,
    express_multiplier: 1.4,
  },
  {
    distance_min_km: 101,
    distance_max_km: 500,
    base_price: 1200,
    price_per_extra_kg: 150,
    last_mile_base: 1500,
    last_mile_per_kg: 200,
    express_multiplier: 1.4,
  },
  {
    distance_min_km: 501,
    distance_max_km: 1000,
    base_price: 2500,
    price_per_extra_kg: 250,
    last_mile_base: 1500,
    last_mile_per_kg: 200,
    express_multiplier: 1.4,
  },
  {
    distance_min_km: 1001,
    distance_max_km: 99999,
    base_price: 4500,
    price_per_extra_kg: 400,
    last_mile_base: 1500,
    last_mile_per_kg: 200,
    express_multiplier: 1.4,
  },
];

/**
 * Obtiene la tarifa base correspondiente a una distancia
 * @param distance_km Distancia en kilómetros
 * @returns Tarifa base aplicable
 */
export function getRateForDistance(distance_km: number): BaseRate {
  const rate = BASE_RATES.find(
    (r) => distance_km >= r.distance_min_km && distance_km <= r.distance_max_km
  );
  
  if (!rate) {
    throw new Error(`No se encontró tarifa para distancia: ${distance_km} km`);
  }
  
  return rate;
}

/**
 * Calcula el costo de un tramo S2S (Sucursal a Sucursal)
 * @param distance_km Distancia entre sucursales
 * @param effective_weight_kg Peso efectivo del paquete
 * @param modality Modalidad del envío (Normal o Express)
 * @returns Costo del tramo
 */
export function calculateS2SCost(
  distance_km: number,
  effective_weight_kg: number,
  modality: 'Normal' | 'Express'
): number {
  const rate = getRateForDistance(distance_km);
  
  // Costo base + costo por kg adicional (sobre 1 kg)
  const extraWeight = Math.max(0, effective_weight_kg - 1);
  let cost = rate.base_price + extraWeight * rate.price_per_extra_kg;
  
  // Aplicar recargo Express si corresponde
  if (modality === 'Express') {
    cost *= rate.express_multiplier;
  }
  
  return cost;
}

/**
 * Calcula el costo de última milla para envíos S2D
 * @param effective_weight_kg Peso efectivo del paquete
 * @returns Costo de última milla
 */
export function calculateLastMileCost(effective_weight_kg: number): number {
  const rate = BASE_RATES[0]; // Última milla usa valores constantes
  const extraWeight = Math.max(0, effective_weight_kg - 1);
  return rate.last_mile_base + extraWeight * rate.last_mile_per_kg;
}

/**
 * Encuentra la sucursal más cercana a un domicilio
 * @param destAddress Coordenadas del domicilio
 * @param branches Lista de sucursales disponibles
 * @returns Coordenadas de la sucursal más cercana
 */
export function findNearestBranch(
  destAddress: Coordinates,
  branches: Coordinates[]
): Coordinates {
  if (branches.length === 0) {
    throw new Error('No hay sucursales disponibles');
  }
  
  let nearestBranch = branches[0];
  let minDistance = haversine(
    destAddress.lat,
    destAddress.lng,
    nearestBranch.lat,
    nearestBranch.lng
  );
  
  for (let i = 1; i < branches.length; i++) {
    const distance = haversine(
      destAddress.lat,
      destAddress.lng,
      branches[i].lat,
      branches[i].lng
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestBranch = branches[i];
    }
  }
  
  return nearestBranch;
}

/**
 * Calcula el costo total de un envío S2D (Sucursal a Domicilio)
 * @param origin Coordenadas de la sucursal de origen
 * @param destAddress Coordenadas del domicilio de destino
 * @param branches Lista de sucursales disponibles
 * @param effective_weight_kg Peso efectivo del paquete
 * @param modality Modalidad del envío
 * @returns Objeto con el desglose del costo
 */
export function calculateS2DCost(
  origin: Coordinates,
  destAddress: Coordinates,
  branches: Coordinates[],
  effective_weight_kg: number,
  modality: 'Normal' | 'Express'
): { s2s_cost: number; last_mile_cost: number; total_cost: number; nearest_branch: Coordinates } {
  // Encontrar sucursal más cercana al domicilio
  const nearestBranch = findNearestBranch(destAddress, branches);
  
  // Calcular distancia entre origen y sucursal cercana
  const distance_s2s = haversine(
    origin.lat,
    origin.lng,
    nearestBranch.lat,
    nearestBranch.lng
  );
  
  // Calcular costo del tramo S2S
  const s2s_cost = calculateS2SCost(distance_s2s, effective_weight_kg, modality);
  
  // Calcular costo de última milla (sin recargo Express)
  const last_mile_cost = calculateLastMileCost(effective_weight_kg);
  
  return {
    s2s_cost,
    last_mile_cost,
    total_cost: s2s_cost + last_mile_cost,
    nearest_branch: nearestBranch,
  };
}

/**
 * Calcula el costo completo de un envío con desglose detallado
 * @param input Parámetros del envío
 * @param branches Lista de sucursales (requerido para S2D)
 * @returns Desglose completo del costo
 */
export function calculateShipmentCost(
  input: RateCalculationInput,
  branches?: Coordinates[]
): RateBreakdown {
  const { origin, destination, destAddress, shipmentType, modality, dimensions } = input;
  
  // Calcular peso efectivo
  const volumetric_weight_kg = calculateVolumetricWeight(dimensions);
  const effective_weight_kg = calculateEffectiveWeight(dimensions);
  
  let distance_km: number;
  let base_cost: number;
  let last_mile_cost = 0;
  let express_surcharge = 0;
  
  if (shipmentType === 'S2S') {
    if (!destination) {
      throw new Error('Se requiere destino para envíos S2S');
    }
    
    // Calcular distancia entre sucursales
    distance_km = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
    
    // Calcular costo base
    const totalCost = calculateS2SCost(distance_km, effective_weight_kg, modality);
    
    // Separar costo base y recargo Express
    if (modality === 'Express') {
      base_cost = totalCost / 1.4;
      express_surcharge = totalCost - base_cost;
    } else {
      base_cost = totalCost;
    }
  } else {
    // S2D
    if (!destAddress) {
      throw new Error('Se requiere dirección de destino para envíos S2D');
    }
    if (!branches || branches.length === 0) {
      throw new Error('Se requiere lista de sucursales para envíos S2D');
    }
    
    const s2dResult = calculateS2DCost(
      origin,
      destAddress,
      branches,
      effective_weight_kg,
      modality
    );
    
    // Para S2D, la distancia es entre origen y sucursal cercana
    const nearestBranch = s2dResult.nearest_branch;
    distance_km = haversine(origin.lat, origin.lng, nearestBranch.lat, nearestBranch.lng);
    
    last_mile_cost = s2dResult.last_mile_cost;
    
    // Separar costo base y recargo Express (solo en el tramo S2S)
    if (modality === 'Express') {
      base_cost = s2dResult.s2s_cost / 1.4;
      express_surcharge = s2dResult.s2s_cost - base_cost;
    } else {
      base_cost = s2dResult.s2s_cost;
    }
  }
  
  const total_cost = base_cost + last_mile_cost + express_surcharge;
  
  return {
    distance_km,
    volumetric_weight_kg,
    effective_weight_kg,
    base_cost,
    last_mile_cost,
    express_surcharge,
    total_cost,
  };
}
