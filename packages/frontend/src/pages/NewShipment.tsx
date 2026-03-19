import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, MapPin, Weight, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';

const shipmentSchema = z.object({
  origin_branch_id: z.string().min(1, 'Selecciona una sucursal de origen'),
  dest_branch_id: z.string().optional(),
  dest_address: z.string().optional(),
  shipment_type: z.enum(['S2S', 'S2D']),
  modality: z.enum(['Normal', 'Express']),
  weight_kg: z.number().min(0.1, 'El peso debe ser mayor a 0'),
  length_cm: z.number().min(1, 'La longitud debe ser mayor a 0'),
  width_cm: z.number().min(1, 'El ancho debe ser mayor a 0'),
  height_cm: z.number().min(1, 'La altura debe ser mayor a 0'),
  content_type: z.enum(['estandar', 'fragil', 'perecedero', 'peligroso']),
  declared_value: z.number().min(0),
  has_insurance: z.boolean(),
});

type ShipmentForm = z.infer<typeof shipmentSchema>;

export default function NewShipment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ShipmentForm>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shipment_type: 'S2S',
      modality: 'Normal',
      content_type: 'estandar',
      has_insurance: false,
      declared_value: 0,
    },
  });

  const shipmentType = watch('shipment_type');
  const modality = watch('modality');

  useState(() => {
    loadBranches();
  });

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleQuote = async (data: ShipmentForm) => {
    try {
      setLoading(true);
      const response = await api.post('/shipments/quote', data);
      setQuote(response.data);
      setStep(2);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al cotizar');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: ShipmentForm) => {
    try {
      setLoading(true);
      const response = await api.post('/shipments', data);
      navigate(`/shipments/${response.data.id}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear envío');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">Nuevo Envío</h1>
          <p className="text-muted-foreground">Completa los datos para crear tu envío</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[hsl(var(--primary))]' : 'text-gray-400'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-[hsl(var(--primary))]' : 'bg-gray-300'} text-white`}>
              1
            </div>
            <span className="font-medium">Datos del Envío</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[hsl(var(--primary))]' : 'text-gray-400'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-[hsl(var(--primary))]' : 'bg-gray-300'} text-white`}>
              2
            </div>
            <span className="font-medium">Confirmación</span>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmit(handleQuote)} className="space-y-6">
            {/* Tipo de Envío */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Envío</CardTitle>
                <CardDescription>Selecciona cómo quieres enviar tu paquete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${shipmentType === 'S2S' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-border'}`}>
                    <input type="radio" value="S2S" {...register('shipment_type')} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <MapPin className="h-6 w-6 text-[hsl(var(--primary))]" />
                      <div>
                        <p className="font-bold">Sucursal a Sucursal</p>
                        <p className="text-sm text-muted-foreground">Más económico</p>
                      </div>
                    </div>
                  </label>
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${shipmentType === 'S2D' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-border'}`}>
                    <input type="radio" value="S2D" {...register('shipment_type')} className="sr-only" />
                    <div className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-[hsl(var(--primary))]" />
                      <div>
                        <p className="font-bold">Sucursal a Domicilio</p>
                        <p className="text-sm text-muted-foreground">Entrega en puerta</p>
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
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${modality === 'Normal' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-border'}`}>
                    <input type="radio" value="Normal" {...register('modality')} className="sr-only" />
                    <div>
                      <p className="font-bold">Normal</p>
                      <p className="text-sm text-muted-foreground">3-5 días hábiles</p>
                    </div>
                  </label>
                  <label className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${modality === 'Express' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-border'}`}>
                    <input type="radio" value="Express" {...register('modality')} className="sr-only" />
                    <div>
                      <p className="font-bold">Express</p>
                      <p className="text-sm text-muted-foreground">24-48 horas</p>
                    </div>
                  </label>
                </div>
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
                    error={errors.weight_kg?.message}
                    {...register('weight_kg', { valueAsNumber: true })}
                  />
                  <Input
                    label="Largo (cm)"
                    type="number"
                    placeholder="30"
                    error={errors.length_cm?.message}
                    {...register('length_cm', { valueAsNumber: true })}
                  />
                  <Input
                    label="Ancho (cm)"
                    type="number"
                    placeholder="20"
                    error={errors.width_cm?.message}
                    {...register('width_cm', { valueAsNumber: true })}
                  />
                  <Input
                    label="Alto (cm)"
                    type="number"
                    placeholder="15"
                    error={errors.height_cm?.message}
                    {...register('height_cm', { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/shipments')}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Cotizar Envío
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </form>
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
                    <span className="text-muted-foreground">Costo Base:</span>
                    <span className="font-medium">${quote.base_cost?.toFixed(2)}</span>
                  </div>
                  {quote.last_mile_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última Milla:</span>
                      <span className="font-medium">${quote.last_mile_cost?.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.express_surcharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recargo Express:</span>
                      <span className="font-medium">${quote.express_surcharge?.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span className="font-medium">-${quote.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-[hsl(var(--primary))]">
                        ${quote.total_cost?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver
              </Button>
              <Button onClick={handleSubmit(handleCreate)} loading={loading}>
                Confirmar y Crear Envío
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
