import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-[hsl(var(--secondary))] text-white">
      <div className="container-custom py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo y descripción */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
                <Package className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">STN PQ's</span>
            </div>
            <p className="text-sm text-gray-300">
              Tu solución logística de confianza. Envíos rápidos y seguros a todo el país.
            </p>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="mb-4 font-bold">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/tracking" className="text-gray-300 hover:text-white">
                  Rastrear Envío
                </Link>
              </li>
              <li>
                <Link to="/branches" className="text-gray-300 hover:text-white">
                  Sucursales
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-300 hover:text-white">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-white">
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <h3 className="mb-4 font-bold">Servicios</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-300">Envíos Nacionales</li>
              <li className="text-gray-300">Envío Express</li>
              <li className="text-gray-300">Sucursal a Sucursal</li>
              <li className="text-gray-300">Sucursal a Domicilio</li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="mb-4 font-bold">Contacto</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-300">
                <Phone className="h-4 w-4" />
                0800-STN-PQRS
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <Mail className="h-4 w-4" />
                info@stnpqs.com
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <MapPin className="h-4 w-4" />
                Buenos Aires, Argentina
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-700 pt-8 text-center text-sm text-gray-300">
          <p>&copy; {new Date().getFullYear()} STN PQ's. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
