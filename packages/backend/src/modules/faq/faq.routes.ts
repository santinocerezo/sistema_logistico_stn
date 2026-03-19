import { Router } from 'express';
import { getAllFAQs, getCategories, createFAQ, updateFAQ, deleteFAQ } from './faq.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Rutas publicas (sin autenticacion)
router.get('/', getAllFAQs);
router.get('/categories', getCategories);

// Rutas de administracion (requieren autenticacion y rol admin)
router.post('/', authenticate, createFAQ);
router.put('/:id', authenticate, updateFAQ);
router.delete('/:id', authenticate, deleteFAQ);

export default router;
