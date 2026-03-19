# Plan de Implementación: Sistema Logístico de Paquetería STN PQ's

## Descripción General

Implementación incremental del sistema completo: backend Node.js + Express (TypeScript), frontend React + TypeScript, PostgreSQL, Redis, Socket.io, MinIO y agente IA. Cada tarea construye sobre la anterior y termina con integración funcional.

## Tareas

- [x] 1. Configuración del proyecto y estructura base
  - Inicializar monorepo con workspaces: `packages/backend` y `packages/frontend`
  - Configurar TypeScript, ESLint y Prettier en ambos paquetes
  - Configurar Docker Compose con PostgreSQL, Redis y MinIO
  - Crear esquema inicial de base de datos con todas las tablas del modelo de datos
  - Configurar variables de entorno y archivos `.env.example`
  - _Requerimientos: 3.4_

- [-] 2. Módulo de autenticación y gestión de sesiones
  - [x] 2.1 Implementar registro de usuario y login con JWT
    - Crear endpoints `POST /auth/register` y `POST /auth/login`
    - Implementar hash de contraseñas con bcrypt (factor 12)
    - Generar access token (15 min) y refresh token (7 días, cookie HttpOnly)
    - Implementar redirección por rol (usuario, administrador, repartidor)
    - _Requerimientos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.2, 8.3, 8.6_

  - [ ]* 2.2 Test de propiedad: autenticación redirige según rol
    - **Propiedad 1: Autenticación redirige según rol**
    - **Valida: Requerimientos 1.3, 1.4, 1.5**

  - [ ]* 2.3 Test de propiedad: credenciales inválidas siempre rechazadas
    - **Propiedad 2: Credenciales inválidas son siempre rechazadas**
    - **Valida: Requerimiento 1.6**

  - [x] 2.4 Implementar 2FA con TOTP
    - Crear endpoints `POST /auth/2fa/setup` y `POST /auth/2fa/verify`
    - Generar secreto TOTP, encriptarlo con AES-256-GCM y almacenarlo
    - Generar código QR para apps de autenticación
    - Generar y almacenar códigos de respaldo encriptados
    - Forzar 2FA obligatorio para cuentas de Administrador
    - _Requerimientos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.5 Test de propiedad: round-trip de código TOTP
    - **Propiedad 3: 2FA — round-trip de código TOTP**
    - **Valida: Requerimientos 2.4, 2.5**

  - [x] 2.6 Implementar recuperación de contraseña
    - Crear endpoints `POST /auth/password/reset-request` y `POST /auth/password/reset`
    - Generar token de recuperación con expiración de 24 horas
    - Enviar email con enlace de recuperación
    - _Requerimientos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 2.7 Implementar gestión de sesiones y timeout automático
    - Crear endpoint `POST /auth/logout` e invalidar tokens en Redis
    - Implementar timeout: 30 min usuarios, 15 min administradores
    - Emitir advertencia via WebSocket 2 minutos antes del cierre
    - Implementar `POST /auth/token/refresh` para renovar access token
    - _Requerimientos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 3. Rate limiting y protección contra ataques
  - [x] 3.1 Implementar rate limiting con Redis
    - Configurar middleware de rate limiting para `POST /auth/login`: 5 intentos/min por IP, bloqueo 15 min
    - Configurar rate limiting para `POST /auth/2fa/verify`: 5 intentos/min por usuario
    - Configurar rate limiting para endpoints autenticados: 100 req/min por usuario
    - Configurar rate limiting para `POST /shipments/quote` sin auth: 10 req/hora por IP
    - Registrar intentos bloqueados en audit_logs y notificar al Administrador
    - _Requerimientos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 3.2 Test de propiedad: rate limiting de inicio de sesión
    - **Propiedad 4: Rate limiting de inicio de sesión**
    - **Valida: Requerimientos 6.1, 6.2**

  - [ ]* 3.3 Test de propiedad: rate limiting de API autenticada
    - **Propiedad 5: Rate limiting de API autenticada**
    - **Valida: Requerimiento 6.3**

  - [ ]* 3.4 Test de propiedad: rate limiting de cotización pública
    - **Propiedad 6: Rate limiting de cotización pública**
    - **Valida: Requerimiento 6.4**

- [x] 4. Checkpoint — Asegurar que todos los tests pasen
  - Verificar que autenticación, 2FA, sesiones y rate limiting funcionan correctamente.
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.


- [ ] 5. Módulo de tarifas y cotización
  - [x] 5.1 Implementar fórmulas de cálculo de tarifas
    - Implementar función `haversine(lat1, lng1, lat2, lng2): number`
    - Implementar cálculo de peso volumétrico: `max(peso_real, (l × a × h) / 5000)`
    - Implementar cálculo de tarifa S2S por tramos de distancia según estructura base
    - Implementar cálculo de tarifa S2D: tramo S2S + última milla ($1.500 base + $200/kg extra)
    - Implementar recargo Express del 40%
    - _Requerimientos: 27.8, 27.9, 27.10, 27.11, 27.12, 27.13_

  - [ ]* 5.2 Test de propiedad: fórmula de tarifa S2S con tramos de distancia
    - **Propiedad 8: Fórmula de tarifa S2S con tramos de distancia**
    - **Valida: Requerimientos 27.8, 27.11**

  - [ ]* 5.3 Test de propiedad: fórmula de tarifa S2D con última milla
    - **Propiedad 9: Fórmula de tarifa S2D con última milla**
    - **Valida: Requerimientos 27.9, 27.12**

  - [ ]* 5.4 Test de propiedad: recargo Express del 40%
    - **Propiedad 10: Recargo Express del 40%**
    - **Valida: Requerimiento 27.10**

  - [ ]* 5.5 Test de propiedad: peso volumétrico como peso efectivo
    - **Propiedad 11: Peso volumétrico como peso efectivo**
    - **Valida: Requerimiento 27.13**

  - [x] 5.6 Implementar endpoint de cotización pública
    - Crear `POST /shipments/quote` accesible sin autenticación
    - Calcular y devolver costo estimado, tiempo de entrega y sucursal más cercana al domicilio
    - Aplicar rate limiting de 10 req/hora por IP
    - _Requerimientos: 51.1, 51.2, 51.3, 15.17_

  - [x] 5.7 Implementar gestión de tarifas por administrador
    - Crear endpoints CRUD en `/admin/rates`
    - Almacenar historial de versiones de tarifas con fechas de vigencia
    - Aplicar tarifa vigente al momento de crear el envío
    - _Requerimientos: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.16_

  - [x] 5.8 Implementar descuentos por volumen y códigos promocionales
    - Calcular nivel de descuento según envíos del último mes (0%, 5%, 10%, 15%)
    - Crear endpoints CRUD para códigos promocionales en `/admin/promo-codes`
    - Validar código promocional al crear envío (vigencia, usos disponibles, tipo de descuento)
    - _Requerimientos: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 29.1, 29.2, 29.3, 29.4, 29.5_

  - [ ]* 5.9 Test de propiedad: descuentos por volumen según nivel de envíos
    - **Propiedad 17: Descuentos por volumen según nivel de envíos**
    - **Valida: Requerimiento 29.3**

  - [ ]* 5.10 Test de propiedad: validación de códigos promocionales
    - **Propiedad 18: Validación de códigos promocionales**
    - **Valida: Requerimientos 28.5, 28.6**

- [ ] 6. Módulo de envíos — creación y ciclo de vida
  - [x] 6.1 Implementar creación de envíos
    - Crear endpoint `POST /shipments` con validación completa del formulario
    - Generar `tracking_code` único y `verification_code` de 6 dígitos
    - Validar sucursal de origen activa, tipo de contenido, dimensiones y peso positivos
    - Calcular costo total (tarifa + seguro + descuentos) y verificar saldo suficiente
    - Deducir saldo del usuario en transacción ACID y crear registro de transacción
    - Enviar email con tracking_code y verification_code al usuario
    - _Requerimientos: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 15.14, 15.15, 15.16, 15.17_

  - [ ]* 6.2 Test de propiedad: deducción de saldo al crear envío
    - **Propiedad 12: Deducción de saldo al crear envío**
    - **Valida: Requerimiento 15.8**

  - [ ]* 6.3 Test de propiedad: rechazo por saldo insuficiente
    - **Propiedad 13: Rechazo por saldo insuficiente**
    - **Valida: Requerimiento 15.9**

  - [x] 6.4 Implementar máquina de estados de envíos
    - Definir mapa de transiciones válidas: Pendiente→En Sucursal, En Sucursal→Asignado, Asignado→En Camino, En Camino→En Entrega, En Entrega→Entregado/Entrega_Fallida, Entrega_Fallida→En Entrega/Devuelto_a_Sucursal, Pendiente/En Sucursal→Cancelado
    - Crear endpoint `PATCH /shipments/:id/status` que valide la transición
    - Registrar cada transición en `shipment_status_history` con fecha, hora y usuario responsable
    - _Requerimientos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 6.5 Test de propiedad: transiciones de estado de envío
    - **Propiedad 7: Transiciones de estado de envío**
    - **Valida: Requerimientos 10.2, 10.3, 10.4, 10.5**

  - [x] 6.6 Implementar restricciones, seguro y envíos programados
    - Validar límites máximos de peso y dimensiones por servicio
    - Mostrar lista de contenidos prohibidos y requisitos para contenido peligroso
    - Implementar seguro opcional: calcular costo según valor declarado
    - Validar fecha de recolección programada (mínimo 24h, máximo 30 días)
    - Procesar automáticamente envíos programados al llegar la fecha
    - _Requerimientos: 16.1, 16.2, 16.3, 16.4, 16.5, 17.1, 17.2, 17.3, 17.4, 17.5, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

- [ ] 7. Módulo de seguimiento y visualización de envíos
  - [x] 7.1 Implementar endpoints de seguimiento y listado
    - Crear `GET /shipments` con filtros por estado y ordenamiento por fecha descendente
    - Crear `GET /shipments/:trackingCode` con historial completo de estados
    - Implementar búsqueda por tracking_code validando pertenencia al usuario autenticado
    - _Requerimientos: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 7.2 Implementar exportación de historial y estado de cuenta
    - Crear `GET /reports/export/shipments` (CSV/Excel) con filtros de fecha y estado
    - Crear `GET /reports/export/financial` (PDF/Excel) con filtros de fecha
    - _Requerimientos: 12.7, 13.7, 33.1, 33.2, 33.3, 33.4, 33.5_

- [ ] 8. Módulo de pagos y saldo
  - [x] 8.1 Implementar recarga de saldo y pasarela de pago
    - Crear endpoint `POST /payments/topup` con integración a pasarela (Visa/MC/Amex)
    - Actualizar saldo en transacción ACID solo si el pago es exitoso
    - Generar recibo digital y enviarlo por email al usuario
    - Manejar fallo de pasarela sin modificar saldo
    - _Requerimientos: 45.1, 45.2, 45.3, 45.4, 45.5, 45.6, 45.7, 45.8, 45.9, 45.10, 46.1, 46.2, 46.3, 46.4, 46.5_

  - [x] 8.2 Implementar historial de transacciones y métodos de pago guardados
    - Crear `GET /payments/transactions` con filtro por rango de fechas
    - Crear `GET /payments/receipts/:id` para descarga de recibos
    - Crear endpoints `POST /payments/methods` y `GET /payments/methods`
    - Encriptar tokens de tarjeta con AES-256-GCM (nunca almacenar PAN completo)
    - _Requerimientos: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 3.2_

  - [x] 8.3 Implementar cancelaciones y reembolsos
    - Crear `POST /shipments/:id/cancel` validando estados permitidos (Pendiente, En Sucursal)
    - Reembolsar costo completo al saldo del usuario en transacción ACID
    - Ocultar botón de cancelación para estados Asignado, En Camino, En Entrega, Entregado, Cancelado
    - _Requerimientos: 47.1, 47.2, 47.3, 47.4, 47.5, 47.6, 47.7, 47.8, 47.9, 47.10, 47.11, 47.12, 47.13_

  - [ ]* 8.4 Test de propiedad: reembolso completo al cancelar antes de salir de sucursal
    - **Propiedad 19: Reembolso completo al cancelar antes de salir de sucursal**
    - **Valida: Requerimiento 47.5**

- [x] 9. Checkpoint — Asegurar que todos los tests pasen
  - Verificar tarifas, creación de envíos, estados, pagos y cancelaciones.
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.


- [x] 10. Módulo GPS, rastreo en tiempo real y confirmación de entrega
  - [x] 10.1 Implementar WebSocket para ubicación GPS del repartidor
    - Configurar Socket.io con rooms por envío (`shipment:{id}`)
    - Implementar evento `location:update` que actualiza `couriers.current_lat/lng` en DB
    - Transmitir actualización a usuarios suscritos al envío cada ≤30 segundos
    - Calcular ETA con fórmula Haversine / velocidad promedio configurable (30 km/h)
    - Mostrar última ubicación conocida con indicador de tiempo si el repartidor pierde conexión
    - _Requerimientos: 20.1, 20.2, 20.3, 20.4, 43.1, 43.2, 43.3, 43.4, 43.5_

  - [x] 10.2 Implementar confirmación de entrega con evidencias
    - Crear `POST /shipments/:id/delivery/confirm` que requiera al menos una evidencia (firma, código o foto)
    - Validar código de verificación de 6 dígitos contra el almacenado en el envío
    - Almacenar firma digital, foto y datos del receptor en `delivery_evidences` y MinIO
    - Registrar fecha, hora y ubicación GPS de la confirmación
    - _Requerimientos: 44.1, 44.2, 44.3, 44.4, 44.5, 44.6, 44.7, 44.8, 44.9, 44.10, 44.11_

  - [ ]* 10.3 Test de propiedad: confirmación de entrega requiere al menos una evidencia
    - **Propiedad 14: Confirmación de entrega requiere al menos una evidencia**
    - **Valida: Requerimiento 44.1**

  - [ ]* 10.4 Test de propiedad: round-trip del código de verificación de entrega
    - **Propiedad 15: Round-trip del código de verificación de entrega**
    - **Valida: Requerimientos 44.10, 44.11**

  - [x] 10.5 Implementar entrega fallida con geolocalización y reintentos
    - Crear `POST /shipments/:id/delivery/fail` que valide distancia ≤200m del destino
    - Solicitar foto obligatoria del domicilio y selección de motivo de no entrega
    - Registrar intento como "No Entregado sin justificación" si no hay foto o está fuera de rango
    - Cambiar automáticamente a "Devuelto_a_Sucursal" al tercer intento fallido
    - Crear incidencia crítica automática al cambiar a "Devuelto_a_Sucursal"
    - _Requerimientos: 42.6, 42.7, 42.8, 42.9, 42.10, 42.11, 58.3, 58.6, 58.7, 50.6_

  - [ ]* 10.6 Test de propiedad: geolocalización obligatoria para entrega fallida
    - **Propiedad 16: Geolocalización obligatoria para entrega fallida**
    - **Valida: Requerimiento 42.6**

  - [ ]* 10.7 Test de propiedad: máximo 3 intentos de entrega por envío
    - **Propiedad 20: Máximo 3 intentos de entrega por envío**
    - **Valida: Requerimiento 58.3**

- [x] 11. Módulo de repartidores y asignación de envíos
  - [x] 11.1 Implementar gestión de repartidores
    - Crear endpoints en `/admin/couriers` para registro, activación/desactivación
    - Implementar disponibilidad y turnos: `PATCH /couriers/availability`, `POST /couriers/shifts`
    - Cambiar disponibilidad a no disponible automáticamente al finalizar turno
    - _Requerimientos: 37.1, 37.2, 37.3, 37.4, 37.5, 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_

  - [x] 11.2 Implementar asignación de envíos y panel de repartidor
    - Crear `POST /admin/shipments/:id/assign` que cambia estado a "Asignado" y notifica al repartidor
    - Sugerir repartidor disponible más cercano geográficamente al origen del envío
    - Crear `GET /couriers/shipments` para listar envíos asignados ordenados por prioridad y proximidad
    - Registrar historial de asignaciones
    - _Requerimientos: 41.1, 41.2, 41.3, 41.4, 41.5, 41.6, 39.1, 39.2, 39.3, 39.4_

  - [x] 11.3 Implementar optimización de rutas
    - Calcular ruta optimizada para múltiples envíos considerando ubicación actual, destinos y prioridades
    - Mostrar ruta en mapa con orden sugerido de entregas
    - Recalcular automáticamente al asignar nuevos envíos
    - _Requerimientos: 40.1, 40.2, 40.3, 40.4, 40.5_

- [x] 12. Módulo de chat en tiempo real
  - [x] 12.1 Implementar canal de chat usuario-repartidor por envío
    - Configurar eventos Socket.io: `chat:join`, `chat:message`, `chat:typing`, `chat:history`
    - Abrir canal automáticamente cuando el envío entra en estado "En Entrega"
    - Cerrar canal automáticamente cuando el envío es marcado como "Entregado"
    - Reabrir canal cuando se crea una Reclamación formal sobre el envío
    - Crear `GET /chat/:shipmentId/messages` para historial de mensajes
    - Persistir todos los mensajes en `chat_messages`
    - _Requerimientos: 21.1, 21.2, 21.3, 21.4, 21.5, 21.10, 58.2_

  - [x] 12.2 Implementar flujo de reclamación con Agente IA en el chat
    - Cuando se reabre el chat por Reclamación, el Agente IA inicia recopilando la versión del usuario
    - El Agente IA luego contacta al repartidor en el mismo canal para obtener su versión
    - Si el repartidor no responde en 24h, marcar su versión como "Sin respuesta" y notificar al Administrador
    - Presentar análisis completo al Administrador para resolución
    - _Requerimientos: 21.6, 21.7, 21.8, 21.9, 21.11_

- [x] 13. Módulo de notificaciones multicanal
  - [x] 13.1 Implementar cola de notificaciones asíncrona con BullMQ
    - Configurar BullMQ sobre Redis para procesamiento asíncrono de notificaciones
    - Persistir cada notificación en tabla `notifications` antes de enviar por canales externos
    - Implementar reintentos con backoff exponencial (3 intentos) para fallos de envío
    - _Requerimientos: 34.1, 34.2, 34.3, 34.4, 34.5_

  - [x] 13.2 Implementar notificaciones por email, push y SMS
    - Integrar SendGrid/SES para emails transaccionales (creación, cambios de estado, entrega fallida, devuelto a sucursal, recordatorios)
    - Implementar Web Push con VAPID para notificaciones en navegador
    - Integrar Twilio/SNS para SMS en eventos críticos (En Entrega, Entregado, Entrega Fallida, Devuelto a Sucursal)
    - _Requerimientos: 34.6, 34.7, 34.8, 55.1, 55.2, 55.3, 55.4, 55.5, 55.6, 55.7, 56.1, 56.2, 56.3, 56.4, 56.5, 56.6, 56.7, 56.8_

  - [x] 13.3 Implementar Centro de Notificaciones in-app
    - Crear endpoints `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
    - Crear `PUT /notifications/preferences` para configurar preferencias por canal y tipo de evento
    - Mostrar indicador visual con conteo de no leídas
    - Agregar notificaciones en tiempo real via WebSocket al Centro de Notificaciones
    - _Requerimientos: 57.1, 57.2, 57.3, 57.4, 57.5, 57.6, 57.7, 57.8_

  - [ ]* 13.4 Test de propiedad: preferencias de notificación son respetadas
    - **Propiedad 21: Preferencias de notificación son respetadas**
    - **Valida: Requerimientos 34.6, 55.4, 56.5**

- [x] 14. Módulo de Agente IA
  - [x] 14.1 Implementar conversación con el Agente IA
    - Crear `POST /ai/chat` con timeout de 90 segundos al LLM provider
    - Construir contexto enriquecido: historial de conversación, saldo y envíos recientes del usuario
    - Configurar system prompt en español con rol de asistente de logística STN PQ's
    - Implementar function calling: `get_shipment_status`, `get_user_balance`, `get_shipment_history`, `create_incident`, `initiate_claim`, `cancel_shipment`, `get_refund_policy`, `escalate_to_human`
    - Manejar timeout del LLM con mensaje amigable y escalamiento automático a humano
    - _Requerimientos: 53.1, 53.2, 53.3, 53.4, 53.5, 53.6, 53.7, 53.8, 53.9, 53.10, 53.11, 53.12, 53.13, 53.14, 53.15_

  - [x] 14.2 Implementar historial, calificación y administración del Agente IA
    - Crear `GET /ai/chat/history` para historial de conversaciones del usuario
    - Crear `POST /ai/chat/:sessionId/rate` para calificación al finalizar conversación
    - Implementar respuesta del Agente IA para envíos en estado "Devuelto_a_Sucursal"
    - Crear endpoints de administración para configurar respuestas y revisar historial
    - _Requerimientos: 53.16, 53.17, 53.18, 53.19, 53.20, 58.9_

- [x] 15. Checkpoint — Asegurar que todos los tests pasen
  - Verificar GPS, chat, notificaciones y Agente IA.
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.


- [ ] 16. Módulo de administración
  - [x] 16.1 Implementar gestión de envíos y usuarios por administrador
    - Crear `GET /admin/shipments` con búsqueda por tracking_code, usuario o destino y filtros por estado/fecha/sucursal
    - Crear `PATCH /admin/shipments/:id` para modificar destino, peso, dimensiones, detalles y estado
    - Crear `GET /admin/users` y `PATCH /admin/users/:id` para gestión de cuentas y saldo
    - _Requerimientos: 23.1, 23.2, 23.3, 23.4, 24.1, 24.2, 24.3, 24.4, 24.5, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_

  - [x] 16.2 Implementar gestión de sucursales y servicios logísticos
    - Crear endpoints CRUD en `/admin/branches` con validación de coordenadas GPS
    - Crear endpoints CRUD en `/admin/services` para servicios logísticos con nombre único
    - Desactivar servicios sin eliminarlos del historial; ocultarlos de nuevos envíos
    - _Requerimientos: 36.1, 36.2, 36.3, 36.4, 36.5, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 14.1, 14.2, 14.3_

- [ ] 17. Logs de auditoría y encriptación de datos sensibles
  - [x] 17.1 Implementar logs de auditoría
    - Crear middleware que registre en `audit_logs` toda acción crítica: login, modificación de envío, modificación de cuenta, pago
    - Incluir en cada entrada: actor, rol, acción, entidad, datos antes/después, IP y timestamp
    - Crear `GET /admin/audit-logs` con filtros de búsqueda
    - Implementar política de retención de 12 meses
    - _Requerimientos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 17.2 Test de propiedad: completitud de logs de auditoría
    - **Propiedad 22: Completitud de logs de auditoría**
    - **Valida: Requerimiento 4.5**

  - [x] 17.3 Implementar encriptación de datos sensibles
    - Encriptar secretos TOTP y códigos de respaldo con AES-256-GCM
    - Encriptar tokens de tarjetas de pago con AES-256-GCM (nunca almacenar PAN)
    - Encriptar datos personales sensibles en DB con clave maestra en variable de entorno
    - Configurar TLS 1.2+ para todas las comunicaciones
    - _Requerimientos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 18. Módulo de incidencias, reclamaciones y tickets de soporte
  - [x] 18.1 Implementar gestión de incidencias y escalamiento automático
    - Crear endpoint para reportar incidencia con tipo, descripción y fotos de evidencia
    - Marcar automáticamente como crítica incidencias de tipo "paquete perdido"
    - Crear incidencia automática para envíos con más de 48h de retraso
    - Notificar al Administrador cuando un repartidor acumula 3+ incidencias en un día
    - _Requerimientos: 48.1, 48.2, 48.3, 48.4, 48.5, 48.6, 48.7, 48.8, 48.9, 50.1, 50.2, 50.3, 50.4, 50.5_

  - [x] 18.2 Implementar reclamaciones formales
    - Crear endpoint para escalar incidencia a reclamación con formulario y evidencias
    - Implementar flujo de revisión y aprobación de compensación por el Administrador
    - Acreditar compensación aprobada al saldo del usuario en transacción ACID
    - Registrar todas las reclamaciones y resoluciones en audit_logs
    - _Requerimientos: 49.1, 49.2, 49.3, 49.4, 49.5, 49.6, 49.7, 49.8, 49.9_

  - [x] 18.3 Implementar tickets de soporte
    - Crear endpoints CRUD para tickets con número único, asunto, descripción y adjuntos
    - Implementar estados: Abierto, En Proceso, Resuelto, Cerrado
    - Notificar al usuario por email cuando el Administrador responde
    - Crear endpoints de administración para filtrar y asignar prioridades
    - _Requerimientos: 52.1, 52.2, 52.3, 52.4, 52.5, 52.6, 52.7, 52.8, 52.9, 52.10, 52.11, 52.12_

- [ ] 19. Módulo de reportes y dashboard
  - [x] 19.1 Implementar dashboard de métricas en tiempo real
    - Crear `GET /reports/dashboard` con envíos por período, ingresos, tiempos promedio, usuarios activos e incidencias
    - Actualizar métricas en tiempo real via WebSocket
    - Mostrar incidencias críticas en sección destacada
    - _Requerimientos: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7, 30.8, 50.5_

  - [x] 19.2 Implementar reportes de desempeño y financieros
    - Crear `GET /reports/couriers/:id/performance` con entregas completadas, tiempo promedio, % a tiempo e incidencias
    - Crear `GET /reports/financial` con ingresos por servicio, sucursal y método de pago
    - Implementar exportación CSV/Excel/PDF con filtros de fecha
    - _Requerimientos: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 32.1, 32.2, 32.3, 32.4, 32.5, 32.6_

- [x] 20. Módulo de perfil, libreta de direcciones y FAQ
  - [x] 20.1 Implementar gestión de perfil de usuario
    - Crear endpoints para actualizar nombre, teléfono, foto de perfil y contraseña
    - Validar formato de teléfono y contraseña actual antes de guardar cambios
    - Subir foto de perfil a MinIO
    - _Requerimientos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 20.2 Implementar libreta de direcciones
    - Crear endpoints CRUD para direcciones con nombre descriptivo, coordenadas y favoritos
    - Validar dirección antes de guardar
    - Exponer direcciones guardadas en el formulario de creación de envío
    - _Requerimientos: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 20.3 Implementar sección de FAQ
    - Crear endpoints CRUD para preguntas frecuentes organizadas por categorías
    - Implementar buscador de preguntas
    - Accesible sin autenticación
    - _Requerimientos: 54.1, 54.2, 54.3, 54.4, 54.5_

- [x] 21. Frontend — Vistas de autenticación y panel de usuario
  - [x] 21.1 Implementar vistas de autenticación
    - Crear pantalla de bienvenida, login, registro y recuperación de contraseña
    - Implementar flujo de configuración y verificación de 2FA con código QR
    - Implementar advertencia de expiración de sesión y extensión de sesión
    - _Requerimientos: 1.1, 1.2, 2.1, 2.2, 7.1, 5.4, 5.5_

  - [x] 21.2 Implementar panel de usuario y seguimiento
    - Crear panel con envíos activos, saldo, notificaciones y acceso al Agente IA
    - Implementar vista de seguimiento con mapa Google Maps, historial de estados y chat
    - Mostrar GPS en vivo del repartidor y ETA cuando el envío está "En Entrega"
    - Integrar apertura de Google Maps con ubicación de sucursal
    - _Requerimientos: 12.1, 12.2, 19.1, 19.2, 19.3, 20.1, 20.3, 20.4, 21.1_

  - [x] 21.3 Implementar formulario de creación de envío
    - Crear formulario multi-paso: tipo (S2S/S2D), origen, destino, dimensiones, modalidad, seguro, código promocional
    - Mostrar cotización en tiempo real al completar los datos del envío
    - Integrar selección de direcciones de la libreta
    - _Requerimientos: 15.1, 15.13, 15.14, 15.15, 15.16, 15.17, 17.1, 18.4_

  - [x] 21.4 Implementar estado de cuenta y recarga de saldo
    - Crear vista de transacciones con filtro por fechas y exportación
    - Implementar flujo de recarga con selección de método de pago y métodos guardados
    - _Requerimientos: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 45.2_

- [x] 22. Frontend — Panel de repartidor y panel de administración
  - [x] 22.1 Implementar panel de repartidor
    - Crear vista de envíos asignados con ruta optimizada en mapa
    - Implementar flujo de actualización de estado con captura de evidencias (firma, foto, código)
    - Implementar flujo de entrega fallida con validación de geolocalización, foto y selección de motivo
    - Solicitar permiso GPS al iniciar sesión y transmitir ubicación cada 30 segundos
    - _Requerimientos: 39.1, 39.2, 39.3, 39.4, 40.3, 42.1, 42.2, 42.3, 43.1, 43.2, 44.2, 44.4_

  - [x] 22.2 Implementar panel de administración
    - Crear dashboard con métricas en tiempo real e incidencias críticas destacadas
    - Implementar vistas de gestión: envíos, usuarios, repartidores, sucursales, servicios, tarifas, códigos promocionales
    - Implementar vista de logs de auditoría con filtros y búsqueda
    - Implementar vista de incidencias, reclamaciones y tickets de soporte
    - _Requerimientos: 23.1, 23.3, 24.4, 25.1, 30.1, 50.5_

- [x] 23. Landing pública y cotizador sin registro
  - Crear landing page con cotizador público (origen, destino, peso → costo estimado y tiempos)
  - Mostrar servicios logísticos con tarifas y tiempos de entrega sin autenticación
  - Incluir sección FAQ accesible públicamente
  - Mostrar mensaje de registro requerido para crear envío con enlace al formulario
  - _Requerimientos: 51.1, 51.2, 51.3, 51.4, 51.5, 51.6, 51.7, 51.8_

- [x] 24. Checkpoint final — Asegurar que todos los tests pasen
  - Ejecutar suite completa de tests unitarios y de propiedades.
  - Verificar integración end-to-end de todos los módulos.
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad completa
- Los tests de propiedades usan **fast-check** con mínimo 100 iteraciones por propiedad
- Los tests de propiedades complementan (no reemplazan) los tests unitarios
- Las transacciones de saldo siempre usan transacciones ACID de PostgreSQL
- Los checkpoints garantizan validación incremental antes de continuar
