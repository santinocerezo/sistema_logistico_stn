import { Request, Response } from 'express';
import pool from '../../db/pool';
import { localAI } from './local-ai.service';

// POST /ai/chat
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { message, sessionId } = req.body;

    if (!message) {
      res.status(400).json({ error: 'El mensaje es requerido' });
      return;
    }

    const currentSessionId = sessionId || `session_${userId}_${Date.now()}`;
    const response = await localAI.processMessage(userId, message, currentSessionId);

    res.json({ response, sessionId: currentSessionId });

  } catch (error) {
    console.error('Error en chat con IA:', error);
    res.status(500).json({
      error: 'Error al procesar tu mensaje',
      response: 'Lo siento, hubo un error. Podés llamarnos al (011) 1234-5678.',
    });
  }
}

// GET /ai/chat/history
export async function getChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;

    const result = await pool.query(
      `SELECT session_id, started_at, ended_at
       FROM ai_conversations
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({ sessions: result.rows });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

// POST /ai/chat/:sessionId/rate
export async function rateSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { sessionId } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });
      return;
    }

    await pool.query(
      `UPDATE ai_conversations SET rating = $1, ended_at = NOW()
       WHERE session_id = $2 AND user_id = $3`,
      [rating, sessionId, userId]
    );

    res.json({ message: 'Gracias por tu calificación' });

  } catch (error) {
    console.error('Error al calificar sesión:', error);
    res.status(500).json({ error: 'Error al calificar sesión' });
  }
}
