import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Calendar, DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../lib/api';

const STATUS_MAP: Record<string, { variant: any; label: string }> = {
  'Pendiente':      { variant: 'warning', label: 'Pendiente' },
  'En Sucursal':    { variant: 'default', label: 'En Sucursal' },
  'Asignado':       { variant: 'primary', label: 'Asignado' },
  'En Camino':      { variant: 'primary', label: 'En Camino' },
  'En Entrega':     { variant: 'primary', label: 'En Entrega' },
  'Entregado':      { variant: 'success', label: 'Entregado' },
  'Entrega_Fallida':{ variant: 'error', label: 'Entrega Fallida' },
  'Cancelado':      { variant: 'error', label: 'Cancelado' },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-white"
      style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}
    >
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid #E2E8F0' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: '#F0F9FF' }}
        >
          <Icon className="h-4 w-4" style={{ color: '#0284C7' }} />
        </div>
        <h3 className="font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {title}
        </h3>
      </div>
      <div className="px-6">{children}</div>
    </div>
  );
}

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/shipments/${id}`)
      .then((res) => setShipment(res.data.shipment || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0284C7' }} />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#F0F9FF' }}>
          <Package className="h-7 w-7" style={{ color: '#0284C7' }} />
        </div>
        <p className="font-bold text-slate-700">Envío no encontrado</p>
        <Button onClick={() => navigate('/shipments')}>Volver a Mis Envíos</Button>
      </div>
    );
  }

  const statusConfig = STATUS_MAP[shipment.status] || { variant: 'default', label: shipment.status };

  return (
    <div className="min-h-screen py-10" style={{ background: '#F8FAFC' }}>
      <div className="container-custom max-w-3xl">

        <button
          onClick={() => navigate('/shipments')}
          className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Mis Envíos
        </button>

        {/* Header */}
        <div
          className="mb-6 flex items-center justify-between rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', boxShadow: '0 4px 20px rgba(2,132,199,0.15)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
              Código de tracking
            </p>
            <h1
              className="mt-1 text-2xl font-black text-white"
              style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.01em' }}
            >
              {shipment.tracking_code}
            </h1>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Paquete */}
          <SectionCard icon={Package} title="Información del Paquete">
            <InfoRow label="Tipo" value={shipment.shipment_type} />
            <InfoRow label="Modalidad" value={shipment.modality} />
            <InfoRow label="Peso" value={`${shipment.weight_kg} kg`} />
            <InfoRow
              label="Dimensiones"
              value={`${shipment.length_cm} × ${shipment.width_cm} × ${shipment.height_cm} cm`}
            />
          </SectionCard>

          {/* Costos */}
          <SectionCard icon={DollarSign} title="Costos">
            <InfoRow label="Costo Base" value={`$${parseFloat(shipment.base_cost || 0).toFixed(2)}`} />
            {parseFloat(shipment.last_mile_cost) > 0 && (
              <InfoRow label="Última Milla" value={`$${parseFloat(shipment.last_mile_cost).toFixed(2)}`} />
            )}
            {parseFloat(shipment.express_surcharge) > 0 && (
              <InfoRow label="Recargo Express" value={`$${parseFloat(shipment.express_surcharge).toFixed(2)}`} />
            )}
            <div className="flex items-center justify-between py-4">
              <span className="font-bold text-slate-800">Total</span>
              <span className="text-lg font-black" style={{ color: '#0284C7', fontFamily: "'Poppins', sans-serif" }}>
                ${parseFloat(shipment.total_cost || 0).toFixed(2)}
              </span>
            </div>
          </SectionCard>

          {/* Fechas */}
          <div className="lg:col-span-2">
            <SectionCard icon={Calendar} title="Fechas">
              <InfoRow
                label="Creado"
                value={new Date(shipment.created_at).toLocaleString('es-AR')}
              />
              {shipment.estimated_delivery_at && (
                <InfoRow
                  label="Entrega Estimada"
                  value={new Date(shipment.estimated_delivery_at).toLocaleString('es-AR')}
                />
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
