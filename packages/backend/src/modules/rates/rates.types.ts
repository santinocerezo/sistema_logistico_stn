/**
 * Tipos para el módulo de cálculo de tarifas
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PackageDimensions {
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
}

export type ShipmentType = 'S2S' | 'S2D';
export type ShipmentModality = 'Normal' | 'Express';

export interface RateCalculationInput {
  origin: Coordinates;
  destination: Coordinates | null; // null para S2D (se usa destAddress)
  destAddress?: Coordinates; // Solo para S2D
  shipmentType: ShipmentType;
  modality: ShipmentModality;
  dimensions: PackageDimensions;
}

export interface RateBreakdown {
  distance_km: number;
  volumetric_weight_kg: number;
  effective_weight_kg: number;
  base_cost: number;
  last_mile_cost: number;
  express_surcharge: number;
  total_cost: number;
}

export interface BaseRate {
  distance_min_km: number;
  distance_max_km: number;
  base_price: number;
  price_per_extra_kg: number;
  last_mile_base: number;
  last_mile_per_kg: number;
  express_multiplier: number;
}
