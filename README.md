# Sistema Logístico STN

Plataforma web full stack para la gestión integral de operaciones logísticas: envíos, rutas, sucursales, mensajeros, pagos, incidencias y tracking en tiempo real. Pensada como un sistema real de paquetería, con foco en integridad de datos, transiciones de estado válidas y seguridad.

> **Demo:** https://stn-logistics-web-production.up.railway.app
> **Repositorio:** https://github.com/santinocerezo/sistema_logistico_stn

---

## Tabla de contenidos

- [Qué hace](#qué-hace)
- [Arquitectura](#arquitectura)
- [Stack técnico](#stack-técnico)
- [Funcionalidades](#funcionalidades)
- [Estructura del repo](#estructura-del-repo)
- [Cómo correrlo localmente](#cómo-correrlo-localmente)
- [Deploy](#deploy)
- [Metodología y decisiones de diseño](#metodología-y-decisiones-de-diseño)

---

## Qué hace

El sistema modela las operaciones reales de una empresa de paquetería:

- **Clientes** crean envíos, los pagan y los siguen en tiempo real con un código de tracking.
- **Mensajeros** ven sus envíos asignados, los recogen, marcan entregas y reportan incidencias desde un panel propio.
- **Administradores** asignan envíos a mensajeros, gestionan rutas, sucursales, tarifas, ven KPIs operativos y resuelven incidencias.

Todo se mueve sobre máquinas de estado explícitas (`pending → in_transit → delivered`, etc.) que validan cada transición a nivel de servicio para no permitir estados inconsistentes.

---

## Arquitectura

Monorepo con **npm workspaces** y dos paquetes desplegables independientes:

```
sistema-logistica-paqueteria/
├── packages/
│   ├── backend/   → API REST + WebSocket server (Node + Express + TypeScript)
│   └── frontend/  → SPA (React + Vite + TypeScript)
├── docker-compose.yml
├── railway.toml
└── render.yaml
```

- El **backend** expone una API REST sobre Express y un canal en tiempo real con Socket.io para tracking en vivo y notificaciones push internas.
- El **frontend** es una SPA React que consume la API vía Axios + React Query y se conecta al WebSocket para refrescar el estado de envíos sin polling.
- **PostgreSQL** es la base de datos principal. **Redis** + **BullMQ** se usan para colas de trabajos (notificaciones, jobs diferidos). **MinIO** (compatible con S3) para almacenamiento de archivos (comprobantes, fotos de entrega).

---

## Stack técnico

### Backend (`packages/backend`)

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Runtime / framework | Node.js + Express 4 |
| Base de datos | PostgreSQL (vía driver `pg`) |
| Tiempo real | Socket.io |
| Auth | JWT (access + refresh) con `jsonwebtoken`, `bcrypt`, cookies firmadas (`cookie-parser`) |
| 2FA | `speakeasy` (TOTP) + QR con `qrcode` |
| Validación | Zod (schemas de entrada en todas las rutas) |
| Seguridad | Helmet, CORS, rate limiting |
| Colas | BullMQ + Redis (`ioredis`) |
| Storage | MinIO (S3-compatible) — uploads con `multer` |
| Tests | Vitest + `fast-check` (property-based testing) |
| Tooling | ESLint, Prettier, ts-node-dev |

### Frontend (`packages/frontend`)

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Framework | React 18 + Vite |
| Routing | React Router 6 |
| Estado servidor | TanStack Query (React Query v5) |
| Estado cliente | Zustand |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| HTTP | Axios |
| Tiempo real | socket.io-client |
| UI | Tailwind CSS, Headless UI, Heroicons, Lucide |
| Mapas | Leaflet (rutas y tracking en mapa) |
| QR | qrcode.react (etiquetas de envío) |
| Tests | Vitest + Testing Library + jsdom |

### Infraestructura

- **Docker** — `docker-compose.yml` para levantar el stack completo en local (Postgres, Redis, MinIO, backend, frontend).
- **Railway** — deploy de producción (un solo servicio, `railway.toml`).
- **Render** — configuración alternativa (`render.yaml`).

---

## Funcionalidades

### Módulos del backend (`packages/backend/src/modules`)

- **auth** — registro, login, refresh tokens, 2FA con TOTP, recuperación de contraseña.
- **shipments** — alta de envíos, estados, asignación, búsqueda.
- **tracking** — endpoint público de tracking + canal WebSocket por código.
- **routes** — gestión de rutas y stops.
- **branches** — sucursales (origen/destino).
- **couriers** — mensajeros y sus envíos asignados.
- **payments** — registro de pagos asociados a envíos.
- **incidents** — reporte y resolución de incidencias en ruta.
- **rates** — tarifas configurables por zona/peso.
- **notifications** — notificaciones internas (con cola BullMQ).
- **chat** — chat interno entre admin y mensajero.
- **reports** — KPIs operativos para el dashboard de admin.
- **profile** — perfil de usuario.
- **admin** — panel administrativo.
- **ai** — asistente con IA integrado al frontend.
- **faq** — base de conocimiento.

### Frontend (`packages/frontend/src/pages`)

- Landing pública + tracking público sin login.
- Dashboards diferenciados por rol: cliente, mensajero, admin.
- Alta de envíos, listado, detalle.
- Notificaciones, perfil, pagos.
- AI Chat asistente.

### Características transversales

- **Roles:** cliente / mensajero / admin con autorización por endpoint.
- **JWT con refresh tokens** vía cookies HTTP-only.
- **2FA opcional** (TOTP, QR-based enrollment).
- **Tracking en tiempo real** vía Socket.io — el cliente ve el estado y la ubicación del envío sin recargar.
- **Validación con Zod** en todos los endpoints — no se confía en el input.
- **Encriptación AES-256-GCM** para datos sensibles en reposo.
- **Rate limiting + Helmet + CORS** configurados por entorno.
- **Property-based testing** con fast-check en lógica crítica.

---

## Estructura del repo

```
sistema_logistico_stn/
├── packages/
│   ├── backend/
│   │   └── src/
│   │       ├── index.ts          # Entry point: arma Express + Socket.io
│   │       ├── db/               # Conexión Postgres + migraciones
│   │       ├── middleware/       # auth, error handler, rate limit
│   │       ├── modules/          # Feature modules (ver lista arriba)
│   │       ├── socket/           # Handlers de Socket.io
│   │       └── utils/            # Helpers (crypto, logger, etc.)
│   └── frontend/
│       └── src/
│           ├── main.tsx, App.tsx
│           ├── pages/            # Vistas top-level
│           ├── components/       # UI reutilizable
│           ├── stores/           # Zustand stores
│           └── lib/              # Cliente Axios, socket, utils
├── docker-compose.yml            # Stack completo en local
├── railway.toml                  # Deploy en Railway
├── render.yaml                   # Deploy en Render
└── package.json                  # Workspaces root
```

---

## Cómo correrlo localmente

**Requisitos:** Node 20+, Docker (para Postgres/Redis/MinIO).

```bash
# 1. Clonar e instalar
git clone https://github.com/santinocerezo/sistema_logistico_stn.git
cd sistema_logistico_stn
npm install

# 2. Levantar dependencias (Postgres, Redis, MinIO)
docker compose up -d

# 3. Variables de entorno — copiar .env.example en cada package y completar

# 4. Correr backend y frontend en dos terminales
npm run dev:backend
npm run dev:frontend
```

El frontend levanta en `http://localhost:5173`, el backend en `http://localhost:3000`.

---

## Deploy

Deployado en **Railway** como servicio único (build con `railway.toml`). Postgres provisto por el plugin de Railway. Variables de entorno configuradas en el dashboard.

URL en producción: https://stn-logistics-web-production.up.railway.app

---

## Metodología y decisiones de diseño

- **Monorepo con workspaces** — backend y frontend comparten repo pero se buildean y deployan de forma independiente. Permite tipos compartidos a futuro sin friccion de releases.
- **TypeScript end-to-end** — evita una clase entera de bugs en boundaries (API ↔ UI) y facilita refactors grandes.
- **Validación con Zod en boundary** — todo lo que entra al backend pasa por un schema. La regla es "no confiar nunca en el input".
- **Máquinas de estado explícitas** — los envíos tienen transiciones validadas. No se permite saltar de `pending` a `delivered` sin pasar por `in_transit`.
- **Separation of concerns por módulo** — cada feature del backend vive en su propio módulo (`modules/<feature>`) con sus rutas, servicios y queries. Mantiene el código navegable cuando crece.
- **React Query como source of truth del server state** — cache, invalidación y refetch automático. Zustand queda solo para estado puramente de UI.
- **Tests con Vitest + fast-check** — property-based testing en la lógica de tarifas y transiciones de estado para cubrir casos que un test ejemplo-por-ejemplo no encontraría.
- **Docker compose en dev** — el setup de Postgres/Redis/MinIO se reproduce con un solo comando, lo que reduce el "funciona en mi máquina".

---

## Autor

**Santino Cerezo** — [GitHub](https://github.com/santinocerezo) · santinocerezo11@gmail.com
