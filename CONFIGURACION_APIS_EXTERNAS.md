# Configuración de APIs Externas - STN PQ's

Este documento describe cómo configurar las integraciones con servicios externos necesarios para el funcionamiento completo del sistema.

## 1. OpenAI (Agente IA)

### Obtener API Key

1. Crear cuenta en https://platform.openai.com/
2. Ir a API Keys: https://platform.openai.com/api-keys
3. Crear nueva API key
4. Copiar la key (solo se muestra una vez)

### Configuración

Agregar a `.env`:
```env
OPENAI_API_KEY=sk-proj-...
```

### Costos Estimados

- GPT-4: ~$0.03 por 1K tokens de entrada, ~$0.06 por 1K tokens de salida
- Conversación promedio: ~500 tokens = $0.045
- 1000 conversaciones/mes ≈ $45

### Alternativas

- **GPT-3.5-turbo**: Más económico (~10x menos), cambiar en `ai.service.ts`:
  ```typescript
  model: 'gpt-3.5-turbo'
  ```

- **Anthropic Claude**: Cambiar implementación a usar `@anthropic-ai/sdk`

## 2. SendGrid (Emails)

### Obtener API Key

1. Crear cuenta en https://sendgrid.com/
2. Ir a Settings > API Keys
3. Crear API Key con permisos de "Mail Send"
4. Verificar dominio de envío

### Configuración

Agregar a `.env`:
```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@stnpqs.com
SENDGRID_FROM_NAME=STN PQ's
```

### Implementación

Instalar SDK:
```bash
npm install @sendgrid/mail
```

Actualizar `notifications.queue.ts`:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendEmailNotification(
  userId: number,
  title: string,
  message: string,
  type: string
): Promise<void> {
  const pool = require('../../db/pool').default;
  
  const userResult = await pool.query(
    `SELECT email, full_name FROM users WHERE id = $1`,
    [userId]
  );

  const { email, full_name } = userResult.rows[0];

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: process.env.SENDGRID_FROM_NAME!,
    },
    subject: title,
    text: message,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${title}</h2>
        <p>${message}</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Este es un correo automático de STN PQ's. Por favor no responder.
        </p>
      </div>
    `,
  };

  await sgMail.send(msg);
}
```

### Costos

- Plan gratuito: 100 emails/día
- Plan Essentials: $19.95/mes - 50,000 emails/mes
- Plan Pro: $89.95/mes - 100,000 emails/mes

### Alternativa: AWS SES

Más económico para alto volumen:
- $0.10 por 1,000 emails
- Requiere verificación de dominio
- SDK: `@aws-sdk/client-ses`

## 3. Twilio (SMS)

### Obtener Credenciales

1. Crear cuenta en https://www.twilio.com/
2. Obtener Account SID y Auth Token del dashboard
3. Comprar número de teléfono para envío

### Configuración

Agregar a `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Implementación

Instalar SDK:
```bash
npm install twilio
```

Actualizar `notifications.queue.ts`:
```typescript
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMSNotification(userId: number, message: string): Promise<void> {
  const pool = require('../../db/pool').default;
  
  const userResult = await pool.query(
    `SELECT phone FROM users WHERE id = $1`,
    [userId]
  );

  const { phone } = userResult.rows[0];

  if (!phone) {
    console.log(`Usuario ${userId} no tiene telefono registrado`);
    return;
  }

  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
}
```

### Costos

- SMS en Argentina: ~$0.045 por mensaje
- Número de teléfono: $1/mes
- 1000 SMS/mes ≈ $46

### Alternativa: AWS SNS

- $0.00645 por SMS en Argentina
- No requiere número dedicado
- SDK: `@aws-sdk/client-sns`

## 4. Web Push (Notificaciones Push)

### Generar VAPID Keys

Instalar herramienta:
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Configuración

Agregar a `.env`:
```env
VAPID_PUBLIC_KEY=BPxxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:admin@stnpqs.com
```

### Implementación Backend

Instalar SDK:
```bash
npm install web-push
```

Actualizar `notifications.queue.ts`:
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

async function sendPushNotification(
  userId: number,
  title: string,
  message: string
): Promise<void> {
  const pool = require('../../db/pool').default;
  
  // Obtener suscripciones push del usuario
  const subsResult = await pool.query(
    `SELECT subscription FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );

  const payload = JSON.stringify({
    title,
    body: message,
    icon: '/logo.png',
    badge: '/badge.png',
  });

  await Promise.all(
    subsResult.rows.map(row =>
      webpush.sendNotification(row.subscription, payload)
    )
  );
}
```

### Implementación Frontend

```typescript
// Solicitar permiso y suscribirse
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Enviar suscripción al backend
  await fetch('/notifications/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}
```

### Costos

- Gratuito (usa infraestructura del navegador)

## 5. MinIO (Almacenamiento de Archivos)

### Configuración Local (Docker)

Ya está en `docker-compose.yml`:
```yaml
minio:
  image: minio/minio
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  command: server /data --console-address ":9001"
```

### Configuración

Agregar a `.env`:
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=stnpqs
```

### Implementación

Ya está configurado en el proyecto. Para producción, usar AWS S3:

```env
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=AWS_ACCESS_KEY_ID
MINIO_SECRET_KEY=AWS_SECRET_ACCESS_KEY
MINIO_USE_SSL=true
MINIO_BUCKET=stnpqs-prod
```

## 6. Google Maps API (Opcional - Frontend)

### Obtener API Key

1. Ir a https://console.cloud.google.com/
2. Crear proyecto
3. Habilitar APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
4. Crear credenciales (API Key)
5. Restringir key por dominio

### Configuración Frontend

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaxxx
```

### Costos

- $200 de crédito gratis mensual
- Maps JavaScript API: $7 por 1,000 cargas
- Geocoding: $5 por 1,000 requests
- Directions: $5 por 1,000 requests

## Resumen de Costos Mensuales Estimados

### Escenario Bajo (100 usuarios activos)
- OpenAI: $10
- SendGrid: Gratis (100/día)
- Twilio: $10
- Web Push: Gratis
- MinIO/S3: $5
- Google Maps: Gratis ($200 crédito)
- **Total: ~$25/mes**

### Escenario Medio (1,000 usuarios activos)
- OpenAI: $50
- SendGrid: $20
- Twilio: $50
- Web Push: Gratis
- MinIO/S3: $20
- Google Maps: $50
- **Total: ~$190/mes**

### Escenario Alto (10,000 usuarios activos)
- OpenAI: $500
- SendGrid: $90
- Twilio: $500
- Web Push: Gratis
- MinIO/S3: $100
- Google Maps: $200
- **Total: ~$1,390/mes**

## Recomendaciones

1. **Empezar con simulación**: El sistema actual simula todos los servicios externos
2. **Habilitar gradualmente**: Activar servicios según necesidad real
3. **Monitorear costos**: Configurar alertas en cada plataforma
4. **Usar alternativas económicas**: AWS SES/SNS son más baratos que SendGrid/Twilio
5. **Caché de IA**: Guardar respuestas frecuentes para reducir llamadas a OpenAI
6. **Rate limiting**: Limitar llamadas a APIs externas por usuario

## Próximos Pasos

1. Crear cuentas en las plataformas necesarias
2. Obtener API keys y credenciales
3. Actualizar archivos `.env`
4. Descomentar código de integración en `notifications.queue.ts`
5. Probar cada integración individualmente
6. Monitorear logs y costos
