import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  updatePreferences,
  getPreferences,
} from './notifications.controller';

const router = Router();

// GET /notifications - Listar notificaciones
router.get('/', getNotifications);

// PATCH /notifications/:id/read - Marcar como leida
router.patch('/:id/read', markAsRead);

// PATCH /notifications/read-all - Marcar todas como leidas
router.patch('/read-all', markAllAsRead);

// GET /notifications/preferences - Obtener preferencias
router.get('/preferences', getPreferences);

// PUT /notifications/preferences - Actualizar preferencias
router.put('/preferences', updatePreferences);

export default router;
