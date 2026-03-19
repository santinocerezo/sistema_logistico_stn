/**
 * Tests unitarios para el servicio de descuentos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Pool } from 'pg';
import {
  calculateVolumeDiscount,
  validatePromoCode,
  calculateDiscount,
  incrementPromoCodeUsage,
  updateUserDiscountLevel,
} from './discounts.service';

// Mock del pool de PostgreSQL
const createMockPool = (): Pool => {
  return {
    query: vi.fn(),
  } as any;
};

describe('Discounts Service', () => {
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = createMockPool();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateVolumeDiscount', () => {
    it('debe retornar 0% para menos de 10 envíos', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '5' }],
      } as any);

      const discount = await calculateVolumeDiscount('user-id', mockPool);
      expect(discount).toBe(0);
    });

    it('debe retornar 5% para 10-49 envíos', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '25' }],
      } as any);

      const discount = await calculateVolumeDiscount('user-id', mockPool);
      expect(discount).toBe(5);
    });

    it('debe retornar 10% para 50-99 envíos', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '75' }],
      } as any);

      const discount = await calculateVolumeDiscount('user-id', mockPool);
      expect(discount).toBe(10);
    });

    it('debe retornar 15% para 100+ envíos', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '150' }],
      } as any);

      const discount = await calculateVolumeDiscount('user-id', mockPool);
      expect(discount).toBe(15);
    });

    it('debe excluir envíos cancelados del conteo', async () => {
      const querySpy = vi.mocked(mockPool.query);
      querySpy.mockResolvedValueOnce({
        rows: [{ shipment_count: '10' }],
      } as any);

      await calculateVolumeDiscount('user-id', mockPool);

      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("status != 'Cancelado'"),
        ['user-id']
      );
    });
  });

  describe('validatePromoCode', () => {
    it('debe retornar null si el código no existe', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
      } as any);

      const result = await validatePromoCode('INVALID', mockPool);
      expect(result).toBeNull();
    });

    it('debe retornar null si el código está inactivo', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'TEST',
          discount_type: 'porcentaje',
          discount_value: 10,
          max_uses: null,
          used_count: 0,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          is_active: false,
        }],
      } as any);

      const result = await validatePromoCode('TEST', mockPool);
      expect(result).toBeNull();
    });

    it('debe retornar null si el código no ha comenzado su vigencia', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'FUTURE',
          discount_type: 'porcentaje',
          discount_value: 10,
          max_uses: null,
          used_count: 0,
          valid_from: futureDate,
          valid_to: null,
          is_active: true,
        }],
      } as any);

      const result = await validatePromoCode('FUTURE', mockPool);
      expect(result).toBeNull();
    });

    it('debe retornar null si el código ha expirado', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'EXPIRED',
          discount_type: 'porcentaje',
          discount_value: 10,
          max_uses: null,
          used_count: 0,
          valid_from: new Date('2024-01-01'),
          valid_to: pastDate,
          is_active: true,
        }],
      } as any);

      const result = await validatePromoCode('EXPIRED', mockPool);
      expect(result).toBeNull();
    });

    it('debe retornar null si se alcanzó el máximo de usos', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'MAXED',
          discount_type: 'porcentaje',
          discount_value: 10,
          max_uses: 100,
          used_count: 100,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          is_active: true,
        }],
      } as any);

      const result = await validatePromoCode('MAXED', mockPool);
      expect(result).toBeNull();
    });

    it('debe retornar el código si es válido', async () => {
      const validCode = {
        id: '1',
        code: 'VALID',
        discount_type: 'porcentaje' as const,
        discount_value: 10,
        max_uses: 100,
        used_count: 50,
        valid_from: new Date('2024-01-01'),
        valid_to: null,
        is_active: true,
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [validCode],
      } as any);

      const result = await validatePromoCode('VALID', mockPool);
      expect(result).toEqual(validCode);
    });
  });

  describe('calculateDiscount', () => {
    it('debe aplicar descuento por volumen si no hay código promocional', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '50' }],
      } as any);

      const result = await calculateDiscount('user-id', 10000, null, mockPool);

      expect(result.discount_amount).toBe(1000); // 10% de 10000
      expect(result.discount_type).toBe('volume');
      expect(result.discount_description).toContain('10%');
    });

    it('debe retornar sin descuento si no hay volumen ni código', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '5' }],
      } as any);

      const result = await calculateDiscount('user-id', 10000, null, mockPool);

      expect(result.discount_amount).toBe(0);
      expect(result.discount_type).toBe('none');
    });

    it('debe aplicar código promocional de porcentaje si es mayor que volumen', async () => {
      // Mock para volumen (5%)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '10' }],
      } as any);

      // Mock para código promocional (20%)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'PROMO20',
          discount_type: 'porcentaje',
          discount_value: 20,
          max_uses: null,
          used_count: 0,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          is_active: true,
        }],
      } as any);

      const result = await calculateDiscount('user-id', 10000, 'PROMO20', mockPool);

      expect(result.discount_amount).toBe(2000); // 20% de 10000
      expect(result.discount_type).toBe('promo_code');
      expect(result.discount_description).toContain('PROMO20');
    });

    it('debe aplicar código promocional de monto fijo', async () => {
      // Mock para volumen (0%)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '5' }],
      } as any);

      // Mock para código promocional (monto fijo)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'FIXED500',
          discount_type: 'monto_fijo',
          discount_value: 500,
          max_uses: null,
          used_count: 0,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          is_active: true,
        }],
      } as any);

      const result = await calculateDiscount('user-id', 10000, 'FIXED500', mockPool);

      expect(result.discount_amount).toBe(500);
      expect(result.discount_type).toBe('promo_code');
    });

    it('debe aplicar descuento por volumen si es mayor que código promocional', async () => {
      // Mock para volumen (15% = 1500)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '100' }],
      } as any);

      // Mock para código promocional (10% = 1000)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{
          id: '1',
          code: 'PROMO10',
          discount_type: 'porcentaje',
          discount_value: 10,
          max_uses: null,
          used_count: 0,
          valid_from: new Date('2024-01-01'),
          valid_to: null,
          is_active: true,
        }],
      } as any);

      const result = await calculateDiscount('user-id', 10000, 'PROMO10', mockPool);

      expect(result.discount_amount).toBe(1500); // 15% de 10000
      expect(result.discount_type).toBe('volume');
    });

    it('debe aplicar descuento por volumen si el código es inválido', async () => {
      // Mock para volumen (10%)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ shipment_count: '50' }],
      } as any);

      // Mock para código promocional inválido
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
      } as any);

      const result = await calculateDiscount('user-id', 10000, 'INVALID', mockPool);

      expect(result.discount_amount).toBe(1000); // 10% de 10000
      expect(result.discount_type).toBe('volume');
    });
  });

  describe('incrementPromoCodeUsage', () => {
    it('debe incrementar el contador de usos', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
      } as any);

      await incrementPromoCodeUsage('promo-id', mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('used_count = used_count + 1'),
        ['promo-id']
      );
    });
  });

  describe('updateUserDiscountLevel', () => {
    it('debe actualizar el nivel de descuento del usuario', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
      } as any);

      await updateUserDiscountLevel('user-id', 10, mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [10, 'user-id']
      );
    });
  });
});
