import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface ShipmentStatus {
  from_status: string;
  to_status: string;
  created_at: string;
  notes?: string;
}

interface Shipment {
  tracking_code: string;
  status: string;
  shipment_type: string;
  modality: string;
  dest_address: string;
  weight_kg: number;
  total_cost: number;
  created_at: string;
  estimated_delivery_at?: string;
  origin_branch_name?: string;
  dest_branch_name?: string;
}

interface ChatMessage {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export const Tracking = () => {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const { isAuthenticated } = useAuthStore();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [history, setHistory] = useState<ShipmentStatus[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchCode, setSearchCode] = useState(trackingCode || '');

  useEffect(() => {
    if (trackingCode) {
      fetchShipmentData(trackingCode);
      const interval = setInterval(() => fetchShipmentData(trackingCode), 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [trackingCode]);

  const fetchShipmentData = async (code: string) => {
    try {
      const response = await api.get(`/shipments/track/${code}`);
      setShipment(response.data.shipment);
      setHistory(response.data.status_history || []);
      setError('');

      if (isAuthenticated && response.data.shipment?.status === 'En Entrega') {
        try {
          const chatRes = await api.get(`/chat/${response.data.shipment.id}/messages`);
          setMessages(chatRes.data.messages || []);
        } catch {
          // silently ignore chat errors
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Envío no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      setLoading(true);
      fetchShipmentData(searchCode.trim());
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !shipment) return;
    try {
      await api.post(`/chat/${(shipment as any).id}/messages`, { content: newMessage });
      setNewMessage('');
      fetchShipmentData(shipment.tracking_code);
    } catch {
      alert('Error al enviar mensaje');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pendiente': 'bg-yellow-500',
      'En Sucursal': 'bg-blue-500',
      'Asignado': 'bg-purple-500',
      'En Camino': 'bg-indigo-500',
      'En Entrega': 'bg-orange-500',
      'Entregado': 'bg-green-500',
      'Entrega_Fallida': 'bg-red-500',
      'Cancelado': 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

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
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2 max-w-lg">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Ingresa el código de seguimiento..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Buscar
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        )}

        {!loading && !error && !shipment && !trackingCode && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Ingresa un código de seguimiento para rastrear tu envío</p>
          </div>
        )}

        {!loading && shipment && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Seguimiento de Envío</h2>
              <p className="text-gray-600 mt-1">Código: {shipment.tracking_code}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Historial de Estados */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Estados</h3>
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Sin historial disponible</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item, index) => (
                        <div key={index} className="flex">
                          <div className="flex flex-col items-center mr-4">
                            <div className={`w-4 h-4 rounded-full ${getStatusColor(item.to_status)}`}></div>
                            {index < history.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium text-gray-900">{item.to_status}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(item.created_at).toLocaleString('es-AR')}
                            </p>
                            {item.notes && (
                              <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chat con Repartidor (solo si autenticado y en entrega) */}
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
                            className={`flex ${msg.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg ${
                                msg.sender_role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs mt-1 opacity-75">
                                {new Date(msg.created_at).toLocaleTimeString('es-AR')}
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={sendMessage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
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
                      <dd className="mt-1 font-medium">
                        {shipment.shipment_type === 'S2S' ? 'Sucursal a Sucursal' : 'Sucursal a Domicilio'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Modalidad</dt>
                      <dd className="mt-1 font-medium">{shipment.modality}</dd>
                    </div>
                    {shipment.origin_branch_name && (
                      <div>
                        <dt className="text-sm text-gray-600">Origen</dt>
                        <dd className="mt-1 font-medium">{shipment.origin_branch_name}</dd>
                      </div>
                    )}
                    {shipment.dest_branch_name && (
                      <div>
                        <dt className="text-sm text-gray-600">Destino</dt>
                        <dd className="mt-1 font-medium">{shipment.dest_branch_name}</dd>
                      </div>
                    )}
                    {shipment.dest_address && (
                      <div>
                        <dt className="text-sm text-gray-600">Dirección de Entrega</dt>
                        <dd className="mt-1 font-medium">{shipment.dest_address}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-gray-600">Peso</dt>
                      <dd className="mt-1 font-medium">{shipment.weight_kg} kg</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Costo</dt>
                      <dd className="mt-1 font-medium">${Number(shipment.total_cost).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Fecha de Creación</dt>
                      <dd className="mt-1 font-medium">
                        {new Date(shipment.created_at).toLocaleDateString('es-AR')}
                      </dd>
                    </div>
                    {shipment.estimated_delivery_at && (
                      <div>
                        <dt className="text-sm text-gray-600">Entrega Estimada</dt>
                        <dd className="mt-1 font-medium">
                          {new Date(shipment.estimated_delivery_at).toLocaleDateString('es-AR')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
