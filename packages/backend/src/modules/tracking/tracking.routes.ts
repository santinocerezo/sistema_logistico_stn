import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  confirmDelivery,
  failDelivery,
  getLiveLocation,
} from './tracking.controller';

const router = Router();

/**
 * POST /shipments/:id/delivery/confirm — Confirmar entrega
 */
router.post('/shipments/:id/delivery/confirm', authenticateToken, confirmDelivery);

/**
 * POST /shipments/:id/delivery/fail — Registrar entrega fallida
 */
router.post('/shipments/:id/delivery/fail', authenticateToken, failDelivery);

/**
 * GET /tracking/:shipmentId/live — Ubicación en tiempo real
 */
router.get('/:shipmentId/live', authenticateToken, getLiveLocation);

export default router;
