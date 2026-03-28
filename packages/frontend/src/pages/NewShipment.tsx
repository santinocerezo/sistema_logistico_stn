import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Weight, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';

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
  dest_lat: string;
  dest_lng: string;
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
    dest_lat: '',
    dest_lng: '',
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

  const set = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.origin_branch_id) errors.origin_branch_id = 'Selecciona una sucursal de origen';
    if (form.shipment_type === 'S2S' && !form.dest_branch_id) {
      errors.dest_branch_id = 'Selecciona una sucursal de destino';
    }
    if (form.shipment_type === 'S2D') {
      if (!form.dest_address) errors.dest_address = 'Ingresa la dirección de entrega';
      if (!form.dest_lat) errors.dest_lat = 'Ingresa la latitud del destino';
      if (!form.dest_lng) errors.dest_lng = 'Ingresa la longitud del destino';
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
      quotePayload.destAddress = {
        lat: parseFloat(form.dest_lat),
        lng: parseFloat(form.dest_lng),
      };
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
        payload.dest_lat = parseFloat(form.dest_lat);
        payload.dest_lng = parseFloat(form.dest_lng);
      }

      const response = await api.post('/shipments', payload);
      navigate(`/shipments/${response.data.shipment.tracking_code}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear envío');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Nuevo Envío</h1>
          <p className="text-slate-500">Completa los datos para crear tu envío</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-sky-600' : 'text-gray-400'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-sky-600' : 'bg-gray-300'} text-white`}>
              1
            </div>
            <span className="font-medium">Datos del Envío</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-sky-600' : 'text-gray-400'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-sky-600' : 'bg-gray-300'} text-white`}>
              2
            </div>
            <span className="font-medium">Confirmación</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Tipo de Envío */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Envío</CardTitle>
                <CardDescription>Selecciona cómo quieres enviar tu paquete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${form.shipment_type === 'S2S' ? 'border-sky-400 bg-sky-600/5' : 'border-border'}`}>
                    <input type="radio" name="shipment_type" value="S2S" checked={form.shipment_type === 'S2S'} onChange={() => set('shipment_type', 'S2S')} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <MapPin className="h-6 w-6 text-sky-600" />
                      <div>
                        <p className="font-bold">Sucursal a Sucursal</p>
                        <p className="text-sm text-slate-500">Más económico</p>
                      </div>
                    </div>
                  </label>
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${form.shipment_type === 'S2D' ? 'border-sky-400 bg-sky-600/5' : 'border-border'}`}>
                    <input type="radio" name="shipment_type" value="S2D" checked={form.shipment_type === 'S2D'} onChange={() => set('shipment_type', 'S2D')} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-sky-600" />
                      <div>
                        <p className="font-bold">Sucursal a Domicilio</p>
                        <p className="text-sm text-slate-500">Entrega en puerta</p>
                      </div>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Modalidad */}
            <Card>
              <CardHeader>
                <CardTitle>Modalidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${form.modality === 'Normal' ? 'border-sky-400 bg-sky-600/5' : 'border-border'}`}>
                    <input type="radio" name="modality" value="Normal" checked={form.modality === 'Normal'} onChange={() => set('modality', 'Normal')} className="sr-only" />
                    <div>
                      <p className="font-bold">Normal</p>
                      <p className="text-sm text-slate-500">3-5 días hábiles</p>
                    </div>
                  </label>
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${form.modality === 'Express' ? 'border-sky-400 bg-sky-600/5' : 'border-border'}`}>
                    <input type="radio" name="modality" value="Express" checked={form.modality === 'Express'} onChange={() => set('modality', 'Express')} className="sr-only" />
                    <div>
                      <p className="font-bold">Express</p>
                      <p className="text-sm text-slate-500">24-48 horas</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Sucursales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Sucursales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal de Origen *</label>
                  <select
                    value={form.origin_branch_id}
                    onChange={(e) => set('origin_branch_id', e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Selecciona una sucursal...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                    ))}
                  </select>
                  {formErrors.origin_branch_id && <p className="text-sm text-red-600 mt-1">{formErrors.origin_branch_id}</p>}
                </div>

                {form.shipment_type === 'S2S' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal de Destino *</label>
                    <select
                      value={form.dest_branch_id}
                      onChange={(e) => set('dest_branch_id', e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Selecciona una sucursal...</option>
                      {branches.filter((b) => b.id !== form.origin_branch_id).map((b) => (
                        <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                      ))}
                    </select>
                    {formErrors.dest_branch_id && <p className="text-sm text-red-600 mt-1">{formErrors.dest_branch_id}</p>}
                  </div>
                )}

                {form.shipment_type === 'S2D' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega *</label>
                      <input
                        type="text"
                        value={form.dest_address}
                        onChange={(e) => set('dest_address', e.target.value)}
                        placeholder="Av. Ejemplo 1234, Ciudad"
                        className="input w-full"
                      />
                      {formErrors.dest_address && <p className="text-sm text-red-600 mt-1">{formErrors.dest_address}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitud *</label>
                        <input
                          type="number"
                          step="any"
                          value={form.dest_lat}
                          onChange={(e) => set('dest_lat', e.target.value)}
                          placeholder="-34.6037"
                          className="input w-full"
                        />
                        {formErrors.dest_lat && <p className="text-sm text-red-600 mt-1">{formErrors.dest_lat}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitud *</label>
                        <input
                          type="number"
                          step="any"
                          value={form.dest_lng}
                          onChange={(e) => set('dest_lng', e.target.value)}
                          placeholder="-58.3816"
                          className="input w-full"
                        />
                        {formErrors.dest_lng && <p className="text-sm text-red-600 mt-1">{formErrors.dest_lng}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dimensiones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Weight className="h-5 w-5" />
                  Dimensiones y Peso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Peso (kg)"
                    type="number"
                    step="0.1"
                    placeholder="5.0"
                    value={form.weight_kg}
                    onChange={(e) => set('weight_kg', e.target.value)}
                    error={formErrors.weight_kg}
                  />
                  <Input
                    label="Largo (cm)"
                    type="number"
                    placeholder="30"
                    value={form.length_cm}
                    onChange={(e) => set('length_cm', e.target.value)}
                    error={formErrors.length_cm}
                  />
                  <Input
                    label="Ancho (cm)"
                    type="number"
                    placeholder="20"
                    value={form.width_cm}
                    onChange={(e) => set('width_cm', e.target.value)}
                    error={formErrors.width_cm}
                  />
                  <Input
                    label="Alto (cm)"
                    type="number"
                    placeholder="15"
                    value={form.height_cm}
                    onChange={(e) => set('height_cm', e.target.value)}
                    error={formErrors.height_cm}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contenido */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Contenido</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={form.content_type}
                  onChange={(e) => set('content_type', e.target.value as any)}
                  className="input w-full"
                >
                  <option value="estandar">Estándar</option>
                  <option value="fragil">Frágil</option>
                  <option value="perecedero">Perecedero</option>
                  <option value="peligroso">Peligroso</option>
                </select>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/shipments')}>
                Cancelar
              </Button>
              <Button onClick={handleQuote} loading={loading}>
                Cotizar Envío
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && quote && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Resumen del Envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Costo Base:</span>
                    <span className="font-medium">${quote.base_cost?.toFixed(2)}</span>
                  </div>
                  {quote.last_mile_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Última Milla:</span>
                      <span className="font-medium">${quote.last_mile_cost?.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.express_surcharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Recargo Express:</span>
                      <span className="font-medium">${quote.express_surcharge?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Distancia:</span>
                    <span>{quote.distance_km?.toFixed(0)} km</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-sky-600">
                        ${quote.total_cost?.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Entrega estimada: {quote.estimated_delivery_days} día{quote.estimated_delivery_days !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver
              </Button>
              <Button onClick={handleCreate} loading={loading}>
                Confirmar y Crear Envío
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
