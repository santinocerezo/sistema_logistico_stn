import { Request, Response } from 'express';
import pool from '../../db/pool';
import { processAIChat } from './ai.service';
import { localAI } from './local-ai.service';

// POST /ai/chat - Conversacion con el Agente IA
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { message, sessionId, useLocal } = req.body;

    if (!message) {
      res.status(400).json({ error: 'El mensaje es requerido' });
      return;
    }

    // Generar o usar sessionId
    const currentSessionId = sessionId || `session_${userId}_${Date.now()}`;

    // Determinar qué AI usar
    // Por defecto usa AI local, solo usa OpenAI si useLocal=false y hay API key válida
    const shouldUseLocal = useLocal !== false || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-test-key';

    let aiResponse: string;
    let aiType: string;

    if (shouldUseLocal) {
      // Usar AI local (basado en reglas, sin costo)
      aiResponse = await localAI.processMessage(userId, message, currentSessionId);
      aiType = 'local';
    } else {
      // Usar OpenAI (requiere créditos)
      aiResponse = await processAIChat(userId, message, currentSessionId);
      aiType = 'openai';
    }

    res.json({
      response: aiResponse,
      sessionId: currentSessionId,
      aiType,
    });

  } catch (error) {
    console.error('Error en chat con IA:', error);
    res.status(500).json({ 
      error: 'Error al procesar tu mensaje',
      response: 'Lo siento, hubo un error. ¿Te gustaria que escalara tu consulta a un agente humano?',
    });
  }
}

// GET /ai/chat/history - Obtener historial de conversaciones
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

// POST /ai/chat/:sessionId/rate - Calificar conversacion
export async function rateSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { sessionId } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });
      return;
    }

    // Actualizar o crear rating en ai_conversations
    await pool.query(
      `UPDATE ai_conversations
       SET rating = $1, ended_at = NOW()
       WHERE session_id = $2 AND user_id = $3`,
      [rating, sessionId, userId]
    );

    res.json({ message: 'Gracias por tu calificacion' });

  } catch (error) {
    console.error('Error al calificar sesion:', error);
    res.status(500).json({ error: 'Error al calificar sesion' });
  }
}
