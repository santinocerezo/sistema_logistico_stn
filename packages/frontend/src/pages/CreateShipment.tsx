import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

interface Branch {
  id: string;
  name: string;
  address: string;
}

export const CreateShipment = () => {
  const navigate = useNavigate();
  const { user, updateBalance } = useAuthStore();
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [quote, setQuote] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    shipmentType: 'S2D',
    originBranchId: '',
    destBranchId: '',
    destAddress: '',
    destLat: 0,
    destLng: 0,
    weightKg: 1,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    contentType: 'standard',
    modality: 'Normal',
    hasInsurance: false,
    declaredValue: 0,
    specialInstructions: '',
    promoCode: '',
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const calculateQuote = async () => {
    try {
      setLoading(true);
      const response = await api.post('/shipments/quote', {
        shipmentType: formData.shipmentType,
        originBranchId: formData.originBranchId,
        destBranchId: formData.shipmentType === 'S2S' ? formData.destBranchId : undefined,
        destAddress: formData.shipmentType === 'S2D' ? formData.destAddress : undefined,
        weightKg: formData.weightKg,
        lengthCm: formData.lengthCm,
        widthCm: formData.widthCm,
        heightCm: formData.heightCm,
        modality: formData.modality,
        hasInsurance: formData.hasInsurance,
        declaredValue: formData.declaredValue,
        promoCode: formData.promoCode || undefined,
      });
      setQuote(response.data.totalCost);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al calcular cotización');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!quote) {
      setError('Primero debes calcular la cotización');
      return;
    }

    if (user && user.balance < quote) {
      setError('Saldo insuficiente. Por favor recarga tu cuenta.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/shipments', formData);
      const { trackingCode, verificationCode } = response.data;
      
      updateBalance(user!.balance - quote);
      
      alert(`Envío creado exitosamente!\n\nCódigo de seguimiento: ${trackingCode}\nCódigo de verificación: ${verificationCode}\n\nSe ha enviado esta información a tu correo.`);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear envío');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
    setQuote(null);
  };

  const nextStep = () => {
    if (step === 1 && !formData.originBranchId) {
      setError('Selecciona una sucursal de origen');
      return;
    }
    if (step === 2) {
      if (formData.shipmentType === 'S2S' && !formData.destBranchId) {
        setError('Selecciona una sucursal de destino');
        return;
      }
      if (formData.shipmentType === 'S2D' && !formData.destAddress) {
        setError('Ingresa la dirección de destino');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => navigate('/dashboard')} className="text-xl font-bold text-gray-900">
                ← STN PQ's
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Envío</h2>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-24 h-1 ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Tipo</span>
              <span>Destino</span>
              <span>Detalles</span>
              <span>Confirmar</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Envío
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shipmentType: 'S2S' })}
                    className={`p-4 border-2 rounded-lg ${
                      formData.shipmentType === 'S2S'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium">Sucursal a Sucursal</p>
                    <p className="text-sm text-gray-600 mt-1">Retiro en sucursal</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shipmentType: 'S2D' })}
                    className={`p-4 border-2 rounded-lg ${
                      formData.shipmentType === 'S2D'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium">Sucursal a Domicilio</p>
                    <p className="text-sm text-gray-600 mt-1">Entrega a domicilio</p>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="originBranchId" className="block text-sm font-medium text-gray-700">
                  Sucursal de Origen
                </label>
                <select
                  id="originBranchId"
                  name="originBranchId"
                  value={formData.originBranchId}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecciona una sucursal</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.address}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={nextStep}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                Siguiente
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {formData.shipmentType === 'S2S' ? (
                <div>
                  <label htmlFor="destBranchId" className="block text-sm font-medium text-gray-700">
                    Sucursal de Destino
                  </label>
                  <select
                    id="destBranchId"
                    name="destBranchId"
                    value={formData.destBranchId}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecciona una sucursal</option>
                    {branches.filter(b => b.id !== formData.originBranchId).map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} - {branch.address}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="destAddress" className="block text-sm font-medium text-gray-700">
                    Dirección de Destino
                  </label>
                  <textarea
                    id="destAddress"
                    name="destAddress"
                    value={formData.destAddress}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Calle, número, ciudad, código postal"
                  />
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={prevStep}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weightKg" className="block text-sm font-medium text-gray-700">
                    Peso (kg)
                  </label>
                  <input
                    id="weightKg"
                    name="weightKg"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.weightKg}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="contentType" className="block text-sm font-medium text-gray-700">
                    Tipo de Contenido
                  </label>
                  <select
                    id="contentType"
                    name="contentType"
                    value={formData.contentType}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="standard">Estándar</option>
                    <option value="fragile">Frágil</option>
                    <option value="perishable">Perecedero</option>
                    <option value="dangerous">Peligroso</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensiones (cm)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      name="lengthCm"
                      type="number"
                      min="1"
                      value={formData.lengthCm}
                      onChange={handleChange}
                      placeholder="Largo"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <input
                      name="widthCm"
                      type="number"
                      min="1"
                      value={formData.widthCm}
                      onChange={handleChange}
                      placeholder="Ancho"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <input
                      name="heightCm"
                      type="number"
                      min="1"
                      value={formData.heightCm}
                      onChange={handleChange}
                      placeholder="Alto"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalidad
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, modality: 'Normal' })}
                    className={`p-4 border-2 rounded-lg ${
                      formData.modality === 'Normal'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium">Normal</p>
                    <p className="text-sm text-gray-600 mt-1">Entrega estándar</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, modality: 'Express' })}
                    className={`p-4 border-2 rounded-lg ${
                      formData.modality === 'Express'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <p className="font-medium">Express</p>
                    <p className="text-sm text-gray-600 mt-1">+40% más rápido</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="hasInsurance"
                    checked={formData.hasInsurance}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Contratar seguro</span>
                </label>
                {formData.hasInsurance && (
                  <input
                    name="declaredValue"
                    type="number"
                    min="0"
                    value={formData.declaredValue}
                    onChange={handleChange}
                    placeholder="Valor declarado"
                    className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
              </div>

              <div>
                <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700">
                  Instrucciones Especiales (opcional)
                </label>
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700">
                  Código Promocional (opcional)
                </label>
                <input
                  id="promoCode"
                  name="promoCode"
                  type="text"
                  value={formData.promoCode}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={prevStep}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Envío</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Tipo:</dt>
                    <dd className="font-medium">{formData.shipmentType === 'S2S' ? 'Sucursal a Sucursal' : 'Sucursal a Domicilio'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Modalidad:</dt>
                    <dd className="font-medium">{formData.modality}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Peso:</dt>
                    <dd className="font-medium">{formData.weightKg} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Dimensiones:</dt>
                    <dd className="font-medium">{formData.lengthCm} x {formData.widthCm} x {formData.heightCm} cm</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Seguro:</dt>
                    <dd className="font-medium">{formData.hasInsurance ? `Sí ($${formData.declaredValue})` : 'No'}</dd>
                  </div>
                </dl>
              </div>

              {!quote && (
                <button
                  onClick={calculateQuote}
                  disabled={loading}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Calculando...' : 'Calcular Cotización'}
                </button>
              )}

              {quote && (
                <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Costo Total:</span>
                    <span className="text-3xl font-bold text-primary-600">${parseFloat(String(quote || 0)).toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Tu saldo actual: ${parseFloat(String(user?.balance || 0)).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={prevStep}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !quote}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Confirmar Envío'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateShipment;
