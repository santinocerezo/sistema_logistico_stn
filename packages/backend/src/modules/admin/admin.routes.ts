import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import {
  searchAllShipments,
  updateShipment,
  listUsers,
  updateUser,
  createBranch,
  listBranches,
  updateBranch,
  createCourier,
  listCouriers,
  updateCourier,
  assignCourier,
  getAuditLogs,
} from './admin.controller';

const router = Router();

// Todas las rutas requieren autenticación y rol de administrador
router.use(authenticateToken, requireAdmin);

/**
 * Gestión de envíos
 */
router.get('/shipments', searchAllShipments);
router.patch('/shipments/:id', updateShipment);
router.post('/shipments/:id/assign', assignCourier);

/**
 * Gestión de usuarios
 */
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);

/**
 * Gestión de sucursales
 */
router.post('/branches', createBranch);
router.get('/branches', listBranches);
router.patch('/branches/:id', updateBranch);

/**
 * Gestión de repartidores
 */
router.post('/couriers', createCourier);
router.get('/couriers', listCouriers);
router.patch('/couriers/:id', updateCourier);

/**
 * Logs de auditoría
 */
router.get('/audit-logs', getAuditLogs);

export default router;
