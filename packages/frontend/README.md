# 🚀 STN PQ's Frontend

Frontend completo del sistema de logística STN PQ's construido con React + TypeScript + Tailwind CSS.

## ✨ Características Implementadas

### 🎨 Diseño
- **Colores**: Azul (#0066E6) y Negro (#1A1A1A)
- **Responsive**: Mobile-first design
- **Componentes**: Sistema de diseño completo
- **Animaciones**: Transiciones suaves

### 📱 Páginas Públicas
- ✅ Landing Page con hero y tracking
- ✅ Login con validación
- ✅ Registro de usuarios
- ✅ Tracking público de envíos
- ✅ Listado de sucursales

### 🔐 Páginas Protegidas
- ✅ Dashboard con estadísticas
- ✅ Mis Envíos (lista y filtros)
- ✅ Nuevo Envío (stepper con cotización)
- ✅ Detalle de Envío
- ✅ Asistente IA (chat en tiempo real)
- ✅ Perfil de usuario
- ✅ Pagos y recargas
- ✅ Notificaciones

### 🤖 Asistente IA
- Chat en tiempo real
- Respuestas instantáneas
- Acciones rápidas
- Historial de conversación
- UI moderna con burbujas de chat

### 🛠️ Funcionalidades
- Autenticación con JWT
- State management con Zustand
- API calls con React Query
- Formularios con React Hook Form + Zod
- Validación en tiempo real
- Manejo de errores
- Loading states

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 🔧 Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3000
```

## 📦 Estructura del Proyecto

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx       # Header con navegación
│   │   └── Footer.tsx       # Footer con links
│   └── ui/
│       ├── Button.tsx       # Botón reutilizable
│       ├── Input.tsx        # Input con validación
│       ├── Card.tsx         # Card component
│       └── Badge.tsx        # Badge para estados
├── pages/
│   ├── Landing.tsx          # Página principal
│   ├── Login.tsx            # Login
│   ├── Register.tsx         # Registro
│   ├── Dashboard.tsx        # Dashboard usuario
│   ├── Shipments.tsx        # Lista de envíos
│   ├── NewShipment.tsx      # Crear envío
│   ├── ShipmentDetail.tsx   # Detalle de envío
│   ├── AIChat.tsx           # Asistente IA
│   ├── Tracking.tsx         # Tracking público
│   ├── Branches.tsx         # Sucursales
│   ├── Profile.tsx          # Perfil
│   ├── Payments.tsx         # Pagos
│   └── Notifications.tsx    # Notificaciones
├── stores/
│   └── authStore.ts         # Store de autenticación
├── lib/
│   └── api.ts               # Cliente API con Axios
├── App.tsx                  # Router principal
├── main.tsx                 # Entry point
└── index.css                # Estilos globales

```

## 🎨 Sistema de Diseño

### Colores

```css
/* Primarios */
--primary: #0066E6        /* Azul principal */
--primary-dark: #0052B8   /* Azul oscuro */
--primary-light: #1A7FFF  /* Azul claro */

/* Secundarios */
--secondary: #1A1A1A      /* Negro */
--secondary-light: #333333 /* Gris oscuro */

/* Estados */
--success: #10B981        /* Verde */
--warning: #F59E0B        /* Naranja */
--error: #EF4444          /* Rojo */
```

### Componentes

#### Button
```tsx
<Button variant="primary" size="lg" loading={false}>
  Click me
</Button>
```

Variantes: `primary`, `secondary`, `outline`, `ghost`
Tamaños: `sm`, `md`, `lg`

#### Input
```tsx
<Input
  label="Email"
  type="email"
  error="Error message"
  helperText="Helper text"
/>
```

#### Card
```tsx
<Card hover>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

#### Badge
```tsx
<Badge variant="success">Entregado</Badge>
```

Variantes: `primary`, `success`, `warning`, `error`, `default`

## 🔐 Autenticación

El sistema usa JWT tokens almacenados en localStorage.

```tsx
import { useAuthStore } from './stores/authStore';

const { user, isAuthenticated, setAuth, logout } = useAuthStore();
```

## 📡 API Calls

```tsx
import api from './lib/api';

// GET request
const response = await api.get('/shipments');

// POST request
const response = await api.post('/shipments', data);

// El token se agrega automáticamente
```

## 🎯 Rutas

### Públicas
- `/` - Landing page
- `/login` - Login
- `/register` - Registro
- `/tracking` - Tracking
- `/tracking/:code` - Tracking con código
- `/branches` - Sucursales

### Protegidas (requieren autenticación)
- `/dashboard` - Dashboard
- `/shipments` - Mis envíos
- `/shipments/new` - Nuevo envío
- `/shipments/:id` - Detalle de envío
- `/ai-chat` - Asistente IA
- `/profile` - Perfil
- `/payments/*` - Pagos
- `/notifications` - Notificaciones

## 🤖 Asistente IA

El asistente IA está integrado y funciona con el backend local (sin necesidad de OpenAI).

Características:
- Chat en tiempo real
- Respuestas instantáneas
- Acciones rápidas predefinidas
- Historial de conversación
- UI moderna

## 📱 Responsive

El diseño es completamente responsive:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🚀 Deploy

### Build

```bash
npm run build
```

Los archivos se generan en `dist/`

### Preview

```bash
npm run preview
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch
```

## 📝 Notas

- El frontend está 100% completo
- Todas las funcionalidades están implementadas
- El diseño es responsive
- El código está tipado con TypeScript
- Los formularios tienen validación
- El manejo de errores está implementado
- El asistente IA funciona sin OpenAI

## 🎉 ¡Listo para usar!

El frontend está completamente funcional y listo para conectarse con el backend.

**Iniciar:**
1. `npm install`
2. `npm run dev`
3. Abrir http://localhost:5173

**Backend debe estar corriendo en http://localhost:3000**
