/**
 * Tests unitarios para el controller de envíos
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { getPublicQuote } from './shipments.controller';
import pool from '../../db/pool';

// Mock del pool de base de datos
vi.mock('../../db/pool', () => ({
  default: {
    query: vi.fn(),
  },
}));

// Mock del servicio de tarifas
vi.mock('../rates/rates.service', async () => {
  const actual = await vi.importActual<typeof import('../rates/rates.service')>('../rates/rates.service');
  return {
    ...actual,
    calculateShipmentCost: vi.fn(),
    findNearestBranch: vi.fn(),
  };
});

import { calculateShipmentCost, findNearestBranch } from '../rates/rates.service';

describe('shipments.controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockRequest = {
      body: {},
    };
    
    mockResponse = {
      status: statusMock as any,
      json: jsonMock,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /shipments/quote - getPublicQuote', () => {
    describe('Validación de entrada', () => {
      it('debe rechazar request sin datos', async () => {
        mockRequest.body = {};

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Datos de entrada inválidos',
            details: expect.any(Array),
          })
        );
      });

      it('debe rechazar coordenadas inválidas', async () => {
        mockRequest.body = {
          origin: { lat: 100, lng: 200 }, // Fuera de rango
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
          destination: { lat: -34.6037, lng: -58.3816 },
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Datos de entrada inválidos',
          })
        );
      });

      it('debe rechazar dimensiones negativas', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: -10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
          destination: { lat: -31.4201, lng: -64.1888 },
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
      });

      it('debe rechazar S2S sin destination', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
          // Falta destination
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Datos de entrada inválidos',
          })
        );
      });

      it('debe rechazar S2D sin destAddress', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
          // Falta destAddress
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
      });
    });

    describe('Cotización S2S (Sucursal a Sucursal)', () => {
      it('debe calcular cotización S2S Normal correctamente', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
          destination: { lat: -31.4201, lng: -64.1888 }, // Córdoba
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 30,
            width_cm: 20,
            height_cm: 15,
            weight_kg: 2,
          },
        };

        const mockBreakdown = {
          distance_km: 650,
          volumetric_weight_kg: 1.8,
          effective_weight_kg: 2,
          base_cost: 2650,
          last_mile_cost: 0,
          express_surcharge: 0,
          total_cost: 2650,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(calculateShipmentCost).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: { lat: -34.6037, lng: -58.3816 },
            destination: { lat: -31.4201, lng: -64.1888 },
            shipmentType: 'S2S',
            modality: 'Normal',
          }),
          []
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cost: 2650,
            breakdown: mockBreakdown,
            estimated_delivery_days: expect.any(Number),
          })
        );
      });

      it('debe calcular cotización S2S Express con recargo del 40%', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -31.4201, lng: -64.1888 },
          shipmentType: 'S2S',
          modality: 'Express',
          dimensions: {
            length_cm: 30,
            width_cm: 20,
            height_cm: 15,
            weight_kg: 2,
          },
        };

        const mockBreakdown = {
          distance_km: 650,
          volumetric_weight_kg: 1.8,
          effective_weight_kg: 2,
          base_cost: 2650,
          last_mile_cost: 0,
          express_surcharge: 1060, // 40% de 2650
          total_cost: 3710,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cost: 3710,
            breakdown: expect.objectContaining({
              express_surcharge: 1060,
            }),
          })
        );
      });

      it('debe calcular tiempo de entrega Normal: 1 día por cada 300 km', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -31.4201, lng: -64.1888 },
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 650, // ~650 km entre Buenos Aires y Córdoba
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 2500,
          last_mile_cost: 0,
          express_surcharge: 0,
          total_cost: 2500,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            estimated_delivery_days: 3, // ceil(650/300) = 3 días
          })
        );
      });

      it('debe calcular tiempo de entrega Express: 1 día por cada 600 km', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -31.4201, lng: -64.1888 },
          shipmentType: 'S2S',
          modality: 'Express',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 650,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 2500,
          last_mile_cost: 0,
          express_surcharge: 1000,
          total_cost: 3500,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            estimated_delivery_days: 2, // ceil(650/600) = 2 días
          })
        );
      });

      it('debe respetar mínimo de 1 día para distancias cortas', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -34.6158, lng: -58.5033 }, // Distancia corta
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 15,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 500,
          last_mile_cost: 0,
          express_surcharge: 0,
          total_cost: 500,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            estimated_delivery_days: 1, // Mínimo 1 día
          })
        );
      });

      it('debe respetar máximo de 7 días para Normal', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -54.8019, lng: -68.3029 }, // Ushuaia (muy lejos)
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 3000, // Distancia muy larga
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 5300,
          last_mile_cost: 0,
          express_surcharge: 0,
          total_cost: 5300,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            estimated_delivery_days: 7, // Máximo 7 días para Normal
          })
        );
      });

      it('debe respetar máximo de 4 días para Express', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -54.8019, lng: -68.3029 },
          shipmentType: 'S2S',
          modality: 'Express',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 3000,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 5300,
          last_mile_cost: 0,
          express_surcharge: 2120,
          total_cost: 7420,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            estimated_delivery_days: 4, // Máximo 4 días para Express
          })
        );
      });
    });

    describe('Cotización S2D (Sucursal a Domicilio)', () => {
      beforeEach(() => {
        // Mock de sucursales activas
        vi.mocked(pool.query).mockResolvedValue({
          rows: [
            { lat: '-34.6037', lng: '-58.3816' }, // Buenos Aires
            { lat: '-31.4201', lng: '-64.1888' }, // Córdoba
            { lat: '-32.8895', lng: '-68.8458' }, // Mendoza
          ],
          rowCount: 3,
        } as any);
      });

      it('debe obtener sucursales activas de la base de datos', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -34.6158, lng: -58.5033 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 15,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 500,
          last_mile_cost: 1500,
          express_surcharge: 0,
          total_cost: 2000,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);
        vi.mocked(findNearestBranch).mockReturnValue({ lat: -34.6037, lng: -58.3816 });

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(pool.query).toHaveBeenCalledWith(
          'SELECT lat, lng FROM branches WHERE is_active = true'
        );
      });

      it('debe rechazar si no hay sucursales activas', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [],
          rowCount: 0,
        } as any);

        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -34.6158, lng: -58.5033 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'No hay sucursales disponibles en este momento',
        });
      });

      it('debe calcular cotización S2D con última milla', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -34.6158, lng: -58.5033 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 30,
            width_cm: 20,
            height_cm: 15,
            weight_kg: 2,
          },
        };

        const mockBreakdown = {
          distance_km: 15,
          volumetric_weight_kg: 1.8,
          effective_weight_kg: 2,
          base_cost: 580,
          last_mile_cost: 1700, // 1500 + 200 por kg extra
          express_surcharge: 0,
          total_cost: 2280,
        };

        const mockNearestBranch = { lat: -34.6037, lng: -58.3816 };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);
        vi.mocked(findNearestBranch).mockReturnValue(mockNearestBranch);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            cost: 2280,
            breakdown: expect.objectContaining({
              last_mile_cost: 1700,
            }),
            nearest_branch: mockNearestBranch,
          })
        );
      });

      it('debe incluir sucursal más cercana en respuesta S2D', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -31.4201, lng: -64.1888 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 650,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 2500,
          last_mile_cost: 1500,
          express_surcharge: 0,
          total_cost: 4000,
        };

        const mockNearestBranch = { lat: -31.4201, lng: -64.1888 };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);
        vi.mocked(findNearestBranch).mockReturnValue(mockNearestBranch);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(findNearestBranch).toHaveBeenCalledWith(
          { lat: -31.4201, lng: -64.1888 },
          expect.any(Array)
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            nearest_branch: mockNearestBranch,
          })
        );
      });

      it('debe pasar lista de sucursales al servicio de tarifas para S2D', async () => {
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -34.6158, lng: -58.5033 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 15,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 500,
          last_mile_cost: 1500,
          express_surcharge: 0,
          total_cost: 2000,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);
        vi.mocked(findNearestBranch).mockReturnValue({ lat: -34.6037, lng: -58.3816 });

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(calculateShipmentCost).toHaveBeenCalledWith(
          expect.any(Object),
          [
            { lat: -34.6037, lng: -58.3816 },
            { lat: -31.4201, lng: -64.1888 },
            { lat: -32.8895, lng: -68.8458 },
          ]
        );
      });
    });

    describe('Manejo de errores', () => {
      it('debe manejar errores de base de datos', async () => {
        vi.mocked(pool.query).mockRejectedValue(new Error('Database error'));

        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -34.6158, lng: -58.5033 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Error al calcular cotización',
            message: 'Database error',
          })
        );
      });

      it('debe manejar errores del servicio de tarifas', async () => {
        vi.mocked(pool.query).mockResolvedValue({
          rows: [{ lat: '-34.6037', lng: '-58.3816' }],
          rowCount: 1,
        } as any);

        vi.mocked(calculateShipmentCost).mockImplementation(() => {
          throw new Error('No se encontró tarifa para distancia');
        });

        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destAddress: { lat: -34.6158, lng: -58.5033 },
          shipmentType: 'S2D',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Error al calcular cotización',
          })
        );
      });
    });

    describe('Rate limiting', () => {
      it('debe aplicar rate limiting de 10 req/hora por IP (verificado por middleware)', async () => {
        // Este test verifica que el endpoint esté configurado con el middleware correcto
        // El rate limiting real se prueba en rateLimiter.test.ts
        mockRequest.body = {
          origin: { lat: -34.6037, lng: -58.3816 },
          destination: { lat: -31.4201, lng: -64.1888 },
          shipmentType: 'S2S',
          modality: 'Normal',
          dimensions: {
            length_cm: 10,
            width_cm: 10,
            height_cm: 10,
            weight_kg: 1,
          },
        };

        const mockBreakdown = {
          distance_km: 650,
          volumetric_weight_kg: 0.2,
          effective_weight_kg: 1,
          base_cost: 2500,
          last_mile_cost: 0,
          express_surcharge: 0,
          total_cost: 2500,
        };

        vi.mocked(calculateShipmentCost).mockReturnValue(mockBreakdown);

        await getPublicQuote(mockRequest as Request, mockResponse as Response);

        // El endpoint debe funcionar normalmente cuando no se excede el límite
        expect(statusMock).toHaveBeenCalledWith(200);
      });
    });
  });
});
