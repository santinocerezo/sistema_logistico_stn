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
      'En Sucursal': { variant: 'default', label: 'En Sucursal' },
      'Asignado': { variant: 'primary', label: 'Asignado' },
      'En Camino': { variant: 'primary', label: 'En Camino' },
      'En Entrega': { variant: 'primary', label: 'En Entrega' },
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#BAE6FD', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10" style={{ background: '#F8FAFC' }}>
      <div className="container-custom">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>Mis Envíos</h1>
            <p className="text-sm text-slate-500 mt-1">Gestioná todos tus envíos</p>
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
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por código de tracking..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <option value="all">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Camino">En Camino</option>
                  <option value="En Entrega">En Entrega</option>
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
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#F0F9FF' }}>
                <Package className="h-7 w-7" style={{ color: '#0284C7' }} />
              </div>
              <h3 className="mb-1 font-bold text-slate-800">No se encontraron envíos</h3>
              <p className="text-sm text-slate-400">
                {search || statusFilter !== 'all'
                  ? 'Intentá con otros filtros'
                  : 'Todavía no tenés envíos registrados'}
              </p>
              {!search && statusFilter === 'all' && (
                <Link to="/shipments/new" className="mt-4 inline-block">
                  <Button>Crear Primer Envío</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredShipments.map((shipment) => (
              <Card key={shipment.id} hover>
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: '#F0F9FF' }}>
                    <Package className="h-5 w-5" style={{ color: '#0284C7' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{shipment.tracking_code}</p>
                    <p className="text-xs text-slate-400">
                      {shipment.shipment_type} · {shipment.modality} · {new Date(shipment.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {getStatusBadge(shipment.status)}
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">${shipment.total_cost?.toFixed(2)}</p>
                      {shipment.estimated_delivery_at && (
                        <p className="text-xs text-slate-400">
                          Est: {new Date(shipment.estimated_delivery_at).toLocaleDateString('es-AR')}
                        </p>
                      )}
                    </div>
                    <Link to={`/shipments/${shipment.tracking_code}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
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
