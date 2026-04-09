import { useEffect, useState } from 'react';
import { Package, Zap, CheckCircle, DollarSign, AlertTriangle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';

interface DashboardMetrics {
  totalShipments: number;
  activeShipments: number;
  deliveredToday: number;
  revenue: number;
  pendingIncidents: number;
}

interface Shipment {
  id: string;
  trackingCode: string;
  status: string;
  senderEmail: string;
  destAddress: string;
  totalCost: number;
  createdAt: string;
}

type Tab = 'dashboard' | 'shipments' | 'users' | 'logs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shipments', label: 'Envíos' },
  { key: 'users', label: 'Usuarios' },
  { key: 'logs', label: 'Logs' },
];

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, shipmentsRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/admin/shipments?limit=20'),
      ]);
      setMetrics(metricsRes.data);
      setShipments(shipmentsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchShipments = async () => {
    if (!searchTerm) {
      fetchDashboardData();
      return;
    }
    try {
      const response = await api.get(`/admin/shipments?search=${searchTerm}`);
      setShipments(response.data);
    } catch (error) {
      console.error('Error searching shipments:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#BAE6FD', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ background: '#F8FAFC' }}>
      <div className="container-custom">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>
            Panel de Administración
          </h1>
          <p className="text-sm text-slate-500 mt-1">Vista general del sistema logístico</p>
        </div>

        {/* Tabs — scrollable on mobile */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: activeTab === tab.key ? '#0284C7' : '#64748B',
                  borderBottom: activeTab === tab.key ? '2px solid #0284C7' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && metrics && (
          <>
            {metrics.pendingIncidents > 0 && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">
                  Tenés <strong>{metrics.pendingIncidents}</strong> incidencias pendientes de revisión
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: '#F0F9FF' }}>
                    <Package className="h-6 w-6" style={{ color: '#0284C7' }} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Envíos</p>
                    <p className="text-2xl font-black text-slate-900">{metrics.totalShipments}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FFF7ED' }}>
                    <Zap className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Activos</p>
                    <p className="text-2xl font-black text-slate-900">{metrics.activeShipments}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: '#F0FDF4' }}>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Entregados Hoy</p>
                    <p className="text-2xl font-black text-slate-900">{metrics.deliveredToday}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FAF5FF' }}>
                    <DollarSign className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ingresos</p>
                    <p className="text-2xl font-black text-slate-900">${parseFloat(String(metrics.revenue || 0)).toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Shipments tab */}
        {activeTab === 'shipments' && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por código, usuario o destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchShipments()}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchShipments} variant="primary">
                Buscar
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      {['Código', 'Usuario', 'Destino', 'Estado', 'Costo', 'Fecha'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shipments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                          No hay envíos para mostrar
                        </td>
                      </tr>
                    ) : (
                      shipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {shipment.trackingCode}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap max-w-[160px] truncate">
                            {shipment.senderEmail}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 max-w-[180px] truncate">
                            {shipment.destAddress || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: '#F0F9FF', color: '#0284C7' }}>
                              {shipment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                            ${parseFloat(String(shipment.totalCost || 0)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                            {new Date(shipment.createdAt).toLocaleDateString('es-AR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Funcionalidad en desarrollo</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoría</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Funcionalidad en desarrollo</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
