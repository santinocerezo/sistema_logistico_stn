import { Router } from 'express';
import { getAssignedShipments, updateAvailability } from './couriers.controller';
import { getOptimizedRoute } from '../routes/routes.controller';

const router = Router();

// GET /couriers/shipments - Envios asignados
router.get('/shipments', getAssignedShipments);

// GET /couriers/route/optimized - Ruta optimizada
router.get('/route/optimized', getOptimizedRoute);

// PATCH /couriers/availability - Actualizar disponibilidad
router.patch('/availability', updateAvailability);

export default router;
