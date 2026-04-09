import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import api from '../lib/api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/password/reset-request', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al solicitar recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)', boxShadow: '0 4px 18px rgba(2,132,199,0.30)' }}
            >
              <KeyRound className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>
            Recuperar Contraseña
          </h1>
          <p className="mt-2 text-sm text-slate-500">Te enviaremos un enlace de recuperación</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recuperar acceso</CardTitle>
            <CardDescription>Ingresá tu email y te enviamos el enlace</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
                  Se ha enviado un enlace de recuperación a tu correo electrónico.
                </div>
                <Link
                  to="/login"
                  className="block text-center text-sm font-medium text-sky-600 hover:underline"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Input
                  label="Correo Electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Enviar Enlace de Recuperación
                </Button>

                <div className="text-center text-sm text-slate-500">
                  <Link to="/login" className="font-medium text-sky-600 hover:underline">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
