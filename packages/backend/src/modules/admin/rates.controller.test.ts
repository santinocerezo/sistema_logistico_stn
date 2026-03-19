import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { pool } from '../../db/pool';
import {
  listRates,
  getActiveRates,
  createRate,
  updateRate,
  deleteRate,
} from './rates.controller';

// Mock del pool de base de datos
vi.mock('../../db/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('Admin Rates Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockRequest = {
      body: {},
      params: {},
      user: { userId: 'admin-id', email: 'admin@test.com', role: 'admin' },
    };
    
    mockResponse = {
      status: statusMock as unknown as Response['status'],
      json: jsonMock,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listRates', () => {
    it('debe listar todas las tarifas ordenadas por distancia y fecha', async () => {
      const mockRates = [
        {
          id: '1',
          name: 'Tramo Local',
          distance_min_km: 0,
          distance_max_km: 100,
          base_price: 500,
          price_per_extra_kg: 80,
          last_mile_base: 1500,
          last_mile_per_kg: 200,
          express_multiplier: 1.4,
          is_active: true,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          created_at: new Date('2024-01-01'),
        },
      ];

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: mockRates } as never);

      await listRates(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ rates: mockRates });
    });

    it('debe manejar errores de base de datos', async () => {
      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB Error'));

      await listRates(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error al obtener tarifas' });
    });
  });

  describe('getActiveRates', () => {
    it('debe obtener solo tarifas activas y vigentes', async () => {
      const mockActiveRates = [
        {
          id: '1',
          name: 'Tramo Local',
          distance_min_km: 0,
          distance_max_km: 100,
          base_price: 500,
          price_per_extra_kg: 80,
          last_mile_base: 1500,
          last_mile_per_kg: 200,
          express_multiplier: 1.4,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          created_at: new Date('2024-01-01'),
        },
      ];

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: mockActiveRates } as never);

      await getActiveRates(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ rates: mockActiveRates });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = true'),
        expect.arrayContaining([expect.any(String)])
      );
    });

    it('debe manejar errores de base de datos', async () => {
      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB Error'));

      await getActiveRates(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error al obtener tarifas activas' });
    });
  });

  describe('createRate', () => {
    it('debe crear una nueva tarifa con datos válidos', async () => {
      mockRequest.body = {
        name: 'Tramo Test',
        distance_min_km: 0,
        distance_max_km: 100,
        base_price: 500,
        price_per_extra_kg: 80,
        last_mile_base: 1500,
        last_mile_per_kg: 200,
        express_multiplier: 1.4,
      };

      const mockCreatedRate = {
        id: 'new-id',
        ...mockRequest.body,
        is_active: true,
        valid_from: new Date(),
        valid_to: null,
        created_at: new Date(),
      };

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [mockCreatedRate] } as never);

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ rate: mockCreatedRate });
    });

    it('debe rechazar datos inválidos - distancia máxima menor que mínima', async () => {
      mockRequest.body = {
        name: 'Tramo Inválido',
        distance_min_km: 100,
        distance_max_km: 50,
        base_price: 500,
        price_per_extra_kg: 80,
      };

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Datos inválidos',
          details: expect.any(Object),
        })
      );
    });

    it('debe rechazar precio base negativo', async () => {
      mockRequest.body = {
        name: 'Tramo Test',
        distance_min_km: 0,
        distance_max_km: 100,
        base_price: -500,
        price_per_extra_kg: 80,
      };

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Datos inválidos',
        })
      );
    });

    it('debe usar valores por defecto para campos opcionales', async () => {
      mockRequest.body = {
        name: 'Tramo Mínimo',
        distance_min_km: 0,
        distance_max_km: 100,
        base_price: 500,
        price_per_extra_kg: 80,
      };

      const mockCreatedRate = {
        id: 'new-id',
        ...mockRequest.body,
        last_mile_base: 1500,
        last_mile_per_kg: 200,
        express_multiplier: 1.4,
        is_active: true,
        valid_from: new Date(),
        valid_to: null,
        created_at: new Date(),
      };

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [mockCreatedRate] } as never);

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.any(String), // name
          expect.any(Number), // distance_min_km
          expect.any(Number), // distance_max_km
          expect.any(Number), // base_price
          expect.any(Number), // price_per_extra_kg
          1500, // last_mile_base (default)
          200, // last_mile_per_kg (default)
          1.4, // express_multiplier (default)
          expect.any(Date), // valid_from
          null, // valid_to
        ])
      );
    });

    it('debe manejar errores de base de datos', async () => {
      mockRequest.body = {
        name: 'Tramo Test',
        distance_min_km: 0,
        distance_max_km: 100,
        base_price: 500,
        price_per_extra_kg: 80,
      };

      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB Error'));

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error al crear tarifa' });
    });
  });

  describe('updateRate', () => {
    it('debe actualizar una tarifa que aún no está vigente', async () => {
      mockRequest.params = { id: 'rate-id' };
      mockRequest.body = {
        base_price: 600,
        price_per_extra_kg: 90,
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      vi.mocked(pool.query)
        .mockResolvedValueOnce({
          rows: [{ id: 'rate-id', valid_from: futureDate }],
        } as never)
        .mockResolvedValueOnce({
          rows: [{
            id: 'rate-id',
            name: 'Tramo Test',
            distance_min_km: 0,
            distance_max_km: 100,
            base_price: 600,
            price_per_extra_kg: 90,
            last_mile_base: 1500,
            last_mile_per_kg: 200,
            express_multiplier: 1.4,
            is_active: true,
            valid_from: futureDate,
            valid_to: null,
            created_at: new Date(),
          }],
        } as never);

      await updateRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rate: expect.objectContaining({
            base_price: 600,
            price_per_extra_kg: 90,
          }),
        })
      );
    });

    it('debe rechazar actualización de tarifa ya vigente', async () => {
      mockRequest.params = { id: 'rate-id' };
      mockRequest.body = {
        base_price: 600,
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ id: 'rate-id', valid_from: pastDate }],
      } as never);

      await updateRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No se puede modificar una tarifa que ya está vigente',
      });
    });

    it('debe retornar 404 si la tarifa no existe', async () => {
      mockRequest.params = { id: 'non-existent-id' };
      mockRequest.body = {
        base_price: 600,
      };

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

      await updateRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Tarifa no encontrada' });
    });

    it('debe rechazar actualización sin campos', async () => {
      mockRequest.params = { id: 'rate-id' };
      mockRequest.body = {};

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ id: 'rate-id', valid_from: futureDate }],
      } as never);

      await updateRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No hay campos para actualizar' });
    });

    it('debe manejar errores de base de datos', async () => {
      mockRequest.params = { id: 'rate-id' };
      mockRequest.body = {
        base_price: 600,
      };

      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB Error'));

      await updateRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error al actualizar tarifa' });
    });
  });

  describe('deleteRate', () => {
    it('debe desactivar una tarifa existente (soft delete)', async () => {
      mockRequest.params = { id: 'rate-id' };

      vi.mocked(pool.query).mockResolvedValueOnce({
        rows: [{ id: 'rate-id' }],
      } as never);

      await deleteRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Tarifa desactivada correctamente' });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE rates'),
        ['rate-id']
      );
    });

    it('debe retornar 404 si la tarifa no existe', async () => {
      mockRequest.params = { id: 'non-existent-id' };

      vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as never);

      await deleteRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Tarifa no encontrada' });
    });

    it('debe manejar errores de base de datos', async () => {
      mockRequest.params = { id: 'rate-id' };

      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB Error'));

      await deleteRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error al desactivar tarifa' });
    });
  });

  describe('Validaciones de esquema', () => {
    it('debe validar que express_multiplier sea mayor o igual a 1', async () => {
      mockRequest.body = {
        name: 'Tramo Test',
        distance_min_km: 0,
        distance_max_km: 100,
        base_price: 500,
        price_per_extra_kg: 80,
        express_multiplier: 0.5,
      };

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Datos inválidos',
        })
      );
    });

    it('debe validar que los precios no sean negativos', async () => {
      mockRequest.body = {
        name: 'Tramo Test',
        distance_min_km: 0,
        distance_max_km: 100,
        base_price: 500,
        price_per_extra_kg: -10,
      };

      await createRate(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});
