# 🎨 Análisis de Diseño - Referencias de Logística

## Sitios Analizados

1. **Correo Argentino** - https://www.correoargentino.com.ar/MiCorreo/public/
2. **FedEx Argentina** - https://www.fedex.com/es-ar/home.html
3. **Andreani** - https://www.andreani.com/pymes/bigger

---

## 📊 Patrones Comunes Identificados

### 1. Estructura de Página Principal

**Todos los sitios tienen:**
- Hero section con CTA principal
- Formulario de login/registro prominente
- Tracking de envíos destacado
- Accesos rápidos a funciones principales
- Footer completo con links

### 2. Colores y Branding

**Correo Argentino:**
- Azul corporativo
- Amarillo/dorado para acentos
- Blanco para fondos limpios

**FedEx:**
- Púrpura/morado corporativo (#4D148C)
- Naranja para CTAs (#FF6200)
- Blanco y grises

**Andreani:**
- Rojo corporativo (#D0080F)
- Negro para texto
- Blanco para fondos

**Recomendación para STN PQ's:**
- Color primario: Azul (#0066CC) - confianza y profesionalismo
- Color secundario: Verde (#00CC66) - éxito y entrega
- Acentos: Naranja (#FF6600) - urgencia y acción
- Neutros: Grises y blancos

### 3. Componentes Principales

#### A. Hero Section
```
- Título grande y claro
- Subtítulo descriptivo
- CTA principal (botón grande)
- Imagen/ilustración relevante
- Formulario de tracking o cotización
```

#### B. Formulario de Login
```
- Email/Usuario
- Contraseña
- "Olvidé mi contraseña"
- Botón "Ingresar"
- Link "Registrarse"
- Diseño limpio y minimalista
```

#### C. Tracking de Envíos
```
- Input grande para código de tracking
- Botón "Buscar" o "Rastrear"
- Icono de lupa o paquete
- Acceso sin login (público)
```

#### D. Cards de Servicios
```
- Icono representativo
- Título del servicio
- Descripción breve
- Botón "Más información" o "Acceder"
- Hover effects
```

#### E. Accesos Directos
```
- Grid de 2-4 columnas
- Iconos grandes
- Texto descriptivo
- Links directos
```

### 4. Navegación

**Header:**
- Logo (izquierda)
- Menú principal (centro)
- Login/Usuario (derecha)
- Botón CTA destacado

**Menú Principal:**
- Enviar
- Rastrear
- Sucursales
- Tarifas
- Ayuda
- Contacto

**Footer:**
- Links institucionales
- Contacto
- Redes sociales
- Términos y condiciones
- Datos fiscales (Argentina)

### 5. Tipografía

**Todos usan:**
- Sans-serif moderna (Roboto, Open Sans, Inter)
- Títulos: Bold, 32-48px
- Subtítulos: Medium, 20-24px
- Texto: Regular, 14-16px
- Jerarquía clara

### 6. Espaciado y Layout

**Patrones:**
- Contenedores max-width: 1200-1400px
- Padding lateral: 20-40px
- Espaciado entre secciones: 60-100px
- Grid responsive: 12 columnas
- Mobile-first approach

---

## 🎯 Componentes Específicos por Funcionalidad

### Dashboard de Usuario

**Elementos comunes:**
1. Resumen de cuenta (saldo, envíos activos)
2. Acciones rápidas (nuevo envío, recargar)
3. Lista de envíos recientes
4. Notificaciones
5. Menú lateral o tabs

### Formulario de Nuevo Envío

**Pasos identificados:**
1. Origen y Destino
2. Dimensiones y Peso
3. Tipo de envío (Express/Normal)
4. Resumen y Costo
5. Confirmación

**Diseño:**
- Stepper/Progress bar
- Formulario por pasos
- Validación en tiempo real
- Resumen lateral con costo

### Tracking de Envío

**Elementos:**
- Timeline vertical con estados
- Iconos por estado
- Fecha y hora
- Ubicación actual
- Mapa (opcional)
- Información del repartidor

---

## 💡 Mejores Prácticas Identificadas

### UX/UI

1. **Claridad sobre todo**
   - Textos directos y concisos
   - CTAs obvios
   - Feedback visual inmediato

2. **Accesibilidad**
   - Contraste adecuado
   - Tamaños de fuente legibles
   - Botones grandes (min 44x44px)

3. **Responsive**
   - Mobile-first
   - Hamburger menu en móvil
   - Cards apiladas en móvil

4. **Microinteracciones**
   - Hover effects
   - Loading states
   - Success/error messages
   - Smooth transitions

### Funcionalidades Destacadas

**Correo Argentino:**
- Servicios claramente separados
- Acceso a rotulador online
- Punto Correo (red de puntos)

**FedEx:**
- Calculadora de tarifas prominente
- Múltiples opciones de envío
- Centro de recursos

**Andreani:**
- Cotizador integrado
- Servicio "Bigger" para cargas pesadas
- FAQ bien organizado

---

## 🎨 Propuesta de Diseño para STN PQ's

### Paleta de Colores

```css
/* Primarios */
--primary: #0066CC;      /* Azul confianza */
--secondary: #00CC66;    /* Verde éxito */
--accent: #FF6600;       /* Naranja acción */

/* Neutros */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Estados */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

### Tipografía

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Tamaños */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
```

### Componentes Base

1. **Botones**
   - Primary: Fondo azul, texto blanco
   - Secondary: Borde azul, texto azul
   - Success: Fondo verde
   - Danger: Fondo rojo
   - Tamaños: sm, md, lg

2. **Cards**
   - Fondo blanco
   - Sombra sutil
   - Border radius: 8px
   - Padding: 20-24px

3. **Inputs**
   - Border gris claro
   - Focus: border azul
   - Error: border rojo
   - Height: 44px (mínimo)

4. **Badges**
   - Estados de envío
   - Colores según estado
   - Border radius: 12px

---

## 📱 Estructura de Páginas

### 1. Landing Page (Pública)
```
- Header con login
- Hero con tracking
- Servicios principales
- ¿Por qué elegirnos?
- Testimonios
- Footer
```

### 2. Login/Register
```
- Formulario centrado
- Imagen lateral (opcional)
- Links a términos
- Opción de 2FA
```

### 3. Dashboard
```
- Sidebar con menú
- Header con usuario
- Resumen de cuenta
- Envíos recientes
- Acciones rápidas
```

### 4. Nuevo Envío
```
- Stepper (4 pasos)
- Formulario por paso
- Resumen lateral
- Botones navegación
```

### 5. Mis Envíos
```
- Filtros y búsqueda
- Lista/Grid de envíos
- Estados visuales
- Acciones por envío
```

### 6. Tracking
```
- Timeline vertical
- Mapa (opcional)
- Información detallada
- Compartir tracking
```

### 7. Perfil
```
- Datos personales
- Métodos de pago
- Direcciones guardadas
- Configuración
```

---

## 🚀 Stack Tecnológico Recomendado

### Frontend
```
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (routing)
- React Query (API calls)
- Zustand (state management)
- Socket.io-client (WebSocket)
- React Hook Form (forms)
- Zod (validation)
- Lucide React (icons)
```

### Librerías UI
```
- Headless UI (componentes accesibles)
- Radix UI (primitivos)
- Framer Motion (animaciones)
- React Hot Toast (notificaciones)
```

---

## ✅ Próximos Pasos

1. **Setup del proyecto**
   - Crear estructura de carpetas
   - Configurar Vite + React + TypeScript
   - Instalar dependencias

2. **Componentes base**
   - Button
   - Input
   - Card
   - Badge
   - Modal

3. **Layout**
   - Header
   - Sidebar
   - Footer
   - Container

4. **Páginas principales**
   - Landing
   - Login/Register
   - Dashboard
   - Nuevo Envío

5. **Integración con backend**
   - API client
   - Auth context
   - Protected routes

---

**¿Empezamos con la implementación?** 🚀
