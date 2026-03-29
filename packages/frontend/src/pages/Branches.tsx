import { useEffect, useState } from 'react';
import { MapPin, Clock, Phone, Search, Building2 } from 'lucide-react';
import api from '../lib/api';

interface Branch {
  id: string;
  name: string;
  address: string;
  schedule: string | null;
  is_active: boolean;
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/branches')
      .then((r) => setBranches(r.data || []))
      .catch((e) => console.error('Error loading branches:', e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>

      {/* Header */}
      <div
        className="w-full py-12 px-4"
        style={{
          background: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 60%, #38BDF8 100%)',
        }}
      >
        <div className="container-custom max-w-5xl">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>
                Nuestras Sucursales
              </h1>
              <p className="text-sky-200 text-sm mt-0.5">
                Ordenadas por cercanía al Obelisco · {branches.length} sucursales activas
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative mt-6 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: '#94A3B8' }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border-0 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 outline-none shadow-lg"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>
      </div>

      <div className="container-custom max-w-5xl py-10">

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div
                className="mb-4 inline-block h-9 w-9 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: '#38BDF8', borderTopColor: 'transparent' }}
              />
              <p className="text-slate-500 text-sm">Cargando sucursales...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
            style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: '#F0F9FF' }}
            >
              <MapPin className="h-8 w-8" style={{ color: '#0284C7' }} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No se encontraron sucursales</h3>
            <p className="text-slate-500 text-sm">Intentá con otra búsqueda</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((branch, index) => (
              <BranchCard key={branch.id} branch={branch} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BranchCard({ branch, index }: { branch: Branch; index: number }) {
  // Las primeras 5 son las más cercanas → acento más fuerte
  const isNear = index < 5;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 28px rgba(2,132,199,0.15)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#BAE6FD';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Franja superior */}
      <div
        className="h-1.5 w-full"
        style={{
          background: isNear
            ? 'linear-gradient(90deg, #0284C7, #38BDF8)'
            : 'linear-gradient(90deg, #64748B, #94A3B8)',
        }}
      />

      <div className="p-5">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: isNear ? '#F0F9FF' : '#F8FAFC',
              }}
            >
              <Building2
                className="h-5 w-5"
                style={{ color: isNear ? '#0284C7' : '#64748B' }}
              />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">{branch.name}</h3>
              <span
                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={
                  isNear
                    ? { background: '#E0F2FE', color: '#0284C7' }
                    : { background: '#F1F5F9', color: '#64748B' }
                }
              >
                {isNear ? 'Zona CABA / GBA' : 'Interior del país'}
              </span>
            </div>
          </div>

          {/* Badge activa */}
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: '#DCFCE7', color: '#16A34A' }}
          >
            ● Activa
          </span>
        </div>

        {/* Separador */}
        <div style={{ borderTop: '1px solid #F1F5F9', marginBottom: '0.75rem' }} />

        {/* Datos */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#0284C7' }} />
            <p className="text-sm text-slate-600 leading-snug">{branch.address}</p>
          </div>

          {branch.schedule && (
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#0284C7' }} />
              <p className="text-sm text-slate-600">{branch.schedule}</p>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 shrink-0" style={{ color: '#0284C7' }} />
            <p className="text-sm text-slate-600">0800-786-7787</p>
          </div>
        </div>
      </div>
    </div>
  );
}
