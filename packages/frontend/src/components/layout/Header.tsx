import { Link, useNavigate } from 'react-router-dom';
import { Package, User, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';
import Button from '../ui/Button';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[hsl(var(--secondary))]">STN PQ's</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Dashboard
                </Link>
                <Link to="/shipments" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Mis Envíos
                </Link>
                <Link to="/shipments/new" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Nuevo Envío
                </Link>
                <Link to="/branches" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Sucursales
                </Link>
                <Link to="/ai-chat" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Asistente IA
                </Link>
              </>
            ) : (
              <>
                <Link to="/tracking" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Rastrear
                </Link>
                <Link to="/branches" className="text-sm font-medium text-foreground hover:text-[hsl(var(--primary))]">
                  Sucursales
                </Link>
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">Saldo: ${user?.balance?.toFixed(2)}</p>
                </div>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Ingresar
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/shipments" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Mis Envíos
                  </Link>
                  <Link to="/shipments/new" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Nuevo Envío
                  </Link>
                  <Link to="/branches" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Sucursales
                  </Link>
                  <Link to="/ai-chat" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Asistente IA
                  </Link>
                  <Link to="/profile" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Perfil
                  </Link>
                  <button onClick={handleLogout} className="text-left text-sm font-medium text-red-500">
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/tracking" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Rastrear
                  </Link>
                  <Link to="/branches" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                    Sucursales
                  </Link>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Ingresar
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
