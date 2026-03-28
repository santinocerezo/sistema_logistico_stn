/**
 * Controller para el módulo de pagos
 * Valida: Requerimientos 45.1-46.5, 13.1-13.6
 */

import { Request, Response } from 'express';
import pool from '../../db/pool';
import crypto from 'crypto';

// Simulación de pasarela de pago (en producción usar Stripe/MercadoPago)
interface PaymentGatewayResponse {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

async function processPaymentGateway(
  _amount: number,
  _paymentMethod: string,
  _cardToken?: string
): Promise<PaymentGatewayResponse> {
  // Simulación: 95% de éxito
  const success = Math.random() > 0.05;
  
  if (success) {
    return {
      success: true,
      transaction_id: `TXN${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`,
    };
  } else {
    return {
      success: false,
      error: 'Pago rechazado por la pasarela',
    };
  }
}

/**
 * Encripta datos sensibles con AES-256-GCM
 */
function encryptData(data: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-32-byte-key-for-testing!!', 'utf-8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * POST /payments/topup — Recarga de saldo
 * Valida: Requerimientos 45.1-45.10, 46.1-46.5
 */
export async function topUpBalance(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  
  try {
    const { amount, payment_method, card_token, save_card } = req.body;
    const userId = (req as any).user.userId;

    // Validar monto
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Monto inválido' });
      return;
    }

    if (amount < 100) {
      res.status(400).json({ error: 'El monto mínimo de recarga es $100' });
      return;
    }

    await client.query('BEGIN');

    // Procesar pago con pasarela
    const paymentResult = await processPaymentGateway(amount, payment_method, card_token);

    if (!paymentResult.success) {
      await client.query('ROLLBACK');
      res.status(422).json({
        error: 'Pago rechazado',
        message: paymentResult.error,
      });
      return;
    }

    // Actualizar saldo del usuario
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount, userId]
    );

    // Obtener nuevo saldo
    const balanceResult = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    const newBalance = parseFloat(balanceResult.rows[0].balance);

    // Registrar transacción
    const transactionResult = await client.query(
      `INSERT INTO transactions 
       (user_id, type, amount, balance_after, concept, payment_method, external_tx_id, status)
       VALUES ($1, 'recarga', $2, $3, $4, $5, $6, 'completado')
       RETURNING *`,
      [
        userId,
        amount,
        newBalance,
        'Recarga de saldo',
        payment_method,
        paymentResult.transaction_id,
      ]
    );

    // Guardar método de pago si se solicita
    if (save_card && card_token) {
      const encryptedToken = encryptData(card_token);
      const lastFour = card_token.slice(-4);
      
      await client.query(
        `INSERT INTO payment_methods 
         (user_id, card_type, last_four, brand, token_enc, is_default)
         VALUES ($1, $2, $3, $4, $5, false)
         ON CONFLICT DO NOTHING`,
        [userId, payment_method, lastFour, 'Visa', encryptedToken]
      );
    }

    await client.query('COMMIT');

    // TODO: Enviar recibo por email (tarea 13.2)

    res.status(200).json({
      message: 'Recarga exitosa',
      transaction: transactionResult.rows[0],
      new_balance: newBalance,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[topUpBalance] Error:', error);
    res.status(500).json({ error: 'Error al procesar recarga' });
  } finally {
    client.release();
  }
}

/**
 * GET /payments/transactions — Historial de transacciones
 * Valida: Requerimientos 13.1-13.6
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, s.tracking_code
      FROM transactions t
      LEFT JOIN shipments s ON t.shipment_id = s.id
      WHERE t.user_id = $1
    `;
    
    const params: any[] = [userId];

    if (start_date) {
      query += ` AND t.created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND t.created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      transactions: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[getTransactions] Error:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
}

/**
 * GET /payments/receipts/:id — Descargar recibo
 * Valida: Requerimiento 13.2
 */
export async function getReceipt(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Recibo no encontrado' });
      return;
    }

    // TODO: Generar PDF del recibo (implementación futura)
    res.status(200).json({
      message: 'Recibo disponible',
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error('[getReceipt] Error:', error);
    res.status(500).json({ error: 'Error al obtener recibo' });
  }
}

/**
 * POST /payments/methods — Guardar método de pago
 * Valida: Requerimiento 3.2
 */
export async function savePaymentMethod(req: Request, res: Response): Promise<void> {
  try {
    const { card_type, last_four, brand, card_token, is_default } = req.body;
    const userId = (req as any).user.userId;

    if (!card_token) {
      res.status(400).json({ error: 'Token de tarjeta requerido' });
      return;
    }

    const encryptedToken = encryptData(card_token);

    const result = await pool.query(
      `INSERT INTO payment_methods 
       (user_id, card_type, last_four, brand, token_enc, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, card_type, last_four, brand, is_default, created_at`,
      [userId, card_type, last_four, brand, encryptedToken, is_default || false]
    );

    res.status(201).json({
      message: 'Método de pago guardado',
      payment_method: result.rows[0],
    });
  } catch (error) {
    console.error('[savePaymentMethod] Error:', error);
    res.status(500).json({ error: 'Error al guardar método de pago' });
  }
}

/**
 * GET /payments/methods — Listar métodos de pago guardados
 * Valida: Requerimiento 3.2
 */
export async function getPaymentMethods(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;

    const result = await pool.query(
      `SELECT id, card_type, last_four, brand, is_default, created_at
       FROM payment_methods
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.status(200).json({
      payment_methods: result.rows,
    });
  } catch (error) {
    console.error('[getPaymentMethods] Error:', error);
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
}
