import { Router } from 'express';
import { getActiveBranches } from './branches.controller';

const router = Router();

/**
 * GET /branches — Listar sucursales activas (público, sin autenticación)
 */
router.get('/', getActiveBranches);

export default router;
