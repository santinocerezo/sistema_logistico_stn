# Rate Limiting con Redis

Este documento describe la implementación del sistema de rate limiting para el Sistema Logístico de Paquetería STN PQ's.

## Resumen

El sistema implementa rate limiting usando Redis para proteger la API contra ataques de fuerza bruta, abuso y sobrecarga. Todos los intentos bloqueados se registran en `audit_logs` y se notifica al administrador.

**Valida:** Requerimientos 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

## Configuraciones de Rate Limiting

### 1. Login Rate Limiter

**Endpoint:** `POST /auth/login`

**Configuración:**
- **Límite:** 5 intentos por minuto
- **Clave:** IP del cliente
- **Bloqueo:** 15 minutos después de exceder el límite
- **Ventana:** 1 minuto

**Uso:**
```typescript
import { loginRateLimiter } from './middleware/rateLimiter';

router.post('/login', loginRateLimiter, login);
```

**Comportamiento:**
- Permite hasta 5 intentos de login por IP en 1 minuto
- Al 6to intento, bloquea la IP por 15 minutos
- Registra el bloqueo en `audit_logs` con acción `rate_limit_exceeded`
- Notifica al administrador (log en consola)

---

### 2. Two-Factor Authentication Rate Limiter

**Endpoint:** `POST /auth/2fa/verify`, `POST /auth/2fa/complete`

**Configuración:**
- **Límite:** 5 intentos por minuto
- **Clave:** ID del usuario
- **Bloqueo:** 15 minutos después de exceder el límite
- **Ventana:** 1 minuto

**Uso:**
```typescript
import { twoFactorRateLimiter } from './middleware/rateLimiter';

router.post('/2fa/complete', twoFactorRateLimiter, twoFactorComplete);
```

**Comportamiento:**
- Permite hasta 5 intentos de verificación 2FA por usuario en 1 minuto
- Al 6to intento, bloquea al usuario por 15 minutos
- Usa `req.user.userId` si está autenticado, o `req.body.userId` si no
- Registra el bloqueo en `audit_logs`

---

### 3. Authenticated API Rate Limiter

**Endpoints:** Todos los endpoints autenticados (aplicado globalmente)

**Configuración:**
- **Límite:** 100 requests por minuto
- **Clave:** ID del usuario
- **Bloqueo:** No hay bloqueo permanente, solo rechazo temporal
- **Ventana:** 1 minuto

**Uso:**
```typescript
import { authenticatedApiRateLimiter } from './middleware/rateLimiter';

// Aplicado globalmente después de authenticate
app.use(authenticate, authenticatedApiRateLimiter);
```

**Comportamiento:**
- Permite hasta 100 requests por usuario autenticado en 1 minuto
- Al 101er request, devuelve 429 sin bloqueo permanente
- El contador se resetea automáticamente después de 1 minuto
- Registra intentos bloqueados en `audit_logs`

---

### 4. Public Quote Rate Limiter

**Endpoint:** `POST /shipments/quote`

**Configuración:**
- **Límite:** 10 requests por hora
- **Clave:** IP del cliente
- **Bloqueo:** No hay bloqueo permanente, solo rechazo temporal
- **Ventana:** 1 hora

**Uso:**
```typescript
import { publicQuoteRateLimiter } from './middleware/rateLimiter';

router.post('/quote', publicQuoteRateLimiter, quoteHandler);
```

**Comportamiento:**
- Permite hasta 10 cotizaciones por IP sin autenticación en 1 hora
- Al 11er request, devuelve 429 con mensaje sugiriendo registro
- El contador se resetea automáticamente después de 1 hora
- Registra intentos bloqueados en `audit_logs`

---

## Arquitectura

### Middleware Genérico

El sistema usa un middleware genérico `rateLimiter()` que acepta una configuración:

```typescript
interface RateLimitConfig {
  windowMs: number;           // Ventana de tiempo en ms
  maxRequests: number;        // Máximo de requests en la ventana
  blockDurationMs?: number;   // Duración del bloqueo (opcional)
  keyGenerator: (req) => string; // Función para generar la clave
  message?: string;           // Mensaje personalizado
}
```

### Flujo de Operación

```mermaid
graph TD
    A[Request] --> B{¿Clave bloqueada?}
    B -->|Sí| C[429 + TTL restante]
    B -->|No| D[Incrementar contador]
    D --> E{¿Primera request?}
    E -->|Sí| F[Establecer expiración]
    E -->|No| G{¿Excede límite?}
    F --> G
    G -->|Sí| H[Bloquear si configurado]
    G -->|No| I[Permitir request]
    H --> J[Registrar en audit_logs]
    J --> K[Notificar admin]
    K --> C
    I --> L[Agregar headers X-RateLimit-*]
    L --> M[next()]
```

### Claves de Redis

Las claves siguen el patrón: `ratelimit:{tipo}:{identificador}`

Ejemplos:
- `ratelimit:login:192.168.1.1` - Login por IP
- `ratelimit:2fa:user-123` - 2FA por usuario
- `ratelimit:api:user-456` - API por usuario
- `ratelimit:quote:192.168.1.1` - Cotización por IP

Para bloqueos: `{clave}:blocked`

Ejemplo: `ratelimit:login:192.168.1.1:blocked`

---

## Registro de Auditoría

Todos los intentos bloqueados se registran en la tabla `audit_logs`:

```sql
INSERT INTO audit_logs (
  actor_id,
  actor_role,
  action,
  entity_type,
  entity_id,
  before_data,
  after_data,
  ip_address
) VALUES (
  'user-123',           -- NULL si no autenticado
  'user',               -- NULL si no autenticado
  'rate_limit_exceeded',
  'rate_limit',
  NULL,
  NULL,
  '{"key": "...", "endpoint": "...", "method": "...", "retryAfter": 900}',
  '192.168.1.1'
);
```

---

## Notificaciones al Administrador

Cuando se bloquea un intento, se notifica al administrador:

**Actualmente:** Log en consola
```
[RATE LIMIT] Intento bloqueado - IP: 192.168.1.1, Usuario: user-123, Endpoint: POST /auth/login, Key: ratelimit:login:192.168.1.1
```

**Futuro (Tarea 13):** Notificación real por email/push al administrador

---

## Headers de Respuesta

El middleware agrega headers informativos a todas las respuestas:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200000
```

---

## Respuestas de Error

Cuando se excede el límite, se devuelve:

**Status:** `429 Too Many Requests`

**Body:**
```json
{
  "error": "Demasiados intentos de inicio de sesión. Su IP ha sido bloqueada por 15 minutos.",
  "retryAfter": 900
}
```

---

## Manejo de Errores

El sistema implementa **fail open**: si Redis falla, permite el request en lugar de bloquearlo.

```typescript
try {
  // Rate limiting logic
} catch (error) {
  console.error('[rateLimiter] Error:', error);
  next(); // Permitir el request
}
```

Esto garantiza disponibilidad del servicio incluso si Redis está caído.

---

## Testing

### Unit Tests

```bash
npm test -- rateLimiter.test.ts --run
```

Cubre:
- Comportamiento básico del middleware
- Configuraciones específicas (login, 2FA, API, quote)
- Registro en audit_logs
- Manejo de errores
- Edge cases

### Integration Tests

```bash
npm test -- rateLimiter.integration.test.ts --run
```

Cubre:
- Operaciones reales con Redis
- Escenarios de rate limiting completos
- Expiración automática de claves
- Concurrencia

---

## Configuración de Redis

El sistema usa la conexión Redis existente en `src/db/redis.ts`:

```typescript
import redis from '../db/redis';
```

**Variable de entorno:** `REDIS_URL` (default: `redis://localhost:6379`)

---

## Extensión

Para agregar un nuevo rate limiter:

```typescript
export const myCustomRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutos
  maxRequests: 20,
  blockDurationMs: 30 * 60 * 1000, // 30 minutos (opcional)
  keyGenerator: (req) => `ratelimit:custom:${req.user?.userId}`,
  message: 'Mensaje personalizado',
});
```

Luego aplicarlo en las rutas:

```typescript
router.post('/my-endpoint', myCustomRateLimiter, handler);
```

---

## Monitoreo

Para monitorear el rate limiting:

1. **Audit Logs:** Consultar `audit_logs` con `action = 'rate_limit_exceeded'`
2. **Redis:** Inspeccionar claves con patrón `ratelimit:*`
3. **Logs de consola:** Buscar `[RATE LIMIT]` en los logs

Ejemplo de consulta SQL:
```sql
SELECT 
  created_at,
  ip_address,
  actor_id,
  after_data->>'endpoint' as endpoint,
  after_data->>'key' as redis_key
FROM audit_logs
WHERE action = 'rate_limit_exceeded'
ORDER BY created_at DESC
LIMIT 100;
```

---

## Consideraciones de Seguridad

1. **IP Spoofing:** El sistema usa `req.ip` que puede ser manipulado. En producción, configurar Express con `trust proxy` correctamente.

2. **Distributed Systems:** Si se escala horizontalmente, Redis centraliza el rate limiting entre todas las instancias.

3. **Redis Persistence:** Configurar Redis con persistencia (RDB/AOF) para mantener contadores después de reinicios.

4. **Fail Open:** El sistema permite requests si Redis falla. Para mayor seguridad, cambiar a "fail closed" (rechazar si Redis falla).

---

## Referencias

- **Requerimientos:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
- **Design:** Sección "Seguridad - Rate Limiting (Redis)"
- **Código:** `packages/backend/src/middleware/rateLimiter.ts`
- **Tests:** `packages/backend/src/middleware/rateLimiter.test.ts`
