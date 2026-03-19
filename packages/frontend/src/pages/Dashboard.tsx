import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Clock, CheckCircle, Plus, DollarSign, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

interface DashboardStats {
  total_shipments: number;
  active_shipments: number;
  delivered_shipments: number;
  pending_shipments: number;
}

interface RecentShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  total_cost: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [shipmentsRes] = await Promise.all([
        api.get('/shipments?limit=5'),
      ]);

      const shipments = shipmentsRes.data.shipments || [];
      setRecentShipments(shipments);

      // Calcular stats
      const stats: DashboardStats = {
        total_shipments: shipments.length,
        active_shipments: shipments.filter((s: any) => 
          ['En_Camino', 'En_Entrega', 'Asignado'].includes(s.status)
        ).length,
        delivered_shipments: shipments.filter((s: any) => s.status === 'Entregado').length,
        pending_shipments: shipments.filter((s: any) => s.status === 'Pendiente').length,
      };
      setStats(stats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">
            Bienvenido, {user?.full_name}
          </h1>
          <p className="text-muted-foreground">Aquí está el resumen de tu cuenta</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Disponible</p>
                  <p className="text-2xl font-bold text-[hsl(var(--primary))]">
                    ${user?.balance?.toFixed(2)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                  <DollarSign className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Envíos Activos</p>
                  <p className="text-2xl font-bold">{stats?.active_shipments || 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entregados</p>
                  <p className="text-2xl font-bold">{stats?.delivered_shipments || 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Envíos</p>
                  <p className="text-2xl font-bold">{stats?.total_shipments || 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Acciones Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/shipments/new">
              <Card hover className="h-full">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Nuevo Envío</h3>
                    <p className="text-sm text-muted-foreground">Crear un envío</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/payments/recharge">
              <Card hover className="h-full">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Recargar Saldo</h3>
                    <p className="text-sm text-muted-foreground">Agregar fondos</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ai-chat">
              <Card hover className="h-full">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Asistente IA</h3>
                    <p className="text-sm text-muted-foreground">Obtener ayuda</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Envíos Recientes</CardTitle>
                <CardDescription>Tus últimos envíos realizados</CardDescription>
              </div>
              <Link to="/shipments">
                <Button variant="outline" size="sm">
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentShipments.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No tenés envíos todavía</p>
                <Link to="/shipments/new">
                  <Button variant="primary" size="sm" className="mt-4">
                    Crear Primer Envío
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                        <Package className="h-5 w-5 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <p className="font-medium">{shipment.tracking_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(shipment.created_at).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(shipment.status)}
                      <p className="font-medium">${shipment.total_cost?.toFixed(2)}</p>
                      <Link to={`/shipments/${shipment.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
