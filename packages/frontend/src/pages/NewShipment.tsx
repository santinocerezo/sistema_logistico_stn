import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Weight, DollarSign, ArrowRight, ArrowLeft, Truck, Zap, CheckCircle, Box } from 'lucide-react';
import api from '../lib/api';

/* ─── Nominatim Autocomplete ─────────────────────────────────────────── */

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  error?: string;
}) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      }
    }, 400);
  };

  const handleSelect = (item: NominatimResult) => {
    onSelect(item.display_name, parseFloat(item.lat), parseFloat(item.lon));
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>
        Dirección de entrega *
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
        autoComplete="off"
        className="w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all"
        style={{ borderColor: error ? '#EF4444' : '#E2E8F0', background: '#fff', fontFamily: "'Inter', sans-serif" }}
        onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = '#38BDF8'; }}
        onBlurCapture={(e) => { if (!error) e.currentTarget.style.borderColor = '#E2E8F0'; }}
      />
      {open && (
        <ul
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl bg-white"
          style={{ border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
        >
          {results.map((item) => (
            <li
              key={item.place_id}
              onMouseDown={() => handleSelect(item)}
              className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-sky-50"
              style={{ color: '#334155', borderBottom: '1px solid #F8FAFC' }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: '#0284C7' }} />
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Branch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface QuoteBreakdown {
  base_cost: number;
  last_mile_cost: number;
  express_surcharge: number;
  total_cost: number;
  distance_km: number;
  estimated_delivery_days: number;
}

interface FormData {
  origin_branch_id: string;
  dest_branch_id: string;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  shipment_type: 'S2S' | 'S2D';
  modality: 'Normal' | 'Express';
  weight_kg: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  content_type: 'estandar' | 'fragil' | 'perecedero' | 'peligroso';
  declared_value: string;
  has_insurance: boolean;
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-white"
      style={{ border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#F0F9FF' }}>
          <Icon className="h-4 w-4" style={{ color: '#0284C7' }} />
        </div>
        <h3 className="font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>
      {children}
    </label>
  );
}

function StyledSelect({ value, onChange, children, error }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all"
        style={{ borderColor: error ? '#EF4444' : '#E2E8F0', background: '#fff', fontFamily: "'Inter', sans-serif" }}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </>
  );
}

function StyledInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        {...props}
        className="w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition-all"
        style={{ borderColor: error ? '#EF4444' : '#E2E8F0', background: '#fff', fontFamily: "'Inter', sans-serif" }}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export default function NewShipment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    origin_branch_id: '',
    dest_branch_id: '',
    dest_address: '',
    dest_lat: 0,
    dest_lng: 0,
    shipment_type: 'S2S',
    modality: 'Normal',
    weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    content_type: 'estandar',
    declared_value: '0',
    has_insurance: false,
  });

  useEffect(() => {
    api.get('/branches')
      .then((res) => setBranches(res.data.branches || res.data || []))
      .catch(() => console.error('Error al cargar sucursales'));
  }, []);

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.origin_branch_id) errors.origin_branch_id = 'Seleccioná una sucursal de origen';
    if (form.shipment_type === 'S2S' && !form.dest_branch_id)
      errors.dest_branch_id = 'Seleccioná una sucursal de destino';
    if (form.shipment_type === 'S2D') {
      if (!form.dest_address) errors.dest_address = 'Ingresá la dirección de entrega';
      else if (!form.dest_lat || !form.dest_lng) errors.dest_address = 'Seleccioná una dirección del listado';
    }
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) errors.weight_kg = 'El peso debe ser mayor a 0';
    if (!form.length_cm || parseFloat(form.length_cm) <= 0) errors.length_cm = 'Requerido';
    if (!form.width_cm || parseFloat(form.width_cm) <= 0) errors.width_cm = 'Requerido';
    if (!form.height_cm || parseFloat(form.height_cm) <= 0) errors.height_cm = 'Requerido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuote = async () => {
    if (!validate()) return;
    const originBranch = branches.find((b) => b.id === form.origin_branch_id);
    if (!originBranch) return;

    const quotePayload: any = {
      origin: { lat: parseFloat(String(originBranch.lat)), lng: parseFloat(String(originBranch.lng)) },
      shipmentType: form.shipment_type,
      modality: form.modality,
      dimensions: {
        weight_kg: parseFloat(form.weight_kg),
        length_cm: parseFloat(form.length_cm),
        width_cm: parseFloat(form.width_cm),
        height_cm: parseFloat(form.height_cm),
      },
    };

    if (form.shipment_type === 'S2S') {
      const destBranch = branches.find((b) => b.id === form.dest_branch_id);
      if (!destBranch) return;
      quotePayload.destination = { lat: parseFloat(String(destBranch.lat)), lng: parseFloat(String(destBranch.lng)) };
    } else {
      quotePayload.destAddress = { lat: form.dest_lat, lng: form.dest_lng };
    }

    try {
      setLoading(true);
      const response = await api.post('/shipments/quote', quotePayload);
      setQuote(response.data.breakdown);
      setStep(2);
    } catch (error: any) {
      alert(error.response?.data?.error || error.response?.data?.message || 'Error al cotizar');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const payload: any = {
        origin_branch_id: form.origin_branch_id,
        shipment_type: form.shipment_type,
        modality: form.modality,
        weight_kg: parseFloat(form.weight_kg),
        length_cm: parseFloat(form.length_cm),
        width_cm: parseFloat(form.width_cm),
        height_cm: parseFloat(form.height_cm),
        content_type: form.content_type,
        declared_value: parseFloat(form.declared_value) || 0,
        has_insurance: form.has_insurance,
      };
      if (form.shipment_type === 'S2S') {
        payload.dest_branch_id = form.dest_branch_id;
      } else {
        payload.dest_address = form.dest_address;
        payload.dest_lat = form.dest_lat;
        payload.dest_lng = form.dest_lng;
      }
      await api.post('/shipments', payload);
      navigate('/shipments', { replace: true });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear envío');
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>

      {/* Hero header */}
      <div
        className="w-full px-4 py-12"
        style={{ background: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 60%, #38BDF8 100%)' }}
      >
        <div className="container-custom max-w-4xl">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>
                Nuevo Envío
              </h1>
              <p className="mt-0.5 text-sm text-sky-200">Completá los datos y cotizá al instante</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-8 flex items-center gap-3">
            {[
              { n: 1, label: 'Datos del envío' },
              { n: 2, label: 'Confirmación' },
            ].map(({ n, label }, i, arr) => (
              <div key={n} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all"
                    style={
                      step >= n
                        ? { background: '#fff', color: '#0284C7' }
                        : { background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }
                    }
                  >
                    {step > n ? <CheckCircle className="h-4 w-4" /> : n}
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: step >= n ? '#fff' : 'rgba(255,255,255,0.55)' }}
                  >
                    {label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.25)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl py-10">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-5">

            {/* Tipo de envío */}
            <SectionCard icon={Truck} title="Tipo de Envío">
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  { value: 'S2S', icon: MapPin, title: 'Sucursal a Sucursal', sub: 'Más económico · retiro en sucursal' },
                  { value: 'S2D', icon: Package, title: 'Sucursal a Domicilio', sub: 'Entrega en puerta' },
                ] as const).map(({ value, icon: Icon, title, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('shipment_type', value)}
                    className="flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all"
                    style={
                      form.shipment_type === value
                        ? { borderColor: '#38BDF8', background: '#F0F9FF' }
                        : { borderColor: '#E2E8F0', background: '#fff' }
                    }
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: form.shipment_type === value ? '#E0F2FE' : '#F8FAFC' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: form.shipment_type === value ? '#0284C7' : '#94A3B8' }} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                    {form.shipment_type === value && (
                      <CheckCircle className="ml-auto h-5 w-5 shrink-0" style={{ color: '#0284C7' }} />
                    )}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Modalidad */}
            <SectionCard icon={Zap} title="Modalidad">
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  { value: 'Normal', title: 'Normal', sub: '3-5 días hábiles' },
                  { value: 'Express', title: 'Express', sub: '24-48 horas · +40% de costo' },
                ] as const).map(({ value, title, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('modality', value)}
                    className="flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all"
                    style={
                      form.modality === value
                        ? { borderColor: '#38BDF8', background: '#F0F9FF' }
                        : { borderColor: '#E2E8F0', background: '#fff' }
                    }
                  >
                    <div>
                      <p className="font-bold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                    {form.modality === value && (
                      <CheckCircle className="ml-auto h-5 w-5 shrink-0" style={{ color: '#0284C7' }} />
                    )}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Sucursales */}
            <SectionCard icon={MapPin} title="Origen y Destino">
              <div className="space-y-4">
                <div>
                  <FieldLabel>Sucursal de Origen *</FieldLabel>
                  <StyledSelect
                    value={form.origin_branch_id}
                    onChange={(e) => set('origin_branch_id', e.target.value)}
                    error={formErrors.origin_branch_id}
                  >
                    <option value="">Seleccioná una sucursal...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                    ))}
                  </StyledSelect>
                </div>

                {form.shipment_type === 'S2S' && (
                  <div>
                    <FieldLabel>Sucursal de Destino *</FieldLabel>
                    <StyledSelect
                      value={form.dest_branch_id}
                      onChange={(e) => set('dest_branch_id', e.target.value)}
                      error={formErrors.dest_branch_id}
                    >
                      <option value="">Seleccioná una sucursal...</option>
                      {branches.filter((b) => b.id !== form.origin_branch_id).map((b) => (
                        <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                      ))}
                    </StyledSelect>
                  </div>
                )}

                {form.shipment_type === 'S2D' && (
                  <AddressAutocomplete
                    value={form.dest_address}
                    onChange={(val) => set('dest_address', val)}
                    onSelect={(address, lat, lng) => {
                      set('dest_address', address);
                      set('dest_lat', lat);
                      set('dest_lng', lng);
                    }}
                    error={formErrors.dest_address}
                  />
                )}
              </div>
            </SectionCard>

            {/* Dimensiones */}
            <SectionCard icon={Weight} title="Dimensiones y Peso">
              <div className="grid gap-4 md:grid-cols-2">
                <StyledInput label="Peso (kg)" type="number" step="0.1" placeholder="5.0"
                  value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} error={formErrors.weight_kg} />
                <StyledInput label="Largo (cm)" type="number" placeholder="30"
                  value={form.length_cm} onChange={(e) => set('length_cm', e.target.value)} error={formErrors.length_cm} />
                <StyledInput label="Ancho (cm)" type="number" placeholder="20"
                  value={form.width_cm} onChange={(e) => set('width_cm', e.target.value)} error={formErrors.width_cm} />
                <StyledInput label="Alto (cm)" type="number" placeholder="15"
                  value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} error={formErrors.height_cm} />
              </div>
            </SectionCard>

            {/* Tipo de contenido */}
            <SectionCard icon={Box} title="Tipo de Contenido">
              <FieldLabel>Contenido del paquete</FieldLabel>
              <StyledSelect
                value={form.content_type}
                onChange={(e) => set('content_type', e.target.value as any)}
              >
                <option value="estandar">Estándar</option>
                <option value="fragil">Frágil</option>
                <option value="perecedero">Perecedero</option>
                <option value="peligroso">Peligroso</option>
              </StyledSelect>
            </SectionCard>

            {/* Acciones */}
            <div className="flex justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('/shipments')}
                className="rounded-xl border px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                style={{ borderColor: '#E2E8F0' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleQuote}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>Cotizar Envío <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && quote && (
          <div className="space-y-5">

            {/* Resumen */}
            <div
              className="rounded-2xl bg-white p-6"
              style={{ border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#F0F9FF' }}>
                  <DollarSign className="h-4 w-4" style={{ color: '#0284C7' }} />
                </div>
                <h3 className="font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Resumen de Cotización
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Costo base', value: `$${parseFloat(String(quote.base_cost || 0)).toFixed(2)}`, show: true },
                  { label: 'Última milla', value: `$${parseFloat(String(quote.last_mile_cost || 0)).toFixed(2)}`, show: parseFloat(String(quote.last_mile_cost)) > 0 },
                  { label: 'Recargo Express', value: `$${parseFloat(String(quote.express_surcharge || 0)).toFixed(2)}`, show: parseFloat(String(quote.express_surcharge)) > 0 },
                  { label: 'Distancia', value: `${parseFloat(String(quote.distance_km || 0)).toFixed(0)} km`, show: true },
                ].filter((r) => r.show).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>

              <div
                className="mt-5 rounded-xl p-4"
                style={{ background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)', border: '1px solid #BAE6FD' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Total a pagar</span>
                  <span
                    className="text-2xl font-black"
                    style={{ color: '#0284C7', fontFamily: "'Poppins', sans-serif" }}
                  >
                    ${parseFloat(String(quote.total_cost || 0)).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Entrega estimada: {quote.estimated_delivery_days} día{quote.estimated_delivery_days !== 1 ? 's' : ''} hábil{quote.estimated_delivery_days !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            {/* Detalle del envío */}
            <div
              className="rounded-2xl bg-white p-6"
              style={{ border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <h3 className="mb-4 font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Detalles del envío
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: 'Tipo', value: form.shipment_type === 'S2S' ? 'Sucursal a Sucursal' : 'Sucursal a Domicilio' },
                  { label: 'Modalidad', value: form.modality },
                  { label: 'Peso', value: `${form.weight_kg} kg` },
                  { label: 'Dimensiones', value: `${form.length_cm} × ${form.width_cm} × ${form.height_cm} cm` },
                  { label: 'Contenido', value: form.content_type.charAt(0).toUpperCase() + form.content_type.slice(1) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: '#F8FAFC' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                style={{ borderColor: '#E2E8F0' }}
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)', boxShadow: '0 4px 14px rgba(2,132,199,0.35)' }}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>Confirmar y Crear Envío <CheckCircle className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
