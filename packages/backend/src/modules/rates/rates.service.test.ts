/**
 * Tests unitarios para el servicio de cálculo de tarifas
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  haversine,
  calculateVolumetricWeight,
  calculateEffectiveWeight,
  getRateForDistance,
  calculateS2SCost,
  calculateLastMileCost,
  findNearestBranch,
  calculateS2DCost,
  calculateShipmentCost,
} from './rates.service';
import type { Coordinates, PackageDimensions, RateCalculationInput } from './rates.types';

describe('Rates Service - Unit Tests', () => {
  describe('haversine', () => {
    it('debe calcular distancia cero entre el mismo punto', () => {
      const distance = haversine(-34.6037, -58.3816, -34.6037, -58.3816);
      expect(distance).toBe(0);
    });

    it('debe calcular distancia aproximada entre Buenos Aires y Córdoba', () => {
      // Buenos Aires: -34.6037, -58.3816
      // Córdoba: -31.4201, -64.1888
      const distance = haversine(-34.6037, -58.3816, -31.4201, -64.1888);
      // Distancia real aproximada: 640 km
      expect(distance).toBeGreaterThan(630);
      expect(distance).toBeLessThan(650);
    });

    it('debe calcular distancia aproximada entre Buenos Aires y Jujuy', () => {
      // Buenos Aires: -34.6037, -58.3816
      // Jujuy: -24.1858, -65.2995
      const distance = haversine(-34.6037, -58.3816, -24.1858, -65.2995);
      // Distancia real aproximada: 1337 km
      expect(distance).toBeGreaterThan(1300);
      expect(distance).toBeLessThan(1400);
    });

    it('debe ser simétrica (misma distancia en ambas direcciones)', () => {
      const d1 = haversine(-34.6037, -58.3816, -31.4201, -64.1888);
      const d2 = haversine(-31.4201, -64.1888, -34.6037, -58.3816);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
    });
  });

  describe('calculateVolumetricWeight', () => {
    it('debe calcular peso volumétrico correctamente', () => {
      const dimensions: PackageDimensions = {
        length_cm: 50,
        width_cm: 40,
        height_cm: 30,
        weight_kg: 5,
      };
      const volumetricWeight = calculateVolumetricWeight(dimensions);
      // (50 * 40 * 30) / 5000 = 60000 / 5000 = 12 kg
      expect(volumetricWeight).toBe(12);
    });

    it('debe retornar cero para dimensiones cero', () => {
      const dimensions: PackageDimensions = {
        length_cm: 0,
        width_cm: 0,
        height_cm: 0,
        weight_kg: 5,
      };
      const volumetricWeight = calculateVolumetricWeight(dimensions);
      expect(volumetricWeight).toBe(0);
    });

    it('debe calcular correctamente para paquete pequeño', () => {
      const dimensions: PackageDimensions = {
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        weight_kg: 1,
      };
      const volumetricWeight = calculateVolumetricWeight(dimensions);
      // (10 * 10 * 10) / 5000 = 1000 / 5000 = 0.2 kg
      expect(volumetricWeight).toBe(0.2);
    });
  });

  describe('calculateEffectiveWeight', () => {
    it('debe usar peso real cuando es mayor que volumétrico', () => {
      const dimensions: PackageDimensions = {
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        weight_kg: 5,
      };
      const effectiveWeight = calculateEffectiveWeight(dimensions);
      // Volumétrico: 0.2 kg, Real: 5 kg → Efectivo: 5 kg
      expect(effectiveWeight).toBe(5);
    });

    it('debe usar peso volumétrico cuando es mayor que real', () => {
      const dimensions: PackageDimensions = {
        length_cm: 50,
        width_cm: 40,
        height_cm: 30,
        weight_kg: 5,
      };
      const effectiveWeight = calculateEffectiveWeight(dimensions);
      // Volumétrico: 12 kg, Real: 5 kg → Efectivo: 12 kg
      expect(effectiveWeight).toBe(12);
    });

    it('debe retornar el mismo valor cuando peso real y volumétrico son iguales', () => {
      const dimensions: PackageDimensions = {
        length_cm: 50,
        width_cm: 20,
        height_cm: 10,
        weight_kg: 2,
      };
      const effectiveWeight = calculateEffectiveWeight(dimensions);
      // Volumétrico: (50*20*10)/5000 = 2 kg, Real: 2 kg → Efectivo: 2 kg
      expect(effectiveWeight).toBe(2);
    });
  });

  describe('getRateForDistance', () => {
    it('debe retornar tarifa correcta para 0-100 km', () => {
      const rate = getRateForDistance(50);
      expect(rate.distance_min_km).toBe(0);
      expect(rate.distance_max_km).toBe(100);
      expect(rate.base_price).toBe(500);
      expect(rate.price_per_extra_kg).toBe(80);
    });

    it('debe retornar tarifa correcta para 101-500 km', () => {
      const rate = getRateForDistance(300);
      expect(rate.distance_min_km).toBe(101);
      expect(rate.distance_max_km).toBe(500);
      expect(rate.base_price).toBe(1200);
      expect(rate.price_per_extra_kg).toBe(150);
    });

    it('debe retornar tarifa correcta para 501-1000 km', () => {
      const rate = getRateForDistance(750);
      expect(rate.distance_min_km).toBe(501);
      expect(rate.distance_max_km).toBe(1000);
      expect(rate.base_price).toBe(2500);
      expect(rate.price_per_extra_kg).toBe(250);
    });

    it('debe retornar tarifa correcta para >1000 km', () => {
      const rate = getRateForDistance(1500);
      expect(rate.distance_min_km).toBe(1001);
      expect(rate.distance_max_km).toBe(99999);
      expect(rate.base_price).toBe(4500);
      expect(rate.price_per_extra_kg).toBe(400);
    });

    it('debe manejar límites exactos de tramos', () => {
      expect(getRateForDistance(100).base_price).toBe(500);
      expect(getRateForDistance(101).base_price).toBe(1200);
      expect(getRateForDistance(500).base_price).toBe(1200);
      expect(getRateForDistance(501).base_price).toBe(2500);
      expect(getRateForDistance(1000).base_price).toBe(2500);
      expect(getRateForDistance(1001).base_price).toBe(4500);
    });
  });

  describe('calculateS2SCost', () => {
    it('debe calcular costo correcto para tramo local (0-100 km) con 1 kg', () => {
      const cost = calculateS2SCost(50, 1, 'Normal');
      // Base: 500, Extra: 0 kg → 500
      expect(cost).toBe(500);
    });

    it('debe calcular costo correcto para tramo local con peso extra', () => {
      const cost = calculateS2SCost(50, 3, 'Normal');
      // Base: 500, Extra: 2 kg * 80 = 160 → 660
      expect(cost).toBe(660);
    });

    it('debe aplicar recargo Express del 40%', () => {
      const normalCost = calculateS2SCost(50, 1, 'Normal');
      const expressCost = calculateS2SCost(50, 1, 'Express');
      expect(expressCost).toBe(normalCost * 1.4);
      expect(expressCost).toBe(700);
    });

    it('debe calcular costo correcto para tramo regional (101-500 km)', () => {
      const cost = calculateS2SCost(300, 5, 'Normal');
      // Base: 1200, Extra: 4 kg * 150 = 600 → 1800
      expect(cost).toBe(1800);
    });

    it('debe calcular costo correcto para tramo nacional (501-1000 km)', () => {
      const cost = calculateS2SCost(750, 10, 'Normal');
      // Base: 2500, Extra: 9 kg * 250 = 2250 → 4750
      expect(cost).toBe(4750);
    });

    it('debe calcular costo correcto para larga distancia (>1000 km)', () => {
      const cost = calculateS2SCost(1500, 10, 'Normal');
      // Base: 4500, Extra: 9 kg * 400 = 3600 → 8100
      expect(cost).toBe(8100);
    });

    it('debe cumplir requisito: Buenos Aires-Jujuy 10kg ≤ $60.000', () => {
      // Distancia aproximada: 1400 km
      const cost = calculateS2SCost(1400, 10, 'Normal');
      expect(cost).toBeLessThanOrEqual(60000);
    });
  });

  describe('calculateLastMileCost', () => {
    it('debe calcular costo base para 1 kg', () => {
      const cost = calculateLastMileCost(1);
      // Base: 1500, Extra: 0 kg → 1500
      expect(cost).toBe(1500);
    });

    it('debe calcular costo con peso extra', () => {
      const cost = calculateLastMileCost(3);
      // Base: 1500, Extra: 2 kg * 200 = 400 → 1900
      expect(cost).toBe(1900);
    });

    it('debe calcular costo para peso alto', () => {
      const cost = calculateLastMileCost(10);
      // Base: 1500, Extra: 9 kg * 200 = 1800 → 3300
      expect(cost).toBe(3300);
    });
  });

  describe('findNearestBranch', () => {
    it('debe encontrar la sucursal más cercana', () => {
      const destAddress: Coordinates = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires
      const branches: Coordinates[] = [
        { lat: -31.4201, lng: -64.1888 }, // Córdoba
        { lat: -34.6037, lng: -58.3816 }, // Buenos Aires (misma ubicación)
        { lat: -24.1858, lng: -65.2995 }, // Jujuy
      ];
      
      const nearest = findNearestBranch(destAddress, branches);
      expect(nearest.lat).toBe(-34.6037);
      expect(nearest.lng).toBe(-58.3816);
    });

    it('debe lanzar error si no hay sucursales', () => {
      const destAddress: Coordinates = { lat: -34.6037, lng: -58.3816 };
      expect(() => findNearestBranch(destAddress, [])).toThrow('No hay sucursales disponibles');
    });

    it('debe retornar la única sucursal disponible', () => {
      const destAddress: Coordinates = { lat: -34.6037, lng: -58.3816 };
      const branches: Coordinates[] = [{ lat: -31.4201, lng: -64.1888 }];
      
      const nearest = findNearestBranch(destAddress, branches);
      expect(nearest.lat).toBe(-31.4201);
      expect(nearest.lng).toBe(-64.1888);
    });
  });

  describe('calculateS2DCost', () => {
    it('debe calcular costo S2D correctamente', () => {
      const origin: Coordinates = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires
      const destAddress: Coordinates = { lat: -34.6037, lng: -58.3816 }; // Mismo punto
      const branches: Coordinates[] = [
        { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
      ];
      
      const result = calculateS2DCost(origin, destAddress, branches, 3, 'Normal');
      
      // Distancia S2S: 0 km → Base: 500, Extra: 2kg * 80 = 160 → 660
      // Última milla: 1500 + 2kg * 200 = 1900
      // Total: 660 + 1900 = 2560
      expect(result.s2s_cost).toBe(660);
      expect(result.last_mile_cost).toBe(1900);
      expect(result.total_cost).toBe(2560);
    });

    it('debe aplicar recargo Express solo al tramo S2S', () => {
      const origin: Coordinates = { lat: -34.6037, lng: -58.3816 };
      const destAddress: Coordinates = { lat: -34.6037, lng: -58.3816 };
      const branches: Coordinates[] = [{ lat: -34.6037, lng: -58.3816 }];
      
      const normalResult = calculateS2DCost(origin, destAddress, branches, 3, 'Normal');
      const expressResult = calculateS2DCost(origin, destAddress, branches, 3, 'Express');
      
      // Última milla debe ser igual en ambos
      expect(expressResult.last_mile_cost).toBe(normalResult.last_mile_cost);
      
      // Tramo S2S debe tener recargo del 40%
      expect(expressResult.s2s_cost).toBe(normalResult.s2s_cost * 1.4);
    });

    it('debe cumplir requisito: envío 3kg misma provincia S2D ≤ $8.000', () => {
      const origin: Coordinates = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires
      const destAddress: Coordinates = { lat: -34.7, lng: -58.4 }; // Cerca de Buenos Aires
      const branches: Coordinates[] = [
        { lat: -34.6037, lng: -58.3816 },
        { lat: -34.7, lng: -58.4 },
      ];
      
      const result = calculateS2DCost(origin, destAddress, branches, 3, 'Normal');
      expect(result.total_cost).toBeLessThanOrEqual(8000);
    });
  });

  describe('calculateShipmentCost', () => {
    it('debe calcular costo completo para envío S2S', () => {
      const input: RateCalculationInput = {
        origin: { lat: -34.6037, lng: -58.3816 },
        destination: { lat: -31.4201, lng: -64.1888 },
        shipmentType: 'S2S',
        modality: 'Normal',
        dimensions: {
          length_cm: 30,
          width_cm: 20,
          height_cm: 10,
          weight_kg: 5,
        },
      };
      
      const breakdown = calculateShipmentCost(input);
      
      expect(breakdown.distance_km).toBeGreaterThan(630);
      expect(breakdown.distance_km).toBeLessThan(650);
      expect(breakdown.volumetric_weight_kg).toBe(1.2); // (30*20*10)/5000
      expect(breakdown.effective_weight_kg).toBe(5); // max(5, 1.2)
      expect(breakdown.last_mile_cost).toBe(0);
      expect(breakdown.express_surcharge).toBe(0);
      expect(breakdown.total_cost).toBeGreaterThan(0);
    });

    it('debe calcular costo completo para envío S2D', () => {
      const input: RateCalculationInput = {
        origin: { lat: -34.6037, lng: -58.3816 },
        destination: null,
        destAddress: { lat: -34.7, lng: -58.4 },
        shipmentType: 'S2D',
        modality: 'Normal',
        dimensions: {
          length_cm: 30,
          width_cm: 20,
          height_cm: 10,
          weight_kg: 3,
        },
      };
      
      const branches: Coordinates[] = [
        { lat: -34.6037, lng: -58.3816 },
        { lat: -34.7, lng: -58.4 },
      ];
      
      const breakdown = calculateShipmentCost(input, branches);
      
      expect(breakdown.volumetric_weight_kg).toBe(1.2);
      expect(breakdown.effective_weight_kg).toBe(3);
      expect(breakdown.last_mile_cost).toBeGreaterThan(0);
      expect(breakdown.express_surcharge).toBe(0);
      expect(breakdown.total_cost).toBeGreaterThan(0);
    });

    it('debe separar recargo Express correctamente', () => {
      const input: RateCalculationInput = {
        origin: { lat: -34.6037, lng: -58.3816 },
        destination: { lat: -31.4201, lng: -64.1888 },
        shipmentType: 'S2S',
        modality: 'Express',
        dimensions: {
          length_cm: 30,
          width_cm: 20,
          height_cm: 10,
          weight_kg: 5,
        },
      };
      
      const breakdown = calculateShipmentCost(input);
      
      expect(breakdown.express_surcharge).toBeGreaterThan(0);
      expect(breakdown.total_cost).toBe(
        breakdown.base_cost + breakdown.last_mile_cost + breakdown.express_surcharge
      );
      
      // Verificar que el recargo es el 40% del costo base
      expect(breakdown.express_surcharge).toBeCloseTo(breakdown.base_cost * 0.4, 2);
    });

    it('debe lanzar error si falta destino para S2S', () => {
      const input: RateCalculationInput = {
        origin: { lat: -34.6037, lng: -58.3816 },
        destination: null,
        shipmentType: 'S2S',
        modality: 'Normal',
        dimensions: {
          length_cm: 30,
          width_cm: 20,
          height_cm: 10,
          weight_kg: 5,
        },
      };
      
      expect(() => calculateShipmentCost(input)).toThrow('Se requiere destino para envíos S2S');
    });

    it('debe lanzar error si falta dirección para S2D', () => {
      const input: RateCalculationInput = {
        origin: { lat: -34.6037, lng: -58.3816 },
        destination: null,
        shipmentType: 'S2D',
        modality: 'Normal',
        dimensions: {
          length_cm: 30,
          width_cm: 20,
          height_cm: 10,
          weight_kg: 5,
        },
      };
      
      expect(() => calculateShipmentCost(input)).toThrow(
        'Se requiere dirección de destino para envíos S2D'
      );
    });

    it('debe lanzar error si faltan sucursales para S2D', () => {
      const input: RateCalculationInput = {
        origin: { lat: -34.6037, lng: -58.3816 },
        destination: null,
        destAddress: { lat: -34.7, lng: -58.4 },
        shipmentType: 'S2D',
        modality: 'Normal',
        dimensions: {
          length_cm: 30,
          width_cm: 20,
          height_cm: 10,
          weight_kg: 5,
        },
      };
      
      expect(() => calculateShipmentCost(input)).toThrow(
        'Se requiere lista de sucursales para envíos S2D'
      );
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    // Feature: sistema-logistica-paqueteria, Propiedad 8: Fórmula de tarifa S2S con tramos de distancia
    it('Propiedad 8: Costo S2S debe coincidir con fórmula de tramos', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true }),
          (distance_km, weight_kg) => {
            const cost = calculateS2SCost(distance_km, weight_kg, 'Normal');
            const rate = getRateForDistance(distance_km);
            const extraWeight = Math.max(0, weight_kg - 1);
            const expectedCost = rate.base_price + extraWeight * rate.price_per_extra_kg;
            
            return Math.abs(cost - expectedCost) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: sistema-logistica-paqueteria, Propiedad 10: Recargo Express del 40%
    it('Propiedad 10: Costo Express debe ser exactamente 1.40x el costo Normal', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true }),
          (distance_km, weight_kg) => {
            const normalCost = calculateS2SCost(distance_km, weight_kg, 'Normal');
            const expressCost = calculateS2SCost(distance_km, weight_kg, 'Express');
            
            return Math.abs(expressCost - normalCost * 1.4) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: sistema-logistica-paqueteria, Propiedad 11: Peso volumétrico como peso efectivo
    it('Propiedad 11: Peso efectivo debe ser max(peso_real, peso_volumétrico)', () => {
      fc.assert(
        fc.property(
          fc.record({
            length_cm: fc.float({ min: Math.fround(1), max: Math.fround(200), noNaN: true }),
            width_cm: fc.float({ min: Math.fround(1), max: Math.fround(200), noNaN: true }),
            height_cm: fc.float({ min: Math.fround(1), max: Math.fround(200), noNaN: true }),
            weight_kg: fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true }),
          }),
          (dimensions) => {
            const volumetricWeight = calculateVolumetricWeight(dimensions);
            const effectiveWeight = calculateEffectiveWeight(dimensions);
            const expectedEffective = Math.max(dimensions.weight_kg, volumetricWeight);
            
            return Math.abs(effectiveWeight - expectedEffective) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Propiedad adicional: Haversine debe ser simétrica
    it('Propiedad: Haversine debe ser simétrica', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          (lat1, lng1, lat2, lng2) => {
            const d1 = haversine(lat1, lng1, lat2, lng2);
            const d2 = haversine(lat2, lng2, lat1, lng1);
            
            return Math.abs(d1 - d2) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Propiedad adicional: Distancia a sí mismo debe ser cero
    it('Propiedad: Distancia Haversine a sí mismo debe ser cero', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            const distance = haversine(lat, lng, lat, lng);
            return Math.abs(distance) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Propiedad adicional: Peso volumétrico siempre no negativo
    it('Propiedad: Peso volumétrico debe ser siempre no negativo', () => {
      fc.assert(
        fc.property(
          fc.record({
            length_cm: fc.float({ min: 0, max: 200, noNaN: true }),
            width_cm: fc.float({ min: 0, max: 200, noNaN: true }),
            height_cm: fc.float({ min: 0, max: 200, noNaN: true }),
            weight_kg: fc.float({ min: 0, max: 50, noNaN: true }),
          }),
          (dimensions) => {
            const volumetricWeight = calculateVolumetricWeight(dimensions);
            return volumetricWeight >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Propiedad adicional: Costo última milla debe ser monótono creciente con el peso
    it('Propiedad: Costo última milla debe aumentar con el peso', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(49), noNaN: true }),
          (weight) => {
            const cost1 = calculateLastMileCost(weight);
            const cost2 = calculateLastMileCost(weight + 1);
            return cost2 >= cost1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
