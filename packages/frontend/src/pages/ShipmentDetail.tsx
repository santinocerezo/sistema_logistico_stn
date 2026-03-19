import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, MapPin, Calendar, DollarSign, ArrowLeft, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/api';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShipment();
  }, [id]);

  const loadShipment = async () => {
    try {
      const response = await api.get(`/shipments/${id}`);
      setShipment(response.data);
    } catch (error) {
      console.error('Error loading shipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      'Pendiente': { variant: 'warning', label: 'Pendiente' },
      'En_Sucursal': { variant: 'default', label: 'En Sucursal' },
      'Asignado': { variant: 'primary', label: 'Asignado' },
      'En_Camino': { variant: 'primary', label: 'En Camino' },
      'En_Entrega': { variant: 'primary', label: 'En Entrega' },
      'Entregado': { variant: 'success', label: 'Entregado' },
      'Entrega_Fallida': { variant: 'error', label: 'Entrega Fallida' },
      'Cancelado': { variant: 'error', label: 'Cancelado' },
    };
    const config = statusMap[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-bold">Envío no encontrado</h2>
          <Button onClick={() => navigate('/shipments')}>Volver a Mis Envíos</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/shipments')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">
              {shipment.tracking_code}
            </h1>
            <p className="text-muted-foreground">Detalles del envío</p>
          </div>
          {getStatusBadge(shipment.status)}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Paquete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{shipment.shipment_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modalidad:</span>
                <span className="font-medium">{shipment.modality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso:</span>
                <span className="font-medium">{shipment.weight_kg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensiones:</span>
                <span className="font-medium">
                  {shipment.length_cm} x {shipment.width_cm} x {shipment.height_cm} cm
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Costos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo Base:</span>
                <span className="font-medium">${shipment.base_cost?.toFixed(2)}</span>
              </div>
              {shipment.last_mile_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última Milla:</span>
                  <span className="font-medium">${shipment.last_mile_cost?.toFixed(2)}</span>
                </div>
              )}
              {shipment.express_surcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recargo Express:</span>
                  <span className="font-medium">${shipment.express_surcharge?.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-[hsl(var(--primary))]">
                    ${shipment.total_cost?.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado:</span>
                <span className="font-medium">
                  {new Date(shipment.created_at).toLocaleString('es-AR')}
                </span>
              </div>
              {shipment.estimated_delivery_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega Estimada:</span>
                  <span className="font-medium">
                    {new Date(shipment.estimated_delivery_at).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
