import { Router } from 'express';
import { publicQuoteRateLimiter } from '../../middleware/rateLimiter';
import {
  getPublicQuote,
  createShipment,
  updateShipmentStatus,
  listUserShipments,
  getShipmentByTrackingCode,
  getPublicShipmentTracking,
  cancelShipment
} from './shipments.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

/**
 * POST /shipments/quote — Cotización pública sin autenticación
 * Rate limit: 10 req/hora por IP (Req 6.4)
 * Valida: Requerimientos 51.1, 51.2, 51.3, 15.17
 */
router.post('/quote', publicQuoteRateLimiter, getPublicQuote);

/**
 * GET /shipments/track/:trackingCode — Seguimiento público sin autenticación
 */
router.get('/track/:trackingCode', getPublicShipmentTracking);

/**
 * POST /shipments — Crear un nuevo envío (requiere autenticación)
 * Valida: Requerimientos 15.1-15.17
 */
router.post('/', authenticateToken, createShipment);

/**
 * GET /shipments — Listar envíos del usuario autenticado
 * Valida: Requerimientos 11.1-11.4
 */
router.get('/', authenticateToken, listUserShipments);

/**
 * GET /shipments/:trackingCode — Obtener detalle por código de seguimiento
 * Valida: Requerimientos 12.1-12.6
 */
router.get('/:trackingCode', authenticateToken, getShipmentByTrackingCode);

/**
 * PATCH /shipments/:id/status — Actualizar estado de envío
 * Valida: Requerimientos 10.1-10.8
 */
router.patch('/:id/status', authenticateToken, updateShipmentStatus);

/**
 * POST /shipments/:id/cancel — Cancelar envío
 * Valida: Requerimientos 47.1-47.13
 */
router.post('/:id/cancel', authenticateToken, cancelShipment);

export default router;
