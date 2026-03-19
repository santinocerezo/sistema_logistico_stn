import { useEffect, useState } from 'react';
import api from '../lib/api';

interface AssignedShipment {
  id: string;
  trackingCode: string;
  status: string;
  destAddress: string;
  destLat: number;
  destLng: number;
  verificationCode: string;
}

export const CourierDashboard = () => {
  const [shipments, setShipments] = useState<AssignedShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<AssignedShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceType, setEvidenceType] = useState<'signature' | 'photo' | 'code'>('code');
  const [verificationCode, setVerificationCode] = useState('');
  const [failureReason, setFailureReason] = useState('');

  useEffect(() => {
    fetchAssignedShipments();
    startLocationTracking();
  }, []);

  const fetchAssignedShipments = async () => {
    try {
      const response = await api.get('/shipments?assigned=true');
      setShipments(response.data);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          api.post('/tracking/location', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }).catch(console.error);
        },
        console.error,
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    }
  };

  const updateStatus = async (shipmentId: string, newStatus: string) => {
    try {
      await api.patch(`/shipments/${shipmentId}/status`, { status: newStatus });
      fetchAssignedShipments();
      alert('Estado actualizado');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al actualizar estado');
    }
  };

  const confirmDelivery = async () => {
    if (!selectedShipment) return;

    if (evidenceType === 'code' && verificationCode !== selectedShipment.verificationCode) {
      alert('Código de verificación incorrecto');
      return;
    }

    try {
      await api.post(`/shipments/${selectedShipment.id}/delivery/confirm`, {
        evidenceType,
        verificationCode: evidenceType === 'code' ? verificationCode : undefined,
      });
      setSelectedShipment(null);
      setVerificationCode('');
      fetchAssignedShipments();
      alert('Entrega confirmada exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al confirmar entrega');
    }
  };

  const reportFailedDelivery = async () => {
    if (!selectedShipment || !failureReason) {
      alert('Ingresa el motivo de la entrega fallida');
      return;
    }

    try {
      await api.post(`/shipments/${selectedShipment.id}/delivery/fail`, {
        reason: failureReason,
      });
      setSelectedShipment(null);
      setFailureReason('');
      fetchAssignedShipments();
      alert('Entrega fallida registrada');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al registrar entrega fallida');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Panel de Repartidor</h1>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                En línea
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Envíos Asignados</h2>
          <p className="text-gray-600 mt-1">{shipments.length} envíos pendientes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {shipments.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No tienes envíos asignados</p>
              </div>
            ) : (
              shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
                  onClick={() => setSelectedShipment(shipment)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">{shipment.trackingCode}</p>
                      <p className="text-sm text-gray-600 mt-1">{shipment.destAddress}</p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded">
                      {shipment.status}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    {shipment.status === 'Asignado' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(shipment.id, 'En Camino');
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Iniciar Ruta
                      </button>
                    )}
                    {shipment.status === 'En Camino' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(shipment.id, 'En Entrega');
                        }}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                      >
                        Llegué al Destino
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedShipment && (
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Detalles del Envío
              </h3>
              <dl className="space-y-3 mb-6">
                <div>
                  <dt className="text-sm text-gray-600">Código de Seguimiento</dt>
                  <dd className="font-medium">{selectedShipment.trackingCode}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Dirección</dt>
                  <dd className="font-medium">{selectedShipment.destAddress}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Estado</dt>
                  <dd className="font-medium">{selectedShipment.status}</dd>
                </div>
              </dl>

              {selectedShipment.status === 'En Entrega' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Evidencia
                    </label>
                    <select
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="code">Código de Verificación</option>
                      <option value="signature">Firma Digital</option>
                      <option value="photo">Foto</option>
                    </select>
                  </div>

                  {evidenceType === 'code' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código de Verificación
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl tracking-widest"
                        placeholder="000000"
                      />
                    </div>
                  )}

                  <button
                    onClick={confirmDelivery}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Confirmar Entrega
                  </button>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reportar Entrega Fallida
                    </label>
                    <textarea
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Motivo de la entrega fallida..."
                    />
                    <button
                      onClick={reportFailedDelivery}
                      className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Registrar Entrega Fallida
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourierDashboard;
