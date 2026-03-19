import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Notifications() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">Notificaciones</h1>
          <p className="text-muted-foreground">Mantente al día con tus envíos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Todas las Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <Bell className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">No tenés notificaciones nuevas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
