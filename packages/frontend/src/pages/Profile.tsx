import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { User, Mail, Phone, Shield, LogOut, Pencil, X, Check } from 'lucide-react';
import Button from '../components/ui/Button';

export const Profile = () => {
  const { user, logout, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.patch('/profile', formData);
      const token = localStorage.getItem('token') || '';
      setAuth({ ...user!, ...formData }, token);
      setSuccess('Perfil actualizado correctamente');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = user?.role === 'admin' ? 'Administrador' : user?.role === 'courier' ? 'Repartidor' : 'Usuario';

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="container-custom py-10 max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-black text-slate-900"
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
          >
            Mi Perfil
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Gestioná tu información personal</p>
        </div>

        {/* Avatar + nombre */}
        <div
          className="mb-6 flex items-center gap-5 rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', boxShadow: '0 4px 24px rgba(2,132,199,0.15)' }}
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white"
            style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}
          >
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-lg font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {user?.fullName}
            </p>
            <p className="text-sm" style={{ color: '#94A3B8' }}>{user?.email}</p>
            <span
              className="mt-1.5 inline-block rounded-full px-3 py-0.5 text-xs font-bold"
              style={{ background: 'rgba(125,211,252,0.15)', color: '#7DD3FC' }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {/* Datos */}
        <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#38BDF8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#38BDF8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setEditing(false)} style={{ flex: 1 }}>
                  Cancelar
                </Button>
                <Button type="submit" loading={loading} style={{ flex: 1 }}>
                  Guardar Cambios
                </Button>
              </div>
            </form>
          ) : (
            <dl className="space-y-5">
              {[
                { icon: Mail, label: 'Correo Electrónico', value: user?.email },
                { icon: User, label: 'Nombre Completo', value: user?.fullName },
                { icon: Phone, label: 'Teléfono', value: user?.phone || 'No especificado' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#F0F9FF' }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: '#0284C7' }} />
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                    <dd className="text-sm font-semibold text-slate-800 mt-0.5">{value}</dd>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: '#F0F9FF' }}>
                  <Shield className="h-4.5 w-4.5" style={{ color: '#0284C7' }} />
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Autenticación 2FA</dt>
                  <dd className="mt-0.5">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={user?.totpEnabled ? { background: '#DCFCE7', color: '#16A34A' } : { background: '#F1F5F9', color: '#64748B' }}
                    >
                      {user?.totpEnabled ? 'Activada' : 'Desactivada'}
                    </span>
                  </dd>
                </div>
              </div>
            </dl>
          )}

          {!editing && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditing(true)} style={{ width: '100%' }}>
                <Pencil className="mr-2 h-4 w-4" /> Editar Perfil
              </Button>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mt-4">
          <Button variant="danger" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
