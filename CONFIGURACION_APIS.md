# Configuración de APIs Externas - STN PQ's

Este documento describe cómo configurar las APIs externas opcionales para el sistema.

## 📋 Índice

1. [OpenAI (Agente IA)](#openai-agente-ia)
2. [Google Maps](#google-maps)
3. [SendGrid (Email)](#sendgrid-email)
4. [Twilio (SMS)](#twilio-sms)
5. [Pasarela de Pago](#pasarela-de-pago)

---

## 🤖 OpenAI (Agente IA)

El Agente IA conversacional usa OpenAI GPT-4 para responder consultas de usuarios.

### Obtener API Key:

1. Crear cuenta en https://platform.openai.com/
2. Ir a https://platform.openai.com/api-keys
3. Crear nueva API key
4. Copiar la key (empieza con `sk-`)

### Configurar en `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-tu-api-key-aqui
OPENAI_MODEL=gpt-4
AI_TIMEOUT_MS=90000
```

### Costos aproximados:

- GPT-4: ~$0.03 por 1K tokens de entrada, ~$0.06 por 1K tokens de salida
- GPT-3.5-turbo: ~$0.0015 por 1K tokens (más económico)

### Alternativa sin costo:

Si no quieres usar OpenAI, el sistema funcionará sin el Agente IA. Los usuarios podrán usar el chat en tiempo real con repartidores y el sistema de tickets de soporte.

---

## 🗺️ Google Maps

Usado para geocodificación, mapas y cálculo de rutas.

### Obtener API Key:

1. Ir a https://console.cloud.google.com/
2. Crear nuevo proyecto o seleccionar uno existente
3. Habilitar APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
4. Ir a "Credenciales" → "Crear credenciales" → "Clave de API"
5. Restringir la key por dominio (localhost:5173 para desarrollo)

### Configurar en `.env`:

```env
GOOGLE_MAPS_API_KEY=tu-api-key-aqui
```

### Configurar en frontend:

Agregar en `packages/frontend/index.html`:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=TU_API_KEY&libraries=places"></script>
```

### Costos aproximados:

- Primeros $200/mes gratis
- Geocoding: $5 por 1000 requests
- Maps JavaScript API: $7 por 1000 cargas de mapa

### Alternativa sin costo:

Usar OpenStreetMap con Leaflet (gratuito, open source):

```bash
npm install leaflet react-leaflet
```

---

## 📧 SendGrid (Email)

Para enviar emails transaccionales (confirmaciones, notificaciones, recuperación de contraseña).

### Obtener API Key:

1. Crear cuenta en https://sendgrid.com/
2. Plan gratuito: 100 emails/día
3. Ir a Settings → API Keys → Create API Key
4. Copiar la key

### Configurar en `.env`:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.tu-api-key-aqui
EMAIL_FROM=noreply@tudominio.com
EMAIL_FROM_NAME=STN PQ's
```

### Verificar dominio:

1. Ir a Settings → Sender Authentication
2. Verificar dominio o email individual
3. Seguir instrucciones de DNS

### Alternativa: AWS SES

```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
EMAIL_FROM=noreply@tudominio.com
```

### Alternativa sin costo (desarrollo):

Usar Mailtrap para testing:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=tu-usuario
SMTP_PASS=tu-password
```

---

## 📱 Twilio (SMS)

Para notificaciones SMS en eventos críticos.

### Obtener credenciales:

1. Crear cuenta en https://www.twilio.com/
2. Plan de prueba: $15 de crédito gratis
3. Obtener:
   - Account SID
   - Auth Token
   - Número de teléfono Twilio

### Configurar en `.env`:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Costos aproximados:

- SMS Argentina: ~$0.08 por mensaje
- Número de teléfono: ~$1/mes

### Alternativa: AWS SNS

```env
SMS_PROVIDER=sns
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
```

### Alternativa sin costo:

El sistema funciona perfectamente sin SMS. Las notificaciones se envían por:
- Email
- Notificaciones in-app
- WebSocket en tiempo real

---

## 💳 Pasarela de Pago

Para procesar pagos con tarjeta de crédito/débito.

### Opciones recomendadas para Argentina:

#### 1. Mercado Pago

```env
PAYMENT_GATEWAY=mercadopago
MERCADOPAGO_ACCESS_TOKEN=tu-access-token
MERCADOPAGO_PUBLIC_KEY=tu-public-key
```

Documentación: https://www.mercadopago.com.ar/developers

#### 2. Stripe

```env
PAYMENT_GATEWAY=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Documentación: https://stripe.com/docs

#### 3. TodoPago

```env
PAYMENT_GATEWAY=todopago
TODOPAGO_MERCHANT_ID=tu-merchant-id
TODOPAGO_API_KEY=tu-api-key
```

### Modo de prueba:

Todas las pasarelas tienen modo sandbox/test para desarrollo sin procesar pagos reales.

### Alternativa sin costo (desarrollo):

El sistema tiene un simulador de pagos para desarrollo. Los usuarios pueden recargar saldo y el sistema registra las transacciones sin procesar pagos reales.

---

## 🔧 Configuración Mínima para Desarrollo

Para empezar a desarrollar sin APIs externas:

```env
# Solo estas son necesarias
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=stnpq
POSTGRES_USER=stnpq_user
POSTGRES_PASSWORD=stnpq_pass

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_ACCESS_SECRET=tu-secret-generado
JWT_REFRESH_SECRET=tu-secret-generado
ENCRYPTION_MASTER_KEY=tu-key-generada
```

El sistema funcionará con:
- ✅ Autenticación y autorización
- ✅ Gestión de envíos
- ✅ Tracking en tiempo real
- ✅ Chat usuario-repartidor
- ✅ Notificaciones in-app
- ✅ Dashboard y reportes
- ❌ Agente IA (opcional)
- ❌ Emails (se loguean en consola)
- ❌ SMS (se loguean en consola)
- ❌ Pagos reales (usa simulador)

---

## 📝 Notas Importantes

1. **Nunca commitear** las API keys al repositorio
2. Usar `.env.example` como plantilla
3. En producción, usar variables de entorno del servidor
4. Rotar las keys periódicamente
5. Monitorear uso y costos de las APIs

---

## 🆘 Soporte

Si necesitas ayuda configurando alguna API:

- OpenAI: https://platform.openai.com/docs
- Google Maps: https://developers.google.com/maps
- SendGrid: https://docs.sendgrid.com/
- Twilio: https://www.twilio.com/docs
- Mercado Pago: https://www.mercadopago.com.ar/developers
