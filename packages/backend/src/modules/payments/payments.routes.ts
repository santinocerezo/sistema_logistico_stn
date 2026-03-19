import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  topUpBalance,
  getTransactions,
  getReceipt,
  savePaymentMethod,
  getPaymentMethods,
} from './payments.controller';

const router = Router();

/**
 * POST /payments/topup — Recarga de saldo
 */
router.post('/topup', authenticateToken, topUpBalance);

/**
 * GET /payments/transactions — Historial de transacciones
 */
router.get('/transactions', authenticateToken, getTransactions);

/**
 * GET /payments/receipts/:id — Descargar recibo
 */
router.get('/receipts/:id', authenticateToken, getReceipt);

/**
 * POST /payments/methods — Guardar método de pago
 */
router.post('/methods', authenticateToken, savePaymentMethod);

/**
 * GET /payments/methods — Listar métodos de pago
 */
router.get('/methods', authenticateToken, getPaymentMethods);

export default router;
