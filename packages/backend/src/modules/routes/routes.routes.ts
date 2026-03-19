import { Router } from 'express';
import { getOptimizedRoute } from './routes.controller';

const router = Router();

// GET /couriers/route/optimized - Obtener ruta optimizada
router.get('/route/optimized', getOptimizedRoute);

export default router;
