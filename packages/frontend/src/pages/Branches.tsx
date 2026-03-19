import { useEffect, useState } from 'react';
import { MapPin, Clock, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import api from '../lib/api';

interface Branch {
  id: string;
  name: string;
  address: string;
  schedule: string;
  is_active: boolean;
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(search.toLowerCase()) ||
    branch.address.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent"></div>
          <p className="text-muted-foreground">Cargando sucursales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">Nuestras Sucursales</h1>
          <p className="text-muted-foreground">Encuentra la sucursal más cercana a vos</p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBranches.map((branch) => (
            <Card key={branch.id} hover>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[hsl(var(--primary))]" />
                  {branch.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{branch.address}</p>
                </div>
                {branch.schedule && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{branch.schedule}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">0800-STN-PQRS</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBranches.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-bold">No se encontraron sucursales</h3>
              <p className="text-muted-foreground">Intenta con otra búsqueda</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
