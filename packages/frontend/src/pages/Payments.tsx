import { useState } from 'react';
import { DollarSign, CreditCard, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

export default function Payments() {
  const { user, updateBalance } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      setLoading(true);
      const response = await api.post('/payments/recharge', {
        amount: parseFloat(amount),
        payment_method: 'credito',
      });
      
      updateBalance(response.data.new_balance);
      setAmount('');
      alert('Recarga exitosa!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al recargar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">Pagos y Recargas</h1>
          <p className="text-muted-foreground">Gestiona tu saldo y métodos de pago</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Saldo Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-[hsl(var(--primary))]">
                  ${user?.balance?.toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Disponible para envíos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recargar Saldo
              </CardTitle>
              <CardDescription>Agrega fondos a tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecharge} className="space-y-4">
                <Input
                  label="Monto"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Recargar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">No hay transacciones recientes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
