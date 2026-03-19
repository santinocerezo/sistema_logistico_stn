import 'dotenv/config';
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
import './modules/notifications/notifications.queue'; // Inicializar worker de notificaciones

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3000;

// Inicializar Socket.io
const io = initializeSocketIO(httpServer);

// Hacer io accesible en las rutas
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
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

httpServer.listen(PORT, () => {
  console.info(`🚀 Backend STN PQ's corriendo en http://localhost:${PORT}`);
  console.info(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
  console.info(`📬 Worker de notificaciones iniciado`);
});

export default app;
export { io };
