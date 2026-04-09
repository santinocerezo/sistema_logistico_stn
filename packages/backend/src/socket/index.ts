import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import pool from '../db/pool';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

interface LocationUpdate {
  shipmentId: number;
  latitude: number;
  longitude: number;
}

export function initializeSocketIO(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
    },
  });

  // Middleware de autenticacion para Socket.io
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = verify(token, process.env.JWT_SECRET!) as { userId: number; role: string };
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Usuario conectado: ${socket.userId} (${socket.userRole})`);

    // Unirse a room de un envio especifico
    socket.on('shipment:join', (shipmentId: number) => {
      socket.join(`shipment:${shipmentId}`);
      console.log(`Usuario ${socket.userId} se unio a shipment:${shipmentId}`);
    });

    // Salir de room de un envio
    socket.on('shipment:leave', (shipmentId: number) => {
      socket.leave(`shipment:${shipmentId}`);
      console.log(`Usuario ${socket.userId} salio de shipment:${shipmentId}`);
    });

    // Actualizacion de ubicacion GPS del repartidor
    socket.on('location:update', async (data: LocationUpdate) => {
      try {
        if (socket.userRole !== 'courier') {
          socket.emit('error', { message: 'No autorizado para enviar ubicacion' });
          return;
        }

        const { shipmentId, latitude, longitude } = data;

        await pool.query(
          `UPDATE couriers 
           SET current_lat = $1, current_lng = $2, last_location_update = NOW()
           WHERE user_id = $3`,
          [latitude, longitude, socket.userId]
        );

        const shipmentResult = await pool.query(
          `SELECT 
            s.id,
            s.destination_lat,
            s.destination_lng,
            s.status
           FROM shipments s
           JOIN couriers c ON s.courier_id = c.id
           WHERE s.id = $1 AND c.user_id = $2 AND s.status IN ('En_Camino', 'En_Entrega')`,
          [shipmentId, socket.userId]
        );

        if (shipmentResult.rows.length === 0) {
          return;
        }

        const shipment = shipmentResult.rows[0];
        const eta = calculateETA(
          latitude,
          longitude,
          shipment.destination_lat,
          shipment.destination_lng
        );

        io.to(`shipment:${shipmentId}`).emit('location:updated', {
          shipmentId,
          latitude,
          longitude,
          eta,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('Error al actualizar ubicacion:', error);
        socket.emit('error', { message: 'Error al actualizar ubicacion' });
      }
    });

    // Chat en tiempo real
    socket.on('chat:join', (shipmentId: number) => {
      socket.join(`chat:${shipmentId}`);
      console.log(`Usuario ${socket.userId} se unio al chat del envio ${shipmentId}`);
    });

    socket.on('chat:message', async (data: { shipmentId: number; message: string }) => {
      try {
        const { shipmentId, message } = data;

        const result = await pool.query(
          `INSERT INTO chat_messages (shipment_id, sender_id, message, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, shipment_id, sender_id, message, created_at`,
          [shipmentId, socket.userId, message]
        );

        const savedMessage = result.rows[0];

        const userResult = await pool.query(
          `SELECT id, full_name, role FROM users WHERE id = $1`,
          [socket.userId]
        );

        const messageData = {
          ...savedMessage,
          sender: userResult.rows[0],
        };

        io.to(`chat:${shipmentId}`).emit('chat:message', messageData);

      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });

    socket.on('chat:typing', (data: { shipmentId: number; isTyping: boolean }) => {
      socket.to(`chat:${data.shipmentId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    // Notificaciones en tiempo real
    socket.on('notifications:join', () => {
      socket.join(`notifications:${socket.userId}`);
    });

    // Dashboard en tiempo real
    socket.on('dashboard:join', () => {
      if (socket.userRole === 'admin') {
        socket.join('dashboard:admin');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.userId}`);
    });
  });

  return io;
}

function calculateETA(
  currentLat: number,
  currentLng: number,
  destLat: number,
  destLng: number
): number {
  const distance = haversine(currentLat, currentLng, destLat, destLng);
  const averageSpeed = parseFloat(process.env.COURIER_AVERAGE_SPEED ?? '30');
  const etaMinutes = (distance / averageSpeed) * 60;
  return Math.round(etaMinutes);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export { Server as SocketIOServer };
