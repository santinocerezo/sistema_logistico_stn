import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Filter, Plus } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import api from '../lib/api';

interface Shipment {
  id: string;
  tracking_code: string;
  status: string;
  shipment_type: string;
  modality: string;
  total_cost: number;
  created_at: string;
  estimated_delivery_at: string;
}

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      const response = await api.get('/shipments');
      setShipments(response.data.shipments || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
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

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = shipment.tracking_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
          <p className="text-muted-foreground">Cargando envíos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">Mis Envíos</h1>
            <p className="text-muted-foreground">Gestiona todos tus envíos</p>
          </div>
          <Link to="/shipments/new">
            <Button variant="primary" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Envío
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código de tracking..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input pl-10"
                >
                  <option value="all">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En_Camino">En Camino</option>
                  <option value="En_Entrega">En Entrega</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipments List */}
        {filteredShipments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-bold">No se encontraron envíos</h3>
              <p className="mb-4 text-muted-foreground">
                {search || statusFilter !== 'all'
                  ? 'Intenta con otros filtros'
                  : 'Todavía no tenés envíos registrados'}
              </p>
              {!search && statusFilter === 'all' && (
                <Link to="/shipments/new">
                  <Button variant="primary">Crear Primer Envío</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredShipments.map((shipment) => (
              <Card key={shipment.id} hover>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                        <Package className="h-6 w-6 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <p className="font-bold">{shipment.tracking_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {shipment.shipment_type} - {shipment.modality}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Creado: {new Date(shipment.created_at).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(shipment.status)}
                      <div className="text-right">
                        <p className="font-bold">${shipment.total_cost?.toFixed(2)}</p>
                        {shipment.estimated_delivery_at && (
                          <p className="text-xs text-muted-foreground">
                            Est: {new Date(shipment.estimated_delivery_at).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </div>
                      <Link to={`/shipments/${shipment.id}`}>
                        <Button variant="outline" size="sm">
                          Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
