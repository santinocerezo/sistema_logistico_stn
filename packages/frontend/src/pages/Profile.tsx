import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

export const Profile = () => {
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.patch('/profile/me', formData);
      alert('Perfil actualizado exitosamente');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await logout();
      window.location.href = '/';
    }
  };

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Editar
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Nombre Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-600">Correo Electrónico</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Nombre Completo</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">{user?.fullName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Teléfono</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">{user?.phone || 'No especificado'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Rol</dt>
                <dd className="mt-1">
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-800">
                    {user?.role === 'admin' ? 'Administrador' : user?.role === 'courier' ? 'Repartidor' : 'Usuario'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Autenticación 2FA</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">
                  {user?.totpEnabled ? (
                    <span className="text-green-600">Activada</span>
                  ) : (
                    <span className="text-gray-500">Desactivada</span>
                  )}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
