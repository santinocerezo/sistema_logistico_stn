import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, User, LogOut, Menu, X, Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinkClass = (path: string) =>
    `relative text-sm font-semibold transition-colors duration-150 ${
      isActive(path)
        ? 'text-sky-600'
        : 'text-slate-800 hover:text-sky-600'
    }`;

  const activeUnderline = (path: string) =>
    isActive(path) ? (
      <span
        className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full"
        style={{ background: '#0EA5E9' }}
      />
    ) : null;

  return (
    <header
      className="sticky top-0 z-50 bg-white"
      style={{ borderBottom: '1.5px solid #E0F2FE', boxShadow: '0 1px 12px rgba(14,165,233,0.08)' }}
    >
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}
            >
              <Package className="h-5 w-5 text-white" />
            </div>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 900,
                  fontSize: '15px',
                  letterSpacing: '0.08em',
                  color: '#0F172A',
                  textTransform: 'uppercase',
                }}
              >
                STN
              </span>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 600,
                  fontSize: '9px',
                  letterSpacing: '0.22em',
                  color: '#0284C7',
                  textTransform: 'uppercase',
                  marginTop: '1px',
                }}
              >
                LOGISTICS
              </span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-7 md:flex">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-all duration-150"
                  style={
                    isActive('/dashboard') && location.pathname === '/dashboard'
                      ? { background: 'linear-gradient(135deg,#38BDF8,#0284C7)', color: '#fff', boxShadow: '0 2px 10px rgba(2,132,199,0.30)' }
                      : { color: '#0F172A' }
                  }
                  onMouseEnter={(e) => {
                    if (location.pathname !== '/dashboard') {
                      e.currentTarget.style.background = '#F0F9FF';
                      e.currentTarget.style.color = '#0284C7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== '/dashboard') {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                >
                  Dashboard
                </Link>
                <Link to="/shipments" className={navLinkClass('/shipments')} style={{ pointerEvents: 'auto' }}>
                  <span style={{ position: 'relative' }}>Mis Envíos {activeUnderline('/shipments')}</span>
                </Link>
                <Link to="/shipments/new" className={navLinkClass('/shipments/new')}>
                  Nuevo Envío {activeUnderline('/shipments/new')}
                </Link>
                <Link to="/branches" className={navLinkClass('/branches')}>
                  Sucursales {activeUnderline('/branches')}
                </Link>
                <Link to="/ai-chat" className={navLinkClass('/ai-chat')}>
                  Asistente IA {activeUnderline('/ai-chat')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/tracking" className={navLinkClass('/tracking')}>
                  Rastrear {activeUnderline('/tracking')}
                </Link>
                <Link to="/branches" className={navLinkClass('/branches')}>
                  Sucursales {activeUnderline('/branches')}
                </Link>
              </>
            )}
          </nav>

          {/* Desktop User Area */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                {/* Saldo */}
                <div
                  className="rounded-lg px-3 py-1.5 text-right"
                  style={{ background: '#F0F9FF' }}
                >
                  <p
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    style={{ fontSize: '10px' }}
                  >
                    Saldo
                  </p>
                  <p className="text-sm font-bold text-sky-700">
                    ${parseFloat(String(user?.balance || 0)).toFixed(2)}
                  </p>
                </div>

                {/* Nombre */}
                <span className="text-sm font-semibold text-slate-800">
                  {user?.fullName?.split(' ')[0]}
                </span>

                {/* Notificaciones */}
                <Link
                  to="/notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-600"
                >
                  <Bell className="h-4.5 w-4.5" />
                </Link>

                {/* Perfil */}
                <Link
                  to="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-600"
                >
                  <User className="h-4.5 w-4.5" />
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Ingresar
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl px-5 py-2 text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t py-4 md:hidden" style={{ borderColor: '#E0F2FE' }}>
            <nav className="flex flex-col gap-1">
              {isAuthenticated ? (
                <>
                  {[
                    { to: '/dashboard', label: 'Dashboard' },
                    { to: '/shipments', label: 'Mis Envíos' },
                    { to: '/shipments/new', label: 'Nuevo Envío' },
                    { to: '/branches', label: 'Sucursales' },
                    { to: '/ai-chat', label: 'Asistente IA' },
                    { to: '/notifications', label: 'Notificaciones' },
                    { to: '/profile', label: 'Perfil' },
                  ].map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isActive(to)
                          ? 'bg-sky-50 text-sky-700'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="my-2 border-t" style={{ borderColor: '#E0F2FE' }} />
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo disponible</p>
                    <p className="text-base font-bold text-sky-700">${parseFloat(String(user?.balance || 0)).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/tracking" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                    Rastrear
                  </Link>
                  <Link to="/branches" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                    Sucursales
                  </Link>
                  <div className="mt-2 flex gap-2 px-4">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700">
                      Ingresar
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 rounded-xl py-2.5 text-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}>
                      Registrarse
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
