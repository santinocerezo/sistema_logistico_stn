import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  getProfile,
  updateProfile,
  createAddress,
  listAddresses,
  updateAddress,
  deleteAddress,
} from './profile.controller';

const router = Router();

/**
 * Perfil de usuario
 */
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);

/**
 * Libreta de direcciones
 */
router.post('/addresses', authenticateToken, createAddress);
router.get('/addresses', authenticateToken, listAddresses);
router.patch('/addresses/:id', authenticateToken, updateAddress);
router.delete('/addresses/:id', authenticateToken, deleteAddress);

export default router;
