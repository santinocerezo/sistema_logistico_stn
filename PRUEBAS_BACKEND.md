# 🧪 Pruebas del Backend - STN PQ's

## ✅ Estado Actual

- ✅ Docker corriendo (PostgreSQL, Redis, MinIO)
- ✅ Backend corriendo en http://localhost:3000
- ✅ Health check: http://localhost:3000/health

## 📋 Requests de Prueba

### 1. Health Check ✅

```bash
curl http://localhost:3000/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T23:27:11.866Z"
}
```

### 2. Registro de Usuario

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "password": "Password123!",
    "fullName": "Usuario Test",
    "phone": "+5491112345678",
    "role": "user"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@test.com",
    "fullName": "Usuario Test",
    "role": "user"
  }
}
```

### 3. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "password": "Password123!"
  }'
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "usuario@test.com",
    "fullName": "Usuario Test",
    "role": "user"
  }
}
```

**Guardar el accessToken para los siguientes requests!**

### 4. Obtener Sucursales (Público)

```bash
curl http://localhost:3000/branches
```

**Respuesta esperada:**
```json
{
  "branches": [
    {
      "id": 1,
      "name": "Sucursal Centro",
      "address": "Av. Corrientes 1234",
      "latitude": -34.6037,
      "longitude": -58.3816,
      "isActive": true
    }
  ]
}
```

### 5. Cotización Pública (Sin Auth)

```bash
curl -X POST http://localhost:3000/shipments/quote \
  -H "Content-Type: application/json" \
  -d '{
    "originBranchId": 1,
    "destinationLat": -34.6037,
    "destinationLng": -58.3816,
    "weight": 5,
    "length": 30,
    "width": 20,
    "height": 15,
    "serviceType": "standard"
  }'
```

**Respuesta esperada:**
```json
{
  "estimatedCost": 1250.50,
  "estimatedDeliveryTime": "2-3 días hábiles",
  "nearestBranch": {
    "id": 1,
    "name": "Sucursal Centro",
    "distance": 5.2
  }
}
```

### 6. Crear Envío (Requiere Auth)

```bash
curl -X POST http://localhost:3000/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI" \
  -d '{
    "originBranchId": 1,
    "destinationType": "branch",
    "destinationBranchId": 2,
    "destinationAddress": "Av. Santa Fe 1234",
    "destinationLat": -34.5945,
    "destinationLng": -58.3974,
    "weight": 5,
    "length": 30,
    "width": 20,
    "height": 15,
    "serviceType": "standard",
    "contentType": "documents",
    "contentDescription": "Documentos importantes",
    "declaredValue": 1000,
    "requiresInsurance": true
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Envío creado exitosamente",
  "shipment": {
    "id": 1,
    "trackingCode": "STN-2026-001234",
    "verificationCode": "123456",
    "status": "Pendiente",
    "totalCost": 1350.75
  }
}
```

### 7. Consultar Envío por Tracking Code

```bash
curl http://localhost:3000/shipments/STN-2026-001234 \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "shipment": {
    "id": 1,
    "trackingCode": "STN-2026-001234",
    "status": "Pendiente",
    "createdAt": "2026-03-18T23:30:00.000Z",
    "statusHistory": [
      {
        "status": "Pendiente",
        "timestamp": "2026-03-18T23:30:00.000Z"
      }
    ]
  }
}
```

### 8. Chat con Agente IA (Requiere Auth y OpenAI API Key)

```bash
curl -X POST http://localhost:3000/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI" \
  -d '{
    "message": "Hola, ¿cuál es mi saldo actual?"
  }'
```

**Respuesta esperada (si OpenAI está configurado):**
```json
{
  "response": "Hola! Tu saldo actual es de $5,000.00. ¿Hay algo más en lo que pueda ayudarte?",
  "sessionId": "session_1_1710799800000"
}
```

**Respuesta esperada (si OpenAI NO está configurado):**
```json
{
  "error": "Error al procesar tu mensaje",
  "response": "Lo siento, hubo un error. ¿Te gustaría que escalara tu consulta a un agente humano?"
}
```

### 9. Obtener Ruta Optimizada (Repartidor)

```bash
curl http://localhost:3000/couriers/route/optimized \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_REPARTIDOR"
```

**Respuesta esperada:**
```json
{
  "currentLocation": {
    "lat": -34.6037,
    "lng": -58.3816
  },
  "route": [
    {
      "shipmentId": 1,
      "order": 1,
      "distance": 5.2,
      "estimatedTime": 10,
      "shipment": {
        "trackingCode": "STN-2026-001234",
        "destinationAddress": "Av. Santa Fe 1234"
      }
    }
  ],
  "totalDistance": 5.2,
  "totalEstimatedTime": 10
}
```

### 10. Obtener Notificaciones

```bash
curl http://localhost:3000/notifications \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "shipment_created",
      "title": "Envío creado",
      "message": "Tu envío STN-2026-001234 ha sido creado exitosamente",
      "isRead": false,
      "createdAt": "2026-03-18T23:30:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

## 🔧 Usando Postman / Thunder Client

### Importar Colección

Puedes crear una colección en Postman con estos endpoints:

1. **Crear Environment:**
   - `baseUrl`: http://localhost:3000
   - `accessToken`: (se llenará después del login)

2. **Crear Requests:**
   - Health Check: GET {{baseUrl}}/health
   - Register: POST {{baseUrl}}/auth/register
   - Login: POST {{baseUrl}}/auth/login
   - Get Branches: GET {{baseUrl}}/branches
   - Quote: POST {{baseUrl}}/shipments/quote
   - Create Shipment: POST {{baseUrl}}/shipments
   - Get Shipment: GET {{baseUrl}}/shipments/:trackingCode
   - AI Chat: POST {{baseUrl}}/ai/chat
   - Get Route: GET {{baseUrl}}/couriers/route/optimized
   - Get Notifications: GET {{baseUrl}}/notifications

3. **Configurar Headers:**
   - Para requests autenticados: `Authorization: Bearer {{accessToken}}`
   - Para todos: `Content-Type: application/json`

## 🧪 Flujo de Prueba Completo

### Paso 1: Registrar Usuario
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@stnpqs.com",
    "password": "Test123!",
    "fullName": "Usuario Prueba",
    "phone": "+5491112345678",
    "role": "user"
  }'
```

### Paso 2: Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@stnpqs.com",
    "password": "Test123!"
  }'
```

**Copiar el accessToken de la respuesta**

### Paso 3: Obtener Sucursales
```bash
curl http://localhost:3000/branches
```

### Paso 4: Hacer Cotización
```bash
curl -X POST http://localhost:3000/shipments/quote \
  -H "Content-Type: application/json" \
  -d '{
    "originBranchId": 1,
    "destinationLat": -34.6037,
    "destinationLng": -58.3816,
    "weight": 5,
    "length": 30,
    "width": 20,
    "height": 15,
    "serviceType": "standard"
  }'
```

### Paso 5: Crear Envío
```bash
curl -X POST http://localhost:3000/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "originBranchId": 1,
    "destinationType": "branch",
    "destinationBranchId": 1,
    "destinationAddress": "Av. Corrientes 1234",
    "destinationLat": -34.6037,
    "destinationLng": -58.3816,
    "weight": 5,
    "length": 30,
    "width": 20,
    "height": 15,
    "serviceType": "standard",
    "contentType": "documents",
    "contentDescription": "Documentos",
    "declaredValue": 1000,
    "requiresInsurance": false
  }'
```

### Paso 6: Consultar Envío
```bash
curl http://localhost:3000/shipments/STN-2026-XXXXXX \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Paso 7: Probar Agente IA (si OpenAI está configurado)
```bash
curl -X POST http://localhost:3000/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "message": "¿Cuál es el estado de mi envío?"
  }'
```

## ✅ Verificación de Servicios

### PostgreSQL
```bash
docker exec -it stnpq_postgres psql -U stnpq_user -d stnpq -c "SELECT COUNT(*) FROM users;"
```

### Redis
```bash
docker exec -it stnpq_redis redis-cli PING
```

### MinIO
Abrir: http://localhost:9001
- Usuario: minio_admin
- Contraseña: minio_secret

## 🎯 Próximo Paso: Configurar OpenAI

Para que el Agente IA funcione, necesitas configurar OpenAI.
Ver el siguiente archivo: `CONFIGURACION_OPENAI.md`
