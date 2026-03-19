import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initializeSocket(token: string): Socket {
  if (socket) {
    return socket;
  }

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    auth: {
      token,
    },
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('Socket conectado');
  });

  socket.on('disconnect', () => {
    console.log('Socket desconectado');
  });

  socket.on('error', (error) => {
    console.error('Error de socket:', error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Funciones de utilidad para eventos especificos

export function joinShipmentRoom(shipmentId: number): void {
  socket?.emit('shipment:join', shipmentId);
}

export function leaveShipmentRoom(shipmentId: number): void {
  socket?.emit('shipment:leave', shipmentId);
}

export function sendLocationUpdate(shipmentId: number, latitude: number, longitude: number): void {
  socket?.emit('location:update', { shipmentId, latitude, longitude });
}

export function joinChatRoom(shipmentId: number): void {
  socket?.emit('chat:join', shipmentId);
}

export function sendChatMessage(shipmentId: number, message: string): void {
  socket?.emit('chat:message', { shipmentId, message });
}

export function sendTypingIndicator(shipmentId: number, isTyping: boolean): void {
  socket?.emit('chat:typing', { shipmentId, isTyping });
}

export function joinNotificationsRoom(): void {
  socket?.emit('notifications:join');
}

export function joinDashboardRoom(): void {
  socket?.emit('dashboard:join');
}
