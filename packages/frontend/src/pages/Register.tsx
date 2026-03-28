import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import api from '../lib/api';

const registerSchema = z.object({
  full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Teléfono inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError('');
      
      const { confirmPassword, ...registerData } = data;
      await api.post('/auth/register', registerData);
      
      navigate('/login', { 
        state: { message: 'Cuenta creada exitosamente. Por favor, inicia sesión.' } 
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear la cuenta');
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
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}>
            Crear Cuenta
          </h1>
          <p className="mt-2 text-sm text-slate-500">Registrate para comenzar a enviar</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registro</CardTitle>
            <CardDescription>Completá tus datos para crear tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Input
                label="Nombre Completo"
                placeholder="Juan Pérez"
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Teléfono"
                type="tel"
                placeholder="+54 11 1234-5678"
                error={errors.phone?.message}
                {...register('phone')}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <div className="text-xs text-slate-500">
                Al registrarte, aceptás nuestros{' '}
                <Link to="/terms" className="text-sky-600 hover:underline">
                  Términos y Condiciones
                </Link>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Crear Cuenta
              </Button>

              <div className="text-center text-sm text-slate-500">
                ¿Ya tenés cuenta?{' '}
                <Link to="/login" className="font-medium text-sky-600 hover:underline">
                  Iniciá sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
