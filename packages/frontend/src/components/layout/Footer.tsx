import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: '#0F172A', fontFamily: "'Inter', sans-serif" }}>

      {/* Franja celeste superior */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #38BDF8, #0284C7, #38BDF8)' }} />

      <div className="container-custom py-14">
        <div className="grid gap-10 md:grid-cols-4">

          {/* Logo y descripción */}
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}
              >
                <Package className="h-5 w-5 text-white" />
              </div>
              <span
                className="text-lg font-black text-white"
                style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
              >
                STN PQ's
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
              Tu solución logística de confianza. Envíos rápidos y seguros a todo el país.
            </p>

            {/* CTA mini */}
            <Link
              to="/register"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: '#7DD3FC' }}
            >
              Crear cuenta gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3
              className="mb-5 text-sm font-bold uppercase tracking-widest"
              style={{ color: '#E2E8F0', fontFamily: "'Poppins', sans-serif" }}
            >
              Navegación
            </h3>
            <ul className="space-y-3">
              {[
                { to: '/tracking', label: 'Rastrear Envío' },
                { to: '/branches', label: 'Sucursales' },
                { to: '/faq', label: 'Preguntas Frecuentes' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm font-medium transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#7DD3FC')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <h3
              className="mb-5 text-sm font-bold uppercase tracking-widest"
              style={{ color: '#E2E8F0', fontFamily: "'Poppins', sans-serif" }}
            >
              Servicios
            </h3>
            <ul className="space-y-3">
              {[
                'Envíos Nacionales',
                'Envío Express',
                'Sucursal a Sucursal',
                'Sucursal a Domicilio',
              ].map((item) => (
                <li key={item} className="text-sm font-medium" style={{ color: '#94A3B8' }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3
              className="mb-5 text-sm font-bold uppercase tracking-widest"
              style={{ color: '#E2E8F0', fontFamily: "'Poppins', sans-serif" }}
            >
              Contacto
            </h3>
            <ul className="space-y-4">
              {[
                { icon: Phone, text: '0800-STN-PQRS' },
                { icon: Mail, text: 'info@stnpqs.com' },
                { icon: MapPin, text: 'Buenos Aires, Argentina' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(125,211,252,0.12)' }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: '#7DD3FC' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#CBD5E1' }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs md:flex-row"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#64748B' }}
        >
          <p>© {new Date().getFullYear()} STN PQ's. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <Link
              to="/terms"
              className="transition-colors hover:text-sky-400"
              style={{ color: '#64748B' }}
            >
              Términos y condiciones
            </Link>
            <Link
              to="/privacy"
              className="transition-colors hover:text-sky-400"
              style={{ color: '#64748B' }}
            >
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
