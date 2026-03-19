import { Router } from 'express';
import { chat, getChatHistory, rateSession } from './ai.controller';

const router = Router();

// POST /ai/chat - Conversacion con IA
router.post('/chat', chat);

// GET /ai/chat/history - Historial de conversaciones
router.get('/chat/history', getChatHistory);

// POST /ai/chat/:sessionId/rate - Calificar sesion
router.post('/chat/:sessionId/rate', rateSession);

export default router;
