import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, Shield, Clock, Search, MapPin, DollarSign, Zap, ArrowRight, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-900 pb-24 pt-20">
        {/* Fondo decorativo */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7DD3FC 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #BAE6FD 0%, transparent 70%)' }}
        />

        <div className="container-custom relative z-10">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            {/* Texto hero */}
            <div>
              <span
                className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ background: 'rgba(125,211,252,0.15)', color: '#7DD3FC' }}
              >
                Logística inteligente · Argentina
              </span>

              <h1
                className="mb-6 text-5xl font-black leading-none text-white lg:text-6xl"
                style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.03em' }}
              >
                Enviá{' '}
                <span style={{ color: '#7DD3FC' }}>rápido</span>
                <br />y sin vueltas.
              </h1>

              <p className="mb-10 text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                La plataforma logística que tu negocio necesita. Cotizá, enviá y rastreá tus paquetes desde un solo lugar — sin complicaciones.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/register')}
                  className="group flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-slate-900 transition-all duration-200 hover:scale-105"
                  style={{ background: '#7DD3FC' }}
                >
                  Empezar gratis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-xl border px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  Ingresar
                </button>
              </div>

              {/* Trust signals */}
              <div className="mt-10 flex flex-wrap gap-6">
                {[
                  { icon: CheckCircle, text: 'Sin costos ocultos' },
                  { icon: CheckCircle, text: 'Soporte 24 / 7' },
                  { icon: CheckCircle, text: 'Seguro incluido' },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-2 text-sm" style={{ color: '#94A3B8' }}>
                    <Icon className="h-4 w-4" style={{ color: '#7DD3FC' }} />
                    {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Tracking card */}
            <div>
              <div className="rounded-2xl bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: '#E0F2FE' }}
                  >
                    <Search className="h-5 w-5" style={{ color: '#0284C7' }} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      Rastreá tu envío
                    </p>
                    <p className="text-xs text-slate-400">Ingresá el código de seguimiento</p>
                  </div>
                </div>

                <form onSubmit={handleTracking} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Ej: STNMN85XLHMFF086A88"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    onFocus={(e) => { e.target.style.borderColor = '#7DD3FC'; e.target.style.boxShadow = '0 0 0 3px rgba(125,211,252,0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}
                  >
                    Buscar envío
                  </button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs text-slate-400">o</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                <button
                  onClick={() => navigate('/shipments/new')}
                  className="w-full rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  Crear un nuevo envío →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────── */}
      <section style={{ background: '#F0F9FF' }} className="py-14">
        <div className="container-custom">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { num: '+50k', label: 'Envíos realizados' },
              { num: '48 hs', label: 'Entrega express' },
              { num: '99%', label: 'Satisfacción' },
              { num: '24 / 7', label: 'Soporte activo' },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <p
                  className="text-4xl font-black lg:text-5xl"
                  style={{ fontFamily: "'Poppins', sans-serif", color: '#0284C7' }}
                >
                  {num}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="container-custom">
          <div className="mb-16 text-center">
            <span
              className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#0284C7' }}
            >
              Por qué elegirnos
            </span>
            <h2
              className="mb-4 text-4xl font-black text-slate-900 lg:text-5xl"
              style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
            >
              Lo que nos hace diferentes
            </h2>
            <p className="mx-auto max-w-xl text-lg text-slate-500">
              Tecnología, velocidad y confianza en cada paquete que movemos
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: DollarSign,
                title: 'Precios competitivos',
                desc: 'Las mejores tarifas del mercado con descuentos por volumen',
                bg: '#E0F2FE',
                color: '#0284C7',
              },
              {
                icon: Zap,
                title: 'Envío express',
                desc: 'Entregas en 24–48 hs con nuestra modalidad express',
                bg: '#FFF7ED',
                color: '#EA580C',
              },
              {
                icon: Shield,
                title: '100% seguro',
                desc: 'Tus paquetes protegidos con seguro opcional incluido',
                bg: '#F0FDF4',
                color: '#16A34A',
              },
              {
                icon: MapPin,
                title: 'Cobertura nacional',
                desc: 'Llegamos a todo el país con nuestra red de sucursales',
                bg: '#FDF4FF',
                color: '#9333EA',
              },
            ].map(({ icon: Icon, title, desc, bg, color }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
              >
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: bg }}
                >
                  <Icon className="h-7 w-7" style={{ color }} />
                </div>
                <h3
                  className="mb-2 text-lg font-bold text-slate-900"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ─────────────────────────────────── */}
      <section className="py-24" style={{ background: '#F8FAFC' }}>
        <div className="container-custom">
          <div className="mb-16 text-center">
            <span
              className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#0284C7' }}
            >
              Modalidades
            </span>
            <h2
              className="mb-4 text-4xl font-black text-slate-900 lg:text-5xl"
              style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
            >
              Nuestros servicios
            </h2>
            <p className="text-lg text-slate-500">Soluciones adaptadas a cada necesidad</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* S2S */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl">
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: 'radial-gradient(circle, #E0F2FE 0%, transparent 70%)' }}
              />
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: '#E0F2FE' }}
              >
                <Package className="h-7 w-7" style={{ color: '#0284C7' }} />
              </div>
              <h3
                className="mb-2 text-2xl font-bold text-slate-900"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Sucursal a Sucursal
              </h3>
              <p className="mb-6 text-slate-500">
                Retirá y entregá en cualquiera de nuestras sucursales en todo el país
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  Entrega en 3–5 días hábiles
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                    <DollarSign className="h-3.5 w-3.5" />
                  </span>
                  Desde <strong className="text-slate-900">$500</strong>
                </li>
              </ul>
              <button
                onClick={() => navigate('/shipments/new')}
                className="mt-6 flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: '#0284C7' }}
              >
                Cotizar ahora <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* S2D */}
            <div className="group relative overflow-hidden rounded-3xl bg-slate-900 p-8 transition-all duration-300 hover:shadow-xl">
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, #7DD3FC 0%, transparent 70%)' }}
              />
              <div
                className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(125,211,252,0.15)' }}
              >
                <Truck className="h-7 w-7" style={{ color: '#7DD3FC' }} />
              </div>
              <h3
                className="mb-2 text-2xl font-bold text-white"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Sucursal a Domicilio
              </h3>
              <p className="mb-6 text-slate-400">
                Entrega directa en la puerta de tu cliente, sin que tenga que moverse
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(125,211,252,0.15)' }}>
                    <Clock className="h-3.5 w-3.5" style={{ color: '#7DD3FC' }} />
                  </span>
                  Entrega en 2–4 días hábiles
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(125,211,252,0.15)' }}>
                    <DollarSign className="h-3.5 w-3.5" style={{ color: '#7DD3FC' }} />
                  </span>
                  Desde <strong className="text-white">$1.500</strong>
                </li>
              </ul>
              <button
                onClick={() => navigate('/shipments/new')}
                className="mt-6 flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: '#7DD3FC' }}
              >
                Cotizar ahora <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────── */}
      <section
        className="py-24"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)' }}
      >
        <div className="container-custom text-center">
          <span
            className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(125,211,252,0.15)', color: '#7DD3FC' }}
          >
            Empezá hoy
          </span>
          <h2
            className="mb-5 text-4xl font-black text-white lg:text-5xl"
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
          >
            ¿Listo para enviar?
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-lg" style={{ color: '#94A3B8' }}>
            Creá tu cuenta en minutos y hacé tu primer envío con descuento especial para nuevos usuarios.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-slate-900 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ background: '#7DD3FC', boxShadow: '0 0 30px rgba(125,211,252,0.3)' }}
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate('/tracking')}
              className="rounded-xl border px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
            >
              Rastrear un envío
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
