import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import {
  createIncident,
  listIncidents,
  createClaim,
  listClaims,
  resolveClaim,
  createTicket,
  listTickets,
  listAllTickets,
  updateTicket,
} from './incidents.controller';

const router = Router();

/**
 * Incidencias
 */
router.post('/incidents', authenticateToken, createIncident);
router.get('/incidents', authenticateToken, listIncidents);

/**
 * Reclamaciones
 */
router.post('/claims', authenticateToken, createClaim);
router.get('/claims', authenticateToken, listClaims);

/**
 * Tickets de soporte
 */
router.post('/tickets', authenticateToken, createTicket);
router.get('/tickets', authenticateToken, listTickets);

/**
 * Admin - Reclamaciones
 */
router.patch('/admin/claims/:id/resolve', authenticateToken, requireAdmin, resolveClaim);

/**
 * Admin - Tickets
 */
router.get('/admin/tickets', authenticateToken, requireAdmin, listAllTickets);
router.patch('/admin/tickets/:id', authenticateToken, requireAdmin, updateTicket);

export default router;
