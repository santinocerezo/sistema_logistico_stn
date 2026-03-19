import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import {
  getDashboard,
  getCourierPerformance,
  getFinancialReport,
  exportShipments,
} from './reports.controller';

const router = Router();

/**
 * Dashboard (admin)
 */
router.get('/dashboard', authenticateToken, requireAdmin, getDashboard);

/**
 * Desempeño de repartidores (admin)
 */
router.get('/couriers/:id/performance', authenticateToken, requireAdmin, getCourierPerformance);

/**
 * Reporte financiero (admin)
 */
router.get('/financial', authenticateToken, requireAdmin, getFinancialReport);

/**
 * Exportación de envíos (usuario)
 */
router.get('/export/shipments', authenticateToken, exportShipments);

export default router;
