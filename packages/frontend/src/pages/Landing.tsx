import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Shield, Clock, Search, MapPin, DollarSign, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export default function Landing() {
  const [trackingCode, setTrackingCode] = useState('');
  const navigate = useNavigate();

  const handleTracking = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      navigate(`/tracking/${trackingCode}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-dark))] py-20 text-white">
        <div className="container-custom">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="fade-in">
              <h1 className="mb-6 text-5xl font-bold leading-tight">
                Envíos Rápidos y Seguros a Todo el País
              </h1>
              <p className="mb-8 text-xl text-blue-100">
                La solución logística que tu negocio necesita. Precios competitivos y servicio de calidad.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/register')}
                >
                  Comenzar Ahora
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-[hsl(var(--primary))]"
                  onClick={() => navigate('/login')}
                >
                  Ingresar
                </Button>
              </div>
            </div>

            {/* Tracking Form */}
            <Card className="fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-[hsl(var(--primary))]" />
                  Rastrear tu Envío
                </CardTitle>
                <CardDescription>
                  Ingresá el código de seguimiento para ver el estado de tu paquete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTracking} className="space-y-4">
                  <Input
                    placeholder="Ej: STN-2026-001234"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                  />
                  <Button type="submit" className="w-full" size="lg">
                    Buscar Envío
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container-custom">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-[hsl(var(--secondary))]">
              ¿Por qué elegir STN PQ's?
            </h2>
            <p className="text-lg text-muted-foreground">
              Ofrecemos el mejor servicio de logística con tecnología de punta
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card hover className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                    <DollarSign className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">Precios Competitivos</h3>
                <p className="text-muted-foreground">
                  Las mejores tarifas del mercado con descuentos por volumen
                </p>
              </CardContent>
            </Card>

            <Card hover className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                    <Zap className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">Envío Express</h3>
                <p className="text-muted-foreground">
                  Entregas en 24-48 horas con nuestra modalidad express
                </p>
              </CardContent>
            </Card>

            <Card hover className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                    <Shield className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">100% Seguro</h3>
                <p className="text-muted-foreground">
                  Tus paquetes protegidos con seguro opcional incluido
                </p>
              </CardContent>
            </Card>

            <Card hover className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                    <MapPin className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold">Cobertura Nacional</h3>
                <p className="text-muted-foreground">
                  Llegamos a todo el país con nuestra red de sucursales
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-gray-50 py-20">
        <div className="container-custom">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-[hsl(var(--secondary))]">
              Nuestros Servicios
            </h2>
            <p className="text-lg text-muted-foreground">
              Soluciones adaptadas a tus necesidades
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card hover>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Sucursal a Sucursal</CardTitle>
                <CardDescription>
                  Retirá y entregá tus paquetes en nuestras sucursales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Entrega en 3-5 días hábiles
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Desde $500
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card hover>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Sucursal a Domicilio</CardTitle>
                <CardDescription>
                  Entrega directa en la puerta de tu cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Entrega en 2-4 días hábiles
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Desde $1,500
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[hsl(var(--secondary))] py-20 text-white">
        <div className="container-custom text-center">
          <h2 className="mb-4 text-4xl font-bold">¿Listo para comenzar?</h2>
          <p className="mb-8 text-xl text-gray-300">
            Registrate ahora y obtené tu primer envío con descuento
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/register')}
          >
            Crear Cuenta Gratis
          </Button>
        </div>
      </section>
    </div>
  );
}
