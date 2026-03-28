import { useEffect, useState } from 'react';
import { DollarSign, CreditCard, History, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  concept: string;
  payment_method?: string;
  created_at: string;
  tracking_code?: string;
}

export default function Payments() {
  const { user, updateBalance } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/payments/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setTxLoading(false);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      setLoading(true);
      const response = await api.post('/payments/topup', {
        amount: parseFloat(amount),
        payment_method: 'credito',
      });

      updateBalance(response.data.new_balance);
      setAmount('');
      await loadTransactions();
      alert('¡Recarga exitosa!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al recargar');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'recarga') return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      recarga: 'Recarga',
      pago_envio: 'Pago de envío',
      reembolso: 'Reembolso',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Pagos y Recargas</h1>
          <p className="text-slate-500">Gestiona tu saldo y métodos de pago</p>
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
                <p className="text-4xl font-bold text-sky-600">
                  ${user?.balance?.toFixed(2) ?? '0.00'}
                </p>
                <p className="mt-2 text-sm text-slate-500">Disponible para envíos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recargar Saldo
              </CardTitle>
              <CardDescription>Monto mínimo: $100</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecharge} className="space-y-4">
                <Input
                  label="Monto"
                  type="number"
                  step="0.01"
                  min="100"
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
            {txLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No hay transacciones recientes</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{getTypeLabel(tx.type)}</p>
                        <p className="text-xs text-slate-500">{tx.concept}</p>
                        {tx.tracking_code && (
                          <p className="text-xs text-blue-600">{tx.tracking_code}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'recarga' || tx.type === 'reembolso' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'recarga' || tx.type === 'reembolso' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Saldo: ${Number(tx.balance_after).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString('es-AR')}
                      </p>
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
