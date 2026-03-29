import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Clock, CheckCircle, Plus, DollarSign, MessageSquare, ChevronRight, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

interface RecentShipment {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  total_cost: number;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'Pendiente':      { bg: '#FEF9C3', color: '#92400E', label: 'Pendiente' },
  'En Sucursal':    { bg: '#F0F9FF', color: '#0369A1', label: 'En Sucursal' },
  'Asignado':       { bg: '#EFF6FF', color: '#1D4ED8', label: 'Asignado' },
  'En Camino':      { bg: '#EFF6FF', color: '#1D4ED8', label: 'En Camino' },
  'En Entrega':     { bg: '#EFF6FF', color: '#1D4ED8', label: 'En Entrega' },
  'Entregado':      { bg: '#DCFCE7', color: '#15803D', label: 'Entregado' },
  'Entrega_Fallida':{ bg: '#FEE2E2', color: '#B91C1C', label: 'Entrega Fallida' },
  'Cancelado':      { bg: '#FEE2E2', color: '#B91C1C', label: 'Cancelado' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: '#F1F5F9', color: '#475569', label: status };
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [recentShipments, setRecentShipments] = useState<RecentShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/shipments?limit=5')
      .then((res) => setRecentShipments(res.data.shipments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    active: recentShipments.filter((s) => ['En Camino', 'En Entrega', 'Asignado'].includes(s.status)).length,
    delivered: recentShipments.filter((s) => s.status === 'Entregado').length,
    pending: recentShipments.filter((s) => s.status === 'Pendiente').length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0284C7' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="container-custom py-10">

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-black text-slate-900"
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
          >
            Bienvenido, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">Aquí está el resumen de tu cuenta</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Saldo */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', boxShadow: '0 4px 20px rgba(2,132,199,0.20)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Saldo</p>
                <p className="mt-1.5 text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  ${parseFloat(String(user?.balance || 0)).toFixed(2)}
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: 'rgba(125,211,252,0.15)' }}
              >
                <DollarSign className="h-5 w-5" style={{ color: '#7DD3FC' }} />
              </div>
            </div>
          </div>

          {[
            { label: 'Activos', value: stats.active, icon: Clock, iconBg: '#BAE6FD', color: '#0284C7' },
            { label: 'Entregados', value: stats.delivered, icon: CheckCircle, iconBg: '#BBF7D0', color: '#15803D' },
            { label: 'Pendientes', value: stats.pending, icon: TrendingUp, iconBg: '#FDE68A', color: '#B45309' },
          ].map(({ label, value, icon: Icon, iconBg, color }) => (
            <div
              key={label}
              className="rounded-2xl p-5"
              style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-1.5 text-2xl font-black text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {value}
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: iconBg }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2
            className="mb-4 text-lg font-bold text-slate-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Acciones Rápidas
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                to: '/shipments/new',
                icon: Plus,
                label: 'Nuevo Envío',
                sub: 'Crear un envío',
                grad: 'linear-gradient(135deg, #38BDF8, #0284C7)',
                shadow: '0 4px 14px rgba(2,132,199,0.25)',
              },
              {
                to: '/payments',
                icon: DollarSign,
                label: 'Recargar Saldo',
                sub: 'Agregar fondos',
                grad: 'linear-gradient(135deg, #34D399, #059669)',
                shadow: '0 4px 14px rgba(5,150,105,0.20)',
              },
              {
                to: '/ai-chat',
                icon: MessageSquare,
                label: 'Asistente IA',
                sub: 'Obtener ayuda',
                grad: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                shadow: '0 4px 14px rgba(124,58,237,0.20)',
              },
            ].map(({ to, icon: Icon, label, sub, grad, shadow }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 transition-all hover:-translate-y-0.5"
                style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = shadow; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: grad }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Shipments */}
        <div
          className="rounded-2xl bg-white"
          style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div>
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Envíos Recientes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Tus últimos envíos</p>
            </div>
            <Link to="/shipments">
              <Button variant="outline" size="sm">Ver Todos</Button>
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentShipments.length === 0 ? (
              <div className="py-16 text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: '#F0F9FF' }}
                >
                  <Package className="h-7 w-7" style={{ color: '#0284C7' }} />
                </div>
                <p className="font-semibold text-slate-700">No tenés envíos todavía</p>
                <p className="text-sm text-slate-400 mt-1">¡Creá tu primer envío ahora!</p>
                <Link to="/shipments/new" className="mt-4 inline-block">
                  <Button size="sm">Crear Primer Envío</Button>
                </Link>
              </div>
            ) : (
              recentShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#F0F9FF' }}
                  >
                    <Package className="h-4 w-4" style={{ color: '#0284C7' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{shipment.tracking_code}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(shipment.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <StatusBadge status={shipment.status} />
                  <p className="text-sm font-bold text-slate-700 w-16 text-right">
                    ${parseFloat(String(shipment.total_cost || 0)).toFixed(2)}
                  </p>
                  <Link to={`/shipments/${shipment.tracking_code}`}>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
