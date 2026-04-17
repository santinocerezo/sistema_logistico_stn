import 'dotenv/config';
import path from 'path';
import fs from 'fs';

// Evitar que errores de conexión de Redis/BullMQ rompan la app en desarrollo
process.on('unhandledRejection', (reason: any) => {
  if (reason?.code === 'ECONNREFUSED' || reason?.name === 'AggregateError') return;
  console.error('Unhandled rejection:', reason);
});

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import shipmentsRoutes from './modules/shipments/shipments.routes';
import branchesRoutes from './modules/branches/branches.routes';
import adminRatesRoutes from './modules/admin/rates.routes';
import adminRoutes from './modules/admin/admin.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import trackingRoutes from './modules/tracking/tracking.routes';
import incidentsRoutes from './modules/incidents/incidents.routes';
import profileRoutes from './modules/profile/profile.routes';
import reportsRoutes from './modules/reports/reports.routes';
import chatRoutes from './modules/chat/chat.routes';
import couriersRoutes from './modules/couriers/couriers.routes';
import routesRoutes from './modules/routes/routes.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import aiRoutes from './modules/ai/ai.routes';
import { authenticate } from './middleware/auth';
import { authenticatedApiRateLimiter } from './middleware/rateLimiter';
import { initializeSocketIO } from './socket';
// Worker de notificaciones (requiere Redis — deshabilitado si no está disponible)
try {
  require('./modules/notifications/notifications.queue');
} catch {
  console.warn('⚠️  Worker de notificaciones deshabilitado (Redis no disponible)');
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3000;

// Inicializar Socket.io
const io = initializeSocketIO(httpServer);

// Hacer io accesible en las rutas
app.set('io', io);

// Middleware
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (sin rate limiting global, tienen sus propios limiters)
app.use('/auth', authRoutes);

// Shipments routes públicas (cotización sin auth con rate limiting)
app.use('/shipments', shipmentsRoutes);

// Branches públicas (sin autenticación)
app.use('/branches', branchesRoutes);

// FAQ publico (sin autenticacion)
app.use('/faq', require('./modules/faq/faq.routes').default);

// Rate limiting global para endpoints autenticados (Req 6.3)
// 100 req/min por usuario autenticado
app.use(authenticate, authenticatedApiRateLimiter);

// Rutas autenticadas
app.use('/payments', paymentsRoutes);
app.use('/tracking', trackingRoutes);
app.use('/chat', chatRoutes);
app.use('/couriers', couriersRoutes);
app.use('/couriers', routesRoutes); // Rutas de optimización
app.use('/notifications', notificationsRoutes);
app.use('/ai', aiRoutes);
app.use('/', incidentsRoutes);
app.use('/', profileRoutes);
app.use('/reports', reportsRoutes);

// Admin routes (requieren autenticación y rol admin)
app.use('/admin/rates', adminRatesRoutes);
app.use('/admin', adminRoutes);

// Servir frontend en producción
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.info(`🚀 Backend STN PQ's corriendo en http://localhost:${PORT}`);
  console.info(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
  console.info(`📬 Worker de notificaciones iniciado`);
});

export default app;
export { io };
