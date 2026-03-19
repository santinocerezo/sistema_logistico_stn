import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  concept: string;
  createdAt: string;
}

export const Account = () => {
  const { user, updateBalance } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/payments/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/payments/topup', {
        amount,
        paymentMethod: 'card', // Simplificado
      });
      
      updateBalance(response.data.newBalance);
      setShowTopUp(false);
      setTopUpAmount('');
      fetchTransactions();
      alert('Recarga exitosa');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al recargar saldo');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/dashboard" className="text-xl font-bold text-gray-900">
                ← STN PQ's
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Estado de Cuenta</h2>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Saldo Disponible</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                ${user?.balance.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => setShowTopUp(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Recargar Saldo
            </button>
          </div>
        </div>

        {showTopUp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recargar Saldo</h3>
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Monto a Recargar
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTopUp(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTopUp}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {processing ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Transacciones</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No hay transacciones registradas
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{transaction.concept}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p
                        className={`font-semibold ${
                          transaction.type === 'topup' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'topup' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Saldo: ${transaction.balanceAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
