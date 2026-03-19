import { Router } from 'express';
import { getChatHistory } from './chat.controller';

const router = Router();

// GET /chat/:shipmentId/messages - Historial de mensajes
router.get('/:shipmentId/messages', getChatHistory);

export default router;
