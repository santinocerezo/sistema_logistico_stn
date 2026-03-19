import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

interface ShipmentStatus {
  fromStatus: string;
  toStatus: string;
  createdAt: string;
  notes?: string;
}

interface Shipment {
  id: string;
  trackingCode: string;
  status: string;
  shipmentType: string;
  destAddress: string;
  destLat: number;
  destLng: number;
  weightKg: number;
  totalCost: number;
  createdAt: string;
  estimatedDeliveryAt?: string;
  assignedCourier?: {
    id: string;
    fullName: string;
    phone: string;
    currentLat: number;
    currentLng: number;
  };
}

interface ChatMessage {
  id: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

export const Tracking = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [history, setHistory] = useState<ShipmentStatus[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShipmentData();
    const interval = setInterval(fetchShipmentData, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, [trackingCode]);

  const fetchShipmentData = async () => {
    try {
      const [shipmentRes, historyRes] = await Promise.all([
        api.get(`/shipments/${trackingCode}`),
        api.get(`/tracking/${trackingCode}/history`),
      ]);
      setShipment(shipmentRes.data);
      setHistory(historyRes.data);

      // Si está en entrega, cargar chat
      if (shipmentRes.data.status === 'En Entrega') {
        const chatRes = await api.get(`/chat/${shipmentRes.data.id}/messages`);
        setMessages(chatRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos del envío');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !shipment) return;

    try {
      await api.post(`/chat/${shipment.id}/messages`, {
        content: newMessage,
      });
      setNewMessage('');
      fetchShipmentData();
    } catch (err: any) {
      alert('Error al enviar mensaje');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pendiente: 'bg-yellow-500',
      'En Sucursal': 'bg-blue-500',
      Asignado: 'bg-purple-500',
      'En Camino': 'bg-indigo-500',
      'En Entrega': 'bg-orange-500',
      Entregado: 'bg-green-500',
      Entrega_Fallida: 'bg-red-500',
      Cancelado: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Envío no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-xl font-bold text-gray-900">
                ← STN PQ's
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Seguimiento de Envío</h2>
          <p className="text-gray-600 mt-1">Código: {shipment.trackingCode}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Mapa */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h3>
              <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-600">Mapa de ubicación</p>
                  {shipment.status === 'En Entrega' && shipment.assignedCourier && (
                    <div className="mt-4">
                      <p className="font-medium">Repartidor: {shipment.assignedCourier.fullName}</p>
                      <p className="text-sm text-gray-600">
                        Ubicación: {shipment.assignedCourier.currentLat.toFixed(4)}, {shipment.assignedCourier.currentLng.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Historial de Estados */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Estados</h3>
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={index} className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(item.toStatus)}`}></div>
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-900">{item.toStatus}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Información del Envío */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Estado Actual</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full text-white ${getStatusColor(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Tipo</dt>
                  <dd className="mt-1 font-medium">{shipment.shipmentType === 'S2S' ? 'Sucursal a Sucursal' : 'Sucursal a Domicilio'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Destino</dt>
                  <dd className="mt-1 font-medium">{shipment.destAddress}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Peso</dt>
                  <dd className="mt-1 font-medium">{shipment.weightKg} kg</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Costo</dt>
                  <dd className="mt-1 font-medium">${shipment.totalCost.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Fecha de Creación</dt>
                  <dd className="mt-1 font-medium">{new Date(shipment.createdAt).toLocaleDateString()}</dd>
                </div>
                {shipment.estimatedDeliveryAt && (
                  <div>
                    <dt className="text-sm text-gray-600">Entrega Estimada</dt>
                    <dd className="mt-1 font-medium">{new Date(shipment.estimatedDeliveryAt).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Chat con Repartidor */}
            {shipment.status === 'En Entrega' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Chat con Repartidor</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center">No hay mensajes</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.senderRole === 'user'
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-75">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;