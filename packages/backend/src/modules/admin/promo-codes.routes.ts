/**
 * Rutas para gestión de códigos promocionales (Admin)
 */

import { Router } from 'express';
import {
  createPromoCode,
  listPromoCodes,
  getPromoCode,
  updatePromoCode,
  deletePromoCode,
} from './promo-codes.controller';

const router = Router();

// Todas las rutas requieren autenticación y rol de administrador
// (el middleware de autenticación se aplicará en el router principal)

router.post('/', createPromoCode);
router.get('/', listPromoCodes);
router.get('/:id', getPromoCode);
router.patch('/:id', updatePromoCode);
router.delete('/:id', deletePromoCode);

export default router;
