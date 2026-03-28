import { Router } from 'express';
import { getChatHistory, sendChatMessage } from './chat.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// GET /chat/:shipmentId/messages - Historial de mensajes
router.get('/:shipmentId/messages', authenticateToken, getChatHistory);

// POST /chat/:shipmentId/messages - Enviar mensaje
router.post('/:shipmentId/messages', authenticateToken, sendChatMessage);

export default router;
