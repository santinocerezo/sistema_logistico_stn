# Ejemplos de Uso de la API - Sistema Logístico STN PQ's

## Autenticación

### 1. Registro de Usuario
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "Password123!",
  "full_name": "Juan Pérez",
  "phone": "+5491123456789"
}

# Respuesta:
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "role": "user"
  }
}
```

### 2. Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "Password123!"
}

# Respuesta:
{
  "message": "Login exitoso",
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "role": "user"
  }
}
```

## Envíos

### 3. Cotización Pública (sin autenticación)
```bash
POST /shipments/quote
Content-Type: application/json

{
  "origin": { "lat": -34.6037, "lng": -58.3816 },
  "destAddress": { "lat": -34.9214, "lng": -57.9544 },
  "shipmentType": "S2D",
  "modality": "Normal",
  "dimensions": {
    "weight_kg": 5,
    "length_cm": 30,
    "width_cm": 20,
    "height_cm": 15
  }
}

# Respuesta:
{
  "cost": 2850.50,
  "breakdown": {
    "base_cost": 1200,
    "last_mile_cost": 1500,
    "express_surcharge": 0,
    "total_cost": 2850.50,
    "distance_km": 56.3
  },
  "estimated_delivery_days": 2,
  "nearest_branch": {
    "lat": -34.9200,
    "lng": -57.9500
  }
}
```

### 4. Crear Envío
```bash
POST /shipments
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "origin_branch_id": "uuid-sucursal-origen",
  "shipment_type": "S2D",
  "dest_address": "Calle Falsa 123, La Plata",
  "dest_lat": -34.9214,
  "dest_lng": -57.9544,
  "modality": "Express",
  "weight_kg": 5,
  "length_cm": 30,
  "width_cm": 20,
  "height_cm": 15,
  "content_type": "estandar",
  "special_instructions": "Llamar antes de entregar",
  "has_insurance": true,
  "declared_value": 50000
}

# Respuesta:
{
  "message": "Envío creado exitosamente",
  "shipment": {
    "id": "uuid",
    "tracking_code": "STNABCD1234",
    "verification_code": "123456",
    "total_cost": 3990.50,
    "discount_applied": 0,
    "estimated_delivery_at": "2024-01-15T18:00:00Z"
  }
}
```

### 5. Listar Envíos del Usuario
```bash
GET /shipments?status=En%20Entrega&limit=10
Authorization: Bearer {access_token}

# Respuesta:
{
  "shipments": [
    {
      "id": "uuid",
      "tracking_code": "STNABCD1234",
      "status": "En Entrega",
      "dest_address": "Calle Falsa 123",
      "total_cost": 3990.50,
      "created_at": "2024-01-10T10:00:00Z",
      "origin_branch_name": "Sucursal Centro",
      "dest_branch_name": "Sucursal La Plata"
    }
  ],
  "total": 1
}
```

### 6. Seguimiento por Código
```bash
GET /shipments/STNABCD1234
Authorization: Bearer {access_token}

# Respuesta:
{
  "shipment": {
    "id": "uuid",
    "tracking_code": "STNABCD1234",
    "status": "En Entrega",
    "dest_address": "Calle Falsa 123",
    "total_cost": 3990.50,
    "created_at": "2024-01-10T10:00:00Z"
  },
  "status_history": [
    {
      "from_status": null,
      "to_status": "Pendiente",
      "created_at": "2024-01-10T10:00:00Z"
    },
    {
      "from_status": "Pendiente",
      "to_status": "En Sucursal",
      "created_at": "2024-01-10T14:00:00Z"
    },
    {
      "from_status": "En Sucursal",
      "to_status": "Asignado",
      "created_at": "2024-01-11T08:00:00Z"
    },
    {
      "from_status": "Asignado",
      "to_status": "En Camino",
      "created_at": "2024-01-11T09:00:00Z"
    },
    {
      "from_status": "En Camino",
      "to_status": "En Entrega",
      "created_at": "2024-01-11T15:00:00Z"
    }
  ]
}
```

### 7. Cancelar Envío
```bash
POST /shipments/{id}/cancel
Authorization: Bearer {access_token}

# Respuesta:
{
  "message": "Envío cancelado exitosamente",
  "refund_amount": 3990.50,
  "new_balance": 15000.00
}
```

## Pagos

### 8. Recarga de Saldo
```bash
POST /payments/topup
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "amount": 10000,
  "payment_method": "credit_card",
  "card_token": "tok_visa_4242",
  "save_card": true
}

# Respuesta:
{
  "message": "Recarga exitosa",
  "transaction": {
    "id": "uuid",
    "amount": 10000,
    "type": "recarga",
    "status": "completado",
    "created_at": "2024-01-10T10:00:00Z"
  },
  "new_balance": 25000.00
}
```

### 9. Historial de Transacciones
```bash
GET /payments/transactions?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {access_token}

# Respuesta:
{
  "transactions": [
    {
      "id": "uuid",
      "type": "recarga",
      "amount": 10000,
      "balance_after": 25000,
      "concept": "Recarga de saldo",
      "created_at": "2024-01-10T10:00:00Z"
    },
    {
      "id": "uuid",
      "type": "pago_envio",
      "amount": -3990.50,
      "balance_after": 15000,
      "concept": "Pago de envío STNABCD1234",
      "tracking_code": "STNABCD1234",
      "created_at": "2024-01-10T11:00:00Z"
    }
  ],
  "total": 2
}
```

## Tracking GPS

### 10. Ubicación en Tiempo Real
```bash
GET /tracking/{shipmentId}/live
Authorization: Bearer {access_token}

# Respuesta:
{
  "courier_location": {
    "lat": -34.9100,
    "lng": -57.9600,
    "last_updated": "2024-01-11T15:30:00Z"
  },
  "eta_minutes": 15
}
```

### 11. Confirmar Entrega (Repartidor)
```bash
POST /shipments/{id}/delivery/confirm
Authorization: Bearer {courier_access_token}
Content-Type: application/json

{
  "verification_code": "123456",
  "signature_url": "https://storage.com/signature.png",
  "photo_url": "https://storage.com/delivery.jpg",
  "receiver_name": "María González",
  "receiver_relation": "Titular",
  "location_lat": -34.9214,
  "location_lng": -57.9544
}

# Respuesta:
{
  "message": "Entrega confirmada exitosamente",
  "shipment_id": "uuid",
  "status": "Entregado"
}
```

### 12. Registrar Entrega Fallida (Repartidor)
```bash
POST /shipments/{id}/delivery/fail
Authorization: Bearer {courier_access_token}
Content-Type: application/json

{
  "failure_reason": "Destinatario ausente",
  "photo_url": "https://storage.com/failed_delivery.jpg",
  "location_lat": -34.9214,
  "location_lng": -57.9544
}

# Respuesta:
{
  "message": "Entrega fallida registrada",
  "shipment_id": "uuid",
  "status": "Entrega_Fallida",
  "delivery_attempts": 1
}
```

## Administración

### 13. Buscar Todos los Envíos (Admin)
```bash
GET /admin/shipments?tracking_code=STN&status=En%20Entrega&limit=20
Authorization: Bearer {admin_access_token}

# Respuesta:
{
  "shipments": [
    {
      "id": "uuid",
      "tracking_code": "STNABCD1234",
      "status": "En Entrega",
      "sender_email": "usuario@example.com",
      "sender_name": "Juan Pérez",
      "dest_address": "Calle Falsa 123",
      "total_cost": 3990.50,
      "courier_name": "Carlos Repartidor",
      "created_at": "2024-01-10T10:00:00Z"
    }
  ],
  "total": 1
}
```

### 14. Asignar Repartidor (Admin)
```bash
POST /admin/shipments/{id}/assign
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "courier_id": "uuid-repartidor"
}

# Respuesta:
{
  "message": "Repartidor asignado exitosamente",
  "shipment_id": "uuid",
  "courier": {
    "id": "uuid",
    "full_name": "Carlos Repartidor",
    "phone": "+5491198765432"
  }
}
```

### 15. Crear Sucursal (Admin)
```bash
POST /admin/branches
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "name": "Sucursal Norte",
  "address": "Av. Libertador 1000, CABA",
  "lat": -34.5800,
  "lng": -58.4200,
  "schedule": "Lun-Vie 9:00-18:00, Sáb 9:00-13:00"
}

# Respuesta:
{
  "message": "Sucursal creada exitosamente",
  "branch": {
    "id": "uuid",
    "name": "Sucursal Norte",
    "address": "Av. Libertador 1000, CABA",
    "lat": -34.5800,
    "lng": -58.4200,
    "is_active": true
  }
}
```

## Incidencias y Reclamaciones

### 16. Reportar Incidencia
```bash
POST /incidents
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "shipment_id": "uuid",
  "type": "paquete_danado",
  "description": "El paquete llegó con la caja rota y contenido dañado",
  "photo_urls": ["https://storage.com/damage1.jpg", "https://storage.com/damage2.jpg"]
}

# Respuesta:
{
  "message": "Incidencia reportada exitosamente",
  "incident": {
    "id": "uuid",
    "incident_number": "INC1705000000",
    "type": "paquete_danado",
    "status": "abierto",
    "is_critical": false
  }
}
```

### 17. Crear Reclamación
```bash
POST /claims
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "incident_id": "uuid",
  "description": "Solicito compensación por el daño del contenido valorado en $50.000",
  "claimed_amount": 50000,
  "evidence_urls": ["https://storage.com/receipt.jpg"]
}

# Respuesta:
{
  "message": "Reclamación creada exitosamente",
  "claim": {
    "id": "uuid",
    "claim_number": "CLM1705000000",
    "status": "pendiente"
  }
}
```

### 18. Resolver Reclamación (Admin)
```bash
PATCH /admin/claims/{id}/resolve
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "status": "aprobada",
  "approved_amount": 40000,
  "admin_notes": "Se aprueba compensación del 80% del valor reclamado"
}

# Respuesta:
{
  "message": "Reclamación resuelta exitosamente",
  "claim_id": "uuid",
  "status": "aprobada",
  "approved_amount": 40000
}
```

## Perfil y Direcciones

### 19. Actualizar Perfil
```bash
PATCH /profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "full_name": "Juan Carlos Pérez",
  "phone": "+5491123456789",
  "current_password": "Password123!",
  "new_password": "NewPassword456!"
}

# Respuesta:
{
  "message": "Perfil actualizado exitosamente",
  "profile": {
    "id": "uuid",
    "email": "usuario@example.com",
    "full_name": "Juan Carlos Pérez",
    "phone": "+5491123456789"
  }
}
```

### 20. Guardar Dirección
```bash
POST /addresses
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "label": "Casa",
  "address": "Calle Falsa 123, La Plata",
  "lat": -34.9214,
  "lng": -57.9544,
  "is_favorite": true
}

# Respuesta:
{
  "message": "Dirección guardada exitosamente",
  "address": {
    "id": "uuid",
    "label": "Casa",
    "address": "Calle Falsa 123, La Plata",
    "is_favorite": true
  }
}
```

## Reportes

### 21. Dashboard de Métricas (Admin)
```bash
GET /reports/dashboard?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {admin_access_token}

# Respuesta:
{
  "shipments": {
    "total_shipments": 1250,
    "delivered": 1100,
    "in_delivery": 50,
    "pending": 80,
    "cancelled": 20
  },
  "revenue": {
    "total_revenue": 4500000,
    "total_transactions": 1250
  },
  "active_users": 450,
  "incidents": {
    "total_incidents": 25,
    "critical_incidents": 3
  },
  "avg_delivery_hours": "36.50"
}
```

### 22. Desempeño de Repartidor (Admin)
```bash
GET /reports/couriers/{id}/performance?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer {admin_access_token}

# Respuesta:
{
  "courier_id": "uuid",
  "deliveries": {
    "total_deliveries": 150,
    "successful_deliveries": 145,
    "failed_deliveries": 5
  },
  "avg_delivery_hours": "2.50",
  "on_time_percentage": "96.67",
  "incidents": 2
}
```

## Códigos de Error Comunes

```json
// 400 Bad Request
{
  "error": "Datos de entrada inválidos",
  "details": [...]
}

// 401 Unauthorized
{
  "error": "Token inválido o expirado"
}

// 403 Forbidden
{
  "error": "Sin permisos para esta acción"
}

// 404 Not Found
{
  "error": "Envío no encontrado"
}

// 409 Conflict
{
  "error": "Transición de estado no permitida: En Entrega → Pendiente",
  "current_status": "En Entrega",
  "valid_transitions": ["Entregado", "Entrega_Fallida"]
}

// 422 Unprocessable Entity
{
  "error": "Saldo insuficiente",
  "required": 3990.50,
  "available": 2000.00
}

// 429 Too Many Requests
{
  "error": "Demasiadas solicitudes. Intente nuevamente en 15 minutos"
}

// 500 Internal Server Error
{
  "error": "Error interno del servidor"
}
```

## Notas de Autenticación

Todos los endpoints (excepto `/auth/register`, `/auth/login` y `/shipments/quote`) requieren el header:

```
Authorization: Bearer {access_token}
```

Los endpoints de administración (`/admin/*`) requieren además que el usuario tenga rol `admin`.

Los endpoints de repartidor requieren rol `courier`.
