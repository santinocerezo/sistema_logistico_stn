import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  listRates,
  getActiveRates,
  createRate,
  updateRate,
  deleteRate,
} from './rates.controller';

const router = Router();

// Todos los endpoints requieren autenticación y rol de administrador
router.use(authenticate, requireRole('admin'));

// GET /admin/rates - Listar todas las tarifas con historial (Req 27.7)
router.get('/', listRates);

// GET /admin/rates/active - Obtener tarifas activas vigentes (Req 27.6)
router.get('/active', getActiveRates);

// POST /admin/rates - Crear nueva versión de tarifas (Req 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.16)
router.post('/', createRate);

// PUT /admin/rates/:id - Actualizar tarifa (solo si no está vigente aún) (Req 27.2, 27.16)
router.put('/:id', updateRate);

// DELETE /admin/rates/:id - Desactivar tarifa (soft delete) (Req 27.2)
router.delete('/:id', deleteRate);

export default router;
