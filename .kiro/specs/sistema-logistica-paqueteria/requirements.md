# Documento de Requerimientos - Sistema Logístico de Paquetería STN PQ's

## Introducción

El Sistema Logístico de Paquetería STN PQ's es una aplicación web que permite a los usuarios gestionar envíos de paquetes, realizar seguimiento en tiempo real, administrar su cuenta y saldo, mientras que los administradores tienen control total sobre el sistema, pedidos y cuentas de usuario.

## Glosario

- **Sistema**: Sistema Logístico de Paquetería STN PQ's
- **Usuario**: Persona registrada que puede realizar y rastrear envíos
- **Administrador**: Usuario con privilegios elevados que gestiona el sistema completo
- **Repartidor**: Trabajador que entrega paquetes y es rastreado por GPS
- **Visitante**: Persona no autenticada que accede al sistema
- **Envío**: Paquete registrado en el sistema para ser transportado
- **Código_de_Seguimiento**: Identificador único asignado a cada envío
- **Código_de_Verificación**: Código de 6 dígitos para confirmar entregas
- **Saldo_en_Cuenta**: Crédito disponible del usuario para pagar envíos
- **Sucursal**: Ubicación física donde se procesan paquetes
- **Pasarela_de_Pago**: Servicio externo que procesa pagos con tarjeta
- **Recibo**: Comprobante digital de una transacción de pago
- **Ticket**: Solicitud de soporte creada por un usuario
- **Firma_Digital**: Firma capturada electrónicamente como evidencia de entrega
- **Foto_de_Evidencia**: Imagen del paquete entregado como prueba
- **Receptor**: Persona que recibe físicamente el paquete
- **2FA**: Autenticación de dos factores para mayor seguridad
- **Log_de_Auditoría**: Registro de acciones críticas en el sistema
- **Dimensiones**: Medidas de largo, ancho y alto de un paquete
- **Tipo_de_Contenido**: Clasificación del contenido del paquete (frágil, perecedero, peligroso, estándar)
- **Seguro**: Protección opcional para envíos de alto valor
- **Tarifa**: Precio de un servicio logístico
- **Código_Promocional**: Código para aplicar descuentos en envíos
- **Dashboard**: Panel de métricas y estadísticas para administradores
- **Incidencia**: Problema reportado con un envío
- **Reclamación**: Solicitud formal de compensación por problemas con envíos
- **Ruta_Optimizada**: Ruta calculada automáticamente para minimizar tiempo y distancia
- **Agente_IA**: Sistema conversacional con inteligencia artificial que atiende consultas de usuarios
- **Centro_de_Notificaciones**: Panel dentro del sistema donde el usuario visualiza todas sus alertas históricas
- **Disponibilidad**: Estado de trabajo activo de un repartidor que indica si puede recibir asignaciones
- **Turno**: Período de trabajo asignado a un repartidor con horario de inicio y fin
- **Entrega_Fallida**: Estado de un envío cuando el repartidor no pudo completar la entrega en el domicilio del destinatario
- **Devuelto_a_Sucursal**: Estado final de un envío que no pudo ser entregado tras 3 intentos fallidos y fue retornado a la sucursal de origen
- **Reintento**: Nuevo intento de entrega programado después de una Entrega_Fallida
- **Envío_S2S**: Modalidad de envío de sucursal a sucursal donde el destinatario retira el paquete en la sucursal de destino
- **Envío_S2D**: Modalidad de envío de sucursal a domicilio donde el paquete se entrega en la dirección del destinatario
- **Última_Milla**: Tramo final de entrega desde la sucursal más cercana al domicilio del destinatario hasta el domicilio
- **Peso_Volumétrico**: Peso calculado en base a las dimensiones del paquete usando la fórmula (largo × ancho × alto) / 5.000
- **Modalidad_Normal**: Envío estándar sin prioridad especial
- **Modalidad_Express**: Envío con prioridad y tiempo de entrega reducido, con recargo del 40% sobre tarifa base


## Requerimientos

### Requerimiento 1: Autenticación de Usuarios

**User Story:** Como usuario, quiero iniciar sesión con mis credenciales, para que pueda acceder a mi cuenta y sus funcionalidades.

#### Criterios de Aceptación

1. WHEN un usuario accede al Sistema, THE Sistema SHALL mostrar la pantalla "Bienvenido al Sistema Logístico de STN PQ's"
2. THE Sistema SHALL proporcionar una pantalla de inicio de sesión con campos para correo electrónico y contraseña
3. WHEN un Usuario ingresa credenciales válidas, THE Sistema SHALL autenticar al usuario y redirigirlo según su rol
4. WHEN un Administrador inicia sesión, THE Sistema SHALL redirigirlo al panel de administración
5. WHEN un Usuario normal inicia sesión, THE Sistema SHALL redirigirlo al panel de usuario
6. WHEN un usuario ingresa credenciales inválidas, THE Sistema SHALL mostrar un mensaje de error descriptivo

### Requerimiento 2: Autenticación de Dos Factores (2FA)

**User Story:** Como usuario, quiero activar autenticación de dos factores, para que mi cuenta tenga mayor seguridad.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una opción para activar 2FA en la configuración de cuenta
2. WHEN un Usuario activa 2FA, THE Sistema SHALL generar un código QR para configurar una aplicación de autenticación
3. WHEN un Usuario con 2FA activo inicia sesión, THE Sistema SHALL solicitar un código de verificación después de las credenciales
4. WHEN un Usuario ingresa un código 2FA válido, THE Sistema SHALL completar la autenticación
5. IF el código 2FA es inválido, THEN THE Sistema SHALL rechazar el acceso y registrar el intento fallido
6. THE Sistema SHALL proporcionar códigos de respaldo para recuperación de acceso
7. THE Sistema SHALL requerir 2FA obligatorio para todas las cuentas de Administrador

### Requerimiento 3: Encriptación de Datos Sensibles

**User Story:** Como usuario, quiero que mis datos sensibles estén protegidos, para que mi información personal y financiera esté segura.

#### Criterios de Aceptación

1. THE Sistema SHALL encriptar todas las contraseñas usando algoritmos de hash seguros
2. THE Sistema SHALL encriptar información de tarjetas de crédito antes de almacenarla
3. THE Sistema SHALL encriptar datos personales sensibles en la base de datos
4. THE Sistema SHALL utilizar conexiones HTTPS para todas las comunicaciones
5. THE Sistema SHALL encriptar tokens de sesión y cookies de autenticación

### Requerimiento 4: Logs de Auditoría

**User Story:** Como administrador, quiero revisar logs de auditoría, para que pueda monitorear acciones críticas en el sistema.

#### Criterios de Aceptación

1. WHEN un Usuario o Administrador inicia sesión, THE Sistema SHALL registrar la acción en el Log_de_Auditoría
2. WHEN un Administrador modifica un envío, THE Sistema SHALL registrar la acción con detalles completos
3. WHEN un Administrador modifica una cuenta de usuario, THE Sistema SHALL registrar la acción en el Log_de_Auditoría
4. WHEN se realiza un pago, THE Sistema SHALL registrar la transacción en el Log_de_Auditoría
5. FOR EACH entrada de auditoría, THE Sistema SHALL incluir fecha, hora, usuario, acción y datos modificados
6. THE Sistema SHALL permitir al Administrador filtrar y buscar en los logs de auditoría
7. THE Sistema SHALL retener logs de auditoría por al menos 12 meses

### Requerimiento 5: Gestión de Sesiones y Timeout Automático

**User Story:** Como usuario, quiero que mi sesión sea segura, para que nadie pueda acceder a mi cuenta si dejo el navegador abierto.

#### Criterios de Aceptación

1. WHEN un Usuario permanece inactivo por 30 minutos, THE Sistema SHALL cerrar automáticamente la sesión
2. WHEN un Administrador permanece inactivo por 15 minutos, THE Sistema SHALL cerrar automáticamente la sesión
3. WHEN una sesión expira, THE Sistema SHALL redirigir al usuario a la pantalla de inicio de sesión
4. THE Sistema SHALL mostrar una advertencia 2 minutos antes de cerrar la sesión por inactividad
5. THE Sistema SHALL permitir al Usuario extender la sesión antes de que expire
6. THE Sistema SHALL invalidar tokens de sesión al cerrar sesión manualmente

### Requerimiento 6: Protección contra Ataques (Rate Limiting)

**User Story:** Como administrador, quiero que el sistema esté protegido contra ataques, para que el servicio permanezca disponible y seguro.

#### Criterios de Aceptación

1. THE Sistema SHALL limitar intentos de inicio de sesión a 5 por minuto por dirección IP
2. WHEN se excede el límite de intentos de inicio de sesión, THE Sistema SHALL bloquear la IP por 15 minutos
3. THE Sistema SHALL limitar solicitudes de API a 100 por minuto por usuario autenticado
4. THE Sistema SHALL limitar solicitudes de cotización sin registro a 10 por hora por dirección IP
5. WHEN se detecta un patrón de ataque, THE Sistema SHALL notificar al Administrador
6. THE Sistema SHALL registrar todos los intentos bloqueados en el Log_de_Auditoría

### Requerimiento 7: Recuperación de Contraseña

**User Story:** Como usuario, quiero recuperar mi contraseña si la olvido, para que pueda volver a acceder a mi cuenta.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un enlace "Olvidé mi contraseña" en la pantalla de inicio de sesión
2. WHEN un usuario solicita recuperación de contraseña, THE Sistema SHALL solicitar su correo electrónico
3. WHEN un usuario proporciona un correo electrónico registrado, THE Sistema SHALL enviar un enlace de recuperación al correo electrónico
4. WHEN un usuario accede al enlace de recuperación, THE Sistema SHALL permitir establecer una nueva contraseña
5. IF el correo electrónico no está registrado, THEN THE Sistema SHALL mostrar un mensaje indicando que el correo no existe
6. THE Sistema SHALL invalidar el enlace de recuperación de contraseña después de 24 horas de su generación

### Requerimiento 8: Registro de Cuenta Obligatorio

**User Story:** Como nuevo usuario, quiero crear una cuenta, para que pueda realizar envíos en el sistema.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un formulario de registro con campos para nombre, correo electrónico y contraseña
2. WHEN un usuario completa el registro, THE Sistema SHALL crear una cuenta con saldo inicial en cero
3. THE Sistema SHALL validar que el correo electrónico sea único en el sistema
4. THE Sistema SHALL enviar un correo de confirmación al correo electrónico registrado
5. THE Sistema SHALL requerir una cuenta registrada para realizar cualquier envío
6. THE Sistema SHALL requerir que la contraseña tenga mínimo 8 caracteres, al menos una letra mayúscula, un número y un carácter especial

### Requerimiento 9: Gestión de Perfil de Usuario

**User Story:** Como usuario, quiero editar mi propio perfil de forma autónoma, para que pueda mantener mi información actualizada sin depender del administrador.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una sección de perfil editable en el panel de usuario
2. THE Sistema SHALL permitir al Usuario modificar su nombre completo
3. THE Sistema SHALL permitir al Usuario modificar su número de teléfono
4. THE Sistema SHALL permitir al Usuario cargar y actualizar su foto de perfil
5. THE Sistema SHALL validar que el número de teléfono tenga un formato válido antes de guardarlo
6. THE Sistema SHALL permitir al Usuario cambiar su contraseña proporcionando la contraseña actual y la nueva
7. IF la contraseña actual proporcionada es incorrecta, THEN THE Sistema SHALL rechazar el cambio y mostrar un mensaje de error
8. WHEN un Usuario actualiza su perfil, THE Sistema SHALL confirmar los cambios con un mensaje de éxito


### Requerimiento 10: Estados de Envío - Ciclo de Vida Completo

**User Story:** Como usuario y administrador, quiero que el sistema defina y valide los estados posibles de un envío, para que el ciclo de vida de cada paquete sea claro y consistente.

#### Criterios de Aceptación

1. THE Sistema SHALL definir los siguientes estados válidos para un envío: Pendiente, En Sucursal, Asignado, En Camino, En Entrega, Entregado, Entrega_Fallida, Devuelto_a_Sucursal y Cancelado
2. THE Sistema SHALL permitir únicamente las siguientes transiciones de estado: Pendiente → En Sucursal, En Sucursal → Asignado, Asignado → En Camino, En Camino → En Entrega, En Entrega → Entregado, En Entrega → Entrega_Fallida
3. THE Sistema SHALL permitir la transición desde Entrega_Fallida → En Entrega (Reintento) y desde Entrega_Fallida → Devuelto_a_Sucursal (después del tercer intento fallido)
4. THE Sistema SHALL permitir la transición a Cancelado únicamente desde los estados Pendiente o En Sucursal
5. IF se intenta realizar una transición de estado no válida, THEN THE Sistema SHALL rechazar la operación y mostrar un mensaje de error descriptivo
6. THE Sistema SHALL permitir marcar un envío con la bandera "Incidencia Reportada" desde cualquier estado activo sin cambiar el estado del envío
7. WHEN el estado de un envío cambia, THE Sistema SHALL registrar la transición con fecha, hora y usuario responsable
8. THE Sistema SHALL mostrar el historial completo de transiciones de estado en el seguimiento del envío

### Requerimiento 11: Seguimiento por Código

**User Story:** Como usuario, quiero ingresar un código de seguimiento, para que pueda ver el estado y ubicación de mi paquete.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un campo de búsqueda para ingresar un Código_de_Seguimiento
2. WHEN un Usuario ingresa un Código_de_Seguimiento válido de su propiedad, THE Sistema SHALL mostrar los detalles completos del envío
3. THE Sistema SHALL mostrar el historial de estados del envío con fechas y ubicaciones
4. IF el Código_de_Seguimiento no existe o no pertenece al Usuario, THEN THE Sistema SHALL mostrar un mensaje de error

### Requerimiento 12: Historial y Visualización de Envíos del Usuario

**User Story:** Como usuario, quiero ver todos mis envíos activos e historial completo, para que pueda revisar su estado, información y tener un registro de todos mis envíos pasados y actuales.

#### Criterios de Aceptación

1. WHEN un Usuario accede a su panel, THE Sistema SHALL mostrar una lista de todos sus envíos activos
2. FOR EACH envío, THE Sistema SHALL mostrar el Código_de_Seguimiento, destino, estado actual y fecha de creación
3. THE Sistema SHALL permitir al Usuario filtrar envíos por estado
4. THE Sistema SHALL ordenar los envíos por fecha de creación de forma descendente por defecto
5. THE Sistema SHALL proporcionar una sección de historial de pedidos con todos los envíos del Usuario ordenados cronológicamente
6. FOR EACH envío en el historial, THE Sistema SHALL mostrar Código_de_Seguimiento, fecha, destino, estado final y costo
7. THE Sistema SHALL permitir al Usuario exportar su historial de pedidos

### Requerimiento 13: Gestión de Saldo y Estado de Cuenta

**User Story:** Como usuario, quiero ver y gestionar mi saldo en cuenta y revisar mis transacciones, para que pueda pagar futuros envíos y tener control de mis movimientos financieros.

#### Criterios de Aceptación

1. WHEN un Usuario accede a su panel, THE Sistema SHALL mostrar su Saldo_en_Cuenta actual
2. THE Sistema SHALL proporcionar una opción para agregar fondos al Saldo_en_Cuenta
3. THE Sistema SHALL registrar todas las transacciones de saldo con fecha y concepto
4. THE Sistema SHALL proporcionar una sección de estado de cuenta con todas las transacciones incluyendo recargas y pagos de envíos
5. FOR EACH transacción, THE Sistema SHALL mostrar fecha, concepto, monto y saldo resultante
6. THE Sistema SHALL permitir al Usuario filtrar transacciones por rango de fechas
7. THE Sistema SHALL permitir al Usuario exportar su estado de cuenta

### Requerimiento 14: Visualización de Servicios Logísticos

**User Story:** Como usuario, quiero ver los servicios logísticos disponibles, para que pueda conocer las opciones de envío.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una sección de servicios logísticos accesible desde el panel de usuario
2. THE Sistema SHALL mostrar información de cada servicio incluyendo descripción, tiempos de entrega y tarifas
3. THE Sistema SHALL mantener la información de servicios actualizada

### Requerimiento 15: Creación de Envío con Dimensiones y Detalles

**User Story:** Como usuario, quiero crear un nuevo envío con información completa, para que pueda enviar un paquete a un destino.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un formulario para crear envíos con campos para sucursal de origen, destino, peso, dimensiones, tipo de contenido y detalles
2. THE Sistema SHALL solicitar las Dimensiones del paquete en centímetros (largo x ancho x alto)
3. THE Sistema SHALL solicitar el Tipo_de_Contenido del paquete (frágil, perecedero, peligroso, estándar)
4. THE Sistema SHALL validar que la sucursal de origen seleccionada esté activa en el sistema
5. THE Sistema SHALL permitir al Usuario especificar fecha y hora deseada de recolección
6. THE Sistema SHALL permitir al Usuario agregar instrucciones especiales de manejo
7. WHEN un Usuario crea un envío, THE Sistema SHALL calcular el costo basado en peso, dimensiones, destino y tipo de contenido
8. WHEN un Usuario confirma el envío, THE Sistema SHALL deducir el costo del Saldo_en_Cuenta
9. IF el Saldo_en_Cuenta es insuficiente, THEN THE Sistema SHALL rechazar el envío y mostrar un mensaje de saldo insuficiente
10. WHEN un envío es creado exitosamente, THE Sistema SHALL generar un Código_de_Seguimiento único
11. WHEN un envío es creado exitosamente, THE Sistema SHALL generar un Código_de_Verificación único de 6 dígitos y enviarlo al correo electrónico del Usuario junto con el Código_de_Seguimiento
12. WHEN un envío es creado exitosamente, THE Sistema SHALL asociar el envío a la cuenta del Usuario para seguimiento futuro
13. THE Sistema SHALL solicitar al Usuario el tipo de envío al crear un nuevo envío: "Sucursal a Sucursal" o "Sucursal a Domicilio"
14. WHEN el Usuario selecciona "Sucursal a Sucursal", THE Sistema SHALL permitir al Usuario seleccionar la sucursal de origen y la sucursal de destino de una lista de sucursales disponibles en el sistema
15. WHEN el Usuario selecciona "Sucursal a Domicilio", THE Sistema SHALL solicitar la dirección de destino completa y calcular automáticamente la sucursal más cercana a ese domicilio como punto de distribución final
16. THE Sistema SHALL solicitar al Usuario la modalidad de envío: "Normal" o "Express"
17. WHEN el Usuario completa los datos del envío (tipo, origen, destino, peso, dimensiones y modalidad), THE Sistema SHALL calcular y mostrar automáticamente el costo estimado antes de confirmar el envío

### Requerimiento 16: Restricciones y Límites de Paquetes

**User Story:** Como usuario, quiero conocer las restricciones de envío, para que sepa qué puedo enviar y qué no.

#### Criterios de Aceptación

1. THE Sistema SHALL definir límites máximos de peso y dimensiones para cada servicio logístico
2. WHEN un Usuario ingresa dimensiones o peso que exceden los límites, THE Sistema SHALL mostrar un mensaje de error descriptivo
3. THE Sistema SHALL proporcionar una lista de contenidos prohibidos o restringidos
4. WHEN un Usuario selecciona "contenido peligroso", THE Sistema SHALL mostrar requisitos especiales y restricciones
5. THE Sistema SHALL validar que el peso y dimensiones ingresados sean valores positivos válidos

### Requerimiento 17: Seguro Opcional para Envíos

**User Story:** Como usuario, quiero contratar un seguro para mi envío, para que esté protegido en caso de pérdida o daño.

#### Criterios de Aceptación

1. WHEN un Usuario crea un envío, THE Sistema SHALL ofrecer la opción de contratar un Seguro
2. THE Sistema SHALL calcular el costo del Seguro basado en el valor declarado del paquete
3. WHEN un Usuario contrata un Seguro, THE Sistema SHALL incluir el costo del seguro en el total del envío
4. THE Sistema SHALL permitir al Usuario declarar el valor del contenido del paquete
5. THE Sistema SHALL almacenar la información del seguro asociada al envío


### Requerimiento 18: Gestión de Libreta de Direcciones

**User Story:** Como usuario, quiero guardar direcciones frecuentes, para que pueda crear envíos más rápidamente.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una libreta de direcciones en el panel de usuario
2. THE Sistema SHALL permitir al Usuario guardar direcciones con nombre descriptivo
3. THE Sistema SHALL permitir al Usuario marcar direcciones como favoritas
4. WHEN un Usuario crea un envío, THE Sistema SHALL permitir seleccionar direcciones guardadas
5. THE Sistema SHALL validar las direcciones antes de guardarlas en la libreta
6. THE Sistema SHALL permitir al Usuario editar y eliminar direcciones guardadas

### Requerimiento 19: Integración con Google Maps

**User Story:** Como usuario, quiero ver la ubicación de las sucursales en Google Maps, para que pueda visualizar dónde está mi paquete.

#### Criterios de Aceptación

1. WHEN un Usuario visualiza el seguimiento de un envío, THE Sistema SHALL mostrar la Sucursal actual del paquete
2. WHEN un Usuario selecciona una Sucursal en el seguimiento, THE Sistema SHALL abrir Google Maps con la ubicación de la Sucursal
3. THE Sistema SHALL mantener las coordenadas GPS de todas las sucursales actualizadas

### Requerimiento 20: Rastreo GPS en Tiempo Real de Repartidores

**User Story:** Como usuario, quiero ver la ubicación en tiempo real del repartidor, para que sepa cuándo llegará mi paquete.

#### Criterios de Aceptación

1. WHEN un envío tiene estado "En Entrega", THE Sistema SHALL mostrar la ubicación GPS actual del Repartidor asignado
2. THE Sistema SHALL actualizar la ubicación del Repartidor cada 30 segundos como máximo
3. THE Sistema SHALL mostrar la ubicación del Repartidor en un mapa interactivo
4. WHILE un envío está en estado "En Entrega", THE Sistema SHALL calcular y mostrar el tiempo estimado de llegada

### Requerimiento 21: Comunicación Directa Usuario-Repartidor

**User Story:** Como usuario, quiero comunicarme con el repartidor durante la entrega y en caso de reclamación, para que pueda coordinar detalles y resolver problemas con mis envíos.

#### Criterios de Aceptación

1. WHEN un envío entra en estado "En Entrega", THE Sistema SHALL abrir automáticamente un canal de chat entre el Usuario y el Repartidor asignado
2. WHEN un envío es marcado como "Entregado", THE Sistema SHALL cerrar automáticamente el canal de chat
3. THE Sistema SHALL notificar al Repartidor cuando el Usuario envía un mensaje
4. THE Sistema SHALL notificar al Usuario cuando el Repartidor responde
5. THE Sistema SHALL permitir al Usuario enviar instrucciones especiales de entrega a través del chat
6. WHEN un Usuario abre una Reclamación formal sobre un envío, THE Sistema SHALL reabrir el canal de chat asociado a ese envío
7. WHEN el chat es reabierto por una Reclamación, THE Agente_IA SHALL iniciar el proceso analizando el caso con el Usuario para recopilar su versión de los hechos
8. WHEN el Agente_IA ha recopilado la versión del Usuario, THE Agente_IA SHALL comunicarse con el Repartidor a través del mismo canal para obtener su versión de los hechos
9. WHEN el Agente_IA ha recopilado ambas versiones, THE Sistema SHALL presentar el análisis completo al Administrador para su resolución
10. THE Sistema SHALL conservar el historial completo del chat asociado al envío en todo momento
11. WHEN el Agente_IA se comunica con el Repartidor en el chat de Reclamación, THE Sistema SHALL otorgar al Repartidor un plazo máximo de 24 horas para responder; IF el Repartidor no responde dentro de las 24 horas, THEN THE Sistema SHALL notificar al Administrador y el análisis del Agente_IA se presentará con la versión del Repartidor marcada como "Sin respuesta"

### Requerimiento 22: Programación de Envíos Futuros

**User Story:** Como usuario, quiero programar envíos para fechas futuras, para que pueda planificar mis envíos con anticipación.

#### Criterios de Aceptación

1. WHEN un Usuario crea un envío, THE Sistema SHALL permitir seleccionar una fecha y hora futura de recolección
2. THE Sistema SHALL validar que la fecha de recolección sea al menos 24 horas en el futuro
3. THE Sistema SHALL validar que la fecha de recolección no sea mayor a 30 días a partir de la fecha actual
4. THE Sistema SHALL enviar un recordatorio al Usuario 24 horas antes de la recolección programada
5. THE Sistema SHALL permitir al Usuario modificar o cancelar envíos programados antes de la fecha de recolección
6. WHEN llega la fecha programada, THE Sistema SHALL procesar el envío automáticamente

### Requerimiento 23: Panel de Administración - Búsqueda de Pedidos

**User Story:** Como administrador, quiero buscar cualquier pedido en el sistema, para que pueda localizar y gestionar envíos.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una función de búsqueda de pedidos por Código_de_Seguimiento, usuario o destino
2. THE Sistema SHALL permitir al Administrador ver todos los envíos realizados desde la creación del sistema
3. THE Sistema SHALL mostrar resultados de búsqueda en tiempo real mientras el Administrador escribe
4. THE Sistema SHALL permitir al Administrador filtrar envíos por estado, fecha o sucursal

### Requerimiento 24: Panel de Administración - Modificación de Envíos

**User Story:** Como administrador, quiero modificar envíos existentes, para que pueda corregir errores o actualizar información.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador modificar el destino de un envío
2. THE Sistema SHALL permitir al Administrador modificar el peso y dimensiones de un envío
3. THE Sistema SHALL permitir al Administrador modificar los detalles de un envío
4. THE Sistema SHALL permitir al Administrador cambiar el estado de un envío
5. WHEN un Administrador modifica un envío, THE Sistema SHALL registrar la modificación con fecha, hora y usuario administrador

### Requerimiento 25: Panel de Administración - Gestión de Cuentas

**User Story:** Como administrador, quiero gestionar cuentas de usuario, para que pueda administrar el acceso y datos del sistema.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador ver todas las cuentas de usuario registradas
2. THE Sistema SHALL permitir al Administrador acceder a cualquier cuenta de usuario
3. THE Sistema SHALL permitir al Administrador modificar el Saldo_en_Cuenta de cualquier usuario
4. THE Sistema SHALL permitir al Administrador modificar información de perfil de cualquier usuario
5. THE Sistema SHALL permitir al Administrador desactivar o activar cuentas de usuario
6. WHEN un Administrador modifica una cuenta, THE Sistema SHALL registrar la modificación con fecha, hora y usuario administrador

### Requerimiento 26: Gestión de Servicios Logísticos por Administrador

**User Story:** Como administrador, quiero crear, editar y desactivar servicios logísticos, para que pueda mantener actualizada la oferta de servicios del sistema.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador crear nuevos servicios logísticos con nombre, descripción, tiempos de entrega estimados y tarifas base
2. THE Sistema SHALL permitir al Administrador modificar la información de servicios logísticos existentes
3. THE Sistema SHALL permitir al Administrador desactivar servicios logísticos sin eliminarlos del historial
4. WHEN un servicio logístico es desactivado, THE Sistema SHALL ocultarlo de las opciones disponibles para nuevos envíos
5. THE Sistema SHALL validar que cada servicio logístico tenga nombre único antes de crearlo
6. WHEN un Administrador crea o modifica un servicio logístico, THE Sistema SHALL registrar la acción en el Log_de_Auditoría

### Requerimiento 27: Gestión de Tarifas Dinámicas

**User Story:** Como administrador, quiero gestionar tarifas de servicios, para que pueda ajustar precios según las necesidades del negocio.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador crear nuevas Tarifas con nombre, descripción y estructura de precios
2. THE Sistema SHALL permitir al Administrador modificar Tarifas existentes
3. THE Sistema SHALL permitir definir tarifas basadas en peso, dimensiones, distancia y tipo de contenido
4. THE Sistema SHALL permitir al Administrador definir cargos adicionales por servicio urgente, entrega en fin de semana o zonas remotas
5. WHEN un Administrador modifica una Tarifa, THE Sistema SHALL registrar el cambio en un historial de tarifas
6. THE Sistema SHALL aplicar las tarifas vigentes al momento de crear el envío
7. THE Sistema SHALL mantener un historial de todas las versiones de tarifas con fechas de vigencia
8. THE Sistema SHALL calcular el costo de envío "Sucursal a Sucursal" basándose en la distancia en línea recta entre las coordenadas GPS de las sucursales de origen y destino (fórmula Haversine), el peso y las dimensiones del paquete
9. THE Sistema SHALL calcular el costo de envío "Sucursal a Domicilio" sumando: el tramo entre sucursal de origen y sucursal más cercana al domicilio (distancia Haversine entre sucursales), más el tramo de Última_Milla desde esa sucursal al domicilio del destinatario
10. THE Sistema SHALL aplicar un recargo del 40% sobre la tarifa base para envíos en Modalidad_Express
11. THE Sistema SHALL calcular tarifas usando la siguiente estructura base por tramo de distancia entre sucursales y peso: hasta 100 km: $500 base + $80 por kg adicional sobre 1 kg; de 101 a 500 km: $1.200 base + $150 por kg adicional sobre 1 kg; de 501 a 1.000 km: $2.500 base + $250 por kg adicional sobre 1 kg; más de 1.000 km: $4.500 base + $400 por kg adicional sobre 1 kg
12. THE Sistema SHALL aplicar un cargo adicional de Última_Milla para envíos Envío_S2D de $1.500 base + $200 por kg adicional sobre 1 kg, independientemente de la distancia al domicilio
13. THE Sistema SHALL aplicar un factor de Peso_Volumétrico: WHEN (largo × ancho × alto en cm) / 5.000 supera el peso real en kg, THE Sistema SHALL usar el Peso_Volumétrico para el cálculo
14. THE Sistema SHALL garantizar que el costo total de un envío de hasta 10 kg entre Buenos Aires y Jujuy (distancia mayor a 1.000 km) no supere los $60.000 pesos argentinos en Modalidad_Normal
15. THE Sistema SHALL garantizar que el costo de un envío de hasta 3 kg dentro de la misma provincia en modalidad Envío_S2D no supere los $8.000 pesos argentinos en Modalidad_Normal
16. THE Sistema SHALL permitir al Administrador ajustar los valores base y por kg de cada tramo de distancia desde el panel de administración


### Requerimiento 28: Códigos Promocionales y Descuentos

**User Story:** Como usuario, quiero aplicar códigos promocionales, para que pueda obtener descuentos en mis envíos.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador crear Códigos_Promocionales con porcentaje o monto fijo de descuento
2. THE Sistema SHALL permitir al Administrador definir fecha de inicio y expiración para códigos promocionales
3. THE Sistema SHALL permitir al Administrador limitar el número de usos por código promocional
4. WHEN un Usuario crea un envío, THE Sistema SHALL proporcionar un campo para ingresar un Código_Promocional
5. WHEN un Usuario ingresa un Código_Promocional válido, THE Sistema SHALL aplicar el descuento al costo total
6. IF un Código_Promocional es inválido o expirado, THEN THE Sistema SHALL mostrar un mensaje de error
7. THE Sistema SHALL registrar el uso de cada código promocional con fecha y usuario

### Requerimiento 29: Descuentos por Volumen y Clientes Frecuentes

**User Story:** Como usuario frecuente, quiero recibir descuentos por volumen, para que sea más económico enviar múltiples paquetes.

#### Criterios de Aceptación

1. THE Sistema SHALL calcular automáticamente descuentos basados en el número de envíos del Usuario en el último mes
2. THE Sistema SHALL mostrar al Usuario su nivel de descuento actual en el panel
3. THE Sistema SHALL aplicar descuentos progresivos: 5% para 10+ envíos, 10% para 50+ envíos, 15% para 100+ envíos mensuales
4. WHEN un Usuario alcanza un nuevo nivel de descuento, THE Sistema SHALL notificarlo por correo electrónico
5. THE Sistema SHALL permitir al Administrador ajustar los niveles y porcentajes de descuento

### Requerimiento 30: Dashboard de Métricas para Administradores

**User Story:** Como administrador, quiero ver métricas del sistema, para que pueda monitorear el desempeño del negocio.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un Dashboard con métricas clave en el panel de administración
2. THE Sistema SHALL mostrar el número total de envíos por día, semana y mes
3. THE Sistema SHALL mostrar ingresos totales por día, semana y mes
4. THE Sistema SHALL mostrar tiempos promedio de entrega por servicio
5. THE Sistema SHALL mostrar el número de usuarios activos y nuevos registros
6. THE Sistema SHALL mostrar el número de incidencias reportadas y su estado
7. THE Sistema SHALL permitir al Administrador filtrar métricas por rango de fechas
8. THE Sistema SHALL actualizar las métricas en tiempo real

### Requerimiento 31: Reportes de Desempeño de Repartidores

**User Story:** Como administrador, quiero ver reportes de desempeño de repartidores, para que pueda evaluar su eficiencia.

#### Criterios de Aceptación

1. THE Sistema SHALL generar reportes de desempeño por Repartidor con número de entregas completadas
2. THE Sistema SHALL calcular el tiempo promedio de entrega por Repartidor
3. THE Sistema SHALL mostrar el porcentaje de entregas a tiempo por Repartidor
4. THE Sistema SHALL mostrar el número de incidencias reportadas por Repartidor
5. THE Sistema SHALL permitir al Administrador comparar el desempeño entre repartidores
6. THE Sistema SHALL permitir al Administrador exportar reportes de desempeño

### Requerimiento 32: Reportes Financieros

**User Story:** Como administrador, quiero generar reportes financieros, para que pueda analizar los ingresos del negocio.

#### Criterios de Aceptación

1. THE Sistema SHALL generar reportes de ingresos por servicio logístico
2. THE Sistema SHALL generar reportes de ingresos por sucursal
3. THE Sistema SHALL mostrar el desglose de ingresos por método de pago
4. THE Sistema SHALL calcular el ingreso promedio por envío
5. THE Sistema SHALL permitir al Administrador filtrar reportes por rango de fechas
6. THE Sistema SHALL permitir al Administrador exportar reportes financieros en formato PDF y Excel

### Requerimiento 33: Exportación de Datos

**User Story:** Como administrador, quiero exportar datos del sistema, para que pueda realizar análisis externos.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador exportar listados de envíos en formato CSV y Excel
2. THE Sistema SHALL permitir al Administrador exportar listados de usuarios en formato CSV y Excel
3. THE Sistema SHALL permitir al Administrador exportar reportes financieros en formato PDF y Excel
4. THE Sistema SHALL incluir filtros de fecha y estado al exportar datos
5. THE Sistema SHALL registrar todas las exportaciones en el Log_de_Auditoría

### Requerimiento 34: Notificaciones por Correo Electrónico

**User Story:** Como usuario, quiero recibir notificaciones por correo electrónico, para que esté informado sobre mis envíos.

#### Criterios de Aceptación

1. WHEN un envío es creado, THE Sistema SHALL enviar un correo electrónico con el Código_de_Seguimiento al Usuario
2. WHEN un envío cambia de estado, THE Sistema SHALL enviar un correo electrónico de notificación al Usuario
3. WHEN un envío está en estado "En Entrega", THE Sistema SHALL enviar un correo electrónico al Usuario
4. WHEN un envío es entregado, THE Sistema SHALL enviar un correo electrónico de confirmación al Usuario
5. THE Sistema SHALL utilizar el correo electrónico registrado en la cuenta del Usuario para todas las notificaciones
6. THE Sistema SHALL permitir al Usuario configurar desde su perfil qué tipos de notificaciones por correo electrónico desea recibir, activando o desactivando cada tipo de evento de forma individual
7. WHEN un envío cambia a estado "Entrega_Fallida", THE Sistema SHALL enviar un correo electrónico al Usuario informando el intento fallido, el número de intento (1°, 2° o 3°), el motivo registrado por el Repartidor y que se coordinará un nuevo intento vía chat
8. WHEN un envío cambia a estado "Devuelto_a_Sucursal", THE Sistema SHALL enviar un correo electrónico al Usuario con la información completa de la sucursal (nombre, dirección, horario) y las opciones disponibles para resolver la situación

### Requerimiento 35: Estimación de Tiempo de Llegada

**User Story:** Como usuario, quiero saber cuándo llegará mi paquete, para que pueda planificar la recepción.

#### Criterios de Aceptación

1. WHEN un Usuario crea un envío, THE Sistema SHALL calcular y mostrar una fecha estimada de entrega
2. WHEN un Usuario visualiza el seguimiento, THE Sistema SHALL mostrar la fecha estimada de entrega actualizada
3. WHILE un envío está en estado "En Entrega", THE Sistema SHALL mostrar el tiempo estimado de llegada en minutos
4. THE Sistema SHALL actualizar la estimación basándose en la ubicación GPS del Repartidor y el destino

### Requerimiento 36: Gestión de Sucursales

**User Story:** Como administrador, quiero gestionar las sucursales del sistema, para que pueda mantener actualizada la red logística.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador crear nuevas sucursales con nombre, dirección y coordenadas GPS
2. THE Sistema SHALL permitir al Administrador modificar información de sucursales existentes
3. THE Sistema SHALL permitir al Administrador desactivar sucursales
4. THE Sistema SHALL validar que las coordenadas GPS sean válidas al crear o modificar sucursales
5. WHEN un Administrador modifica una Sucursal, THE Sistema SHALL registrar la modificación con fecha y hora

### Requerimiento 37: Gestión de Repartidores - Registro y Autenticación

**User Story:** Como administrador, quiero gestionar repartidores en el sistema, para que puedan acceder y realizar entregas.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador registrar nuevos repartidores con nombre, correo electrónico, teléfono y credenciales
2. THE Sistema SHALL asignar un identificador único a cada Repartidor
3. WHEN un Repartidor inicia sesión, THE Sistema SHALL autenticarlo y redirigirlo al panel de repartidor
4. THE Sistema SHALL permitir al Administrador desactivar o activar cuentas de repartidores
5. THE Sistema SHALL validar que el correo electrónico del Repartidor sea único en el sistema

### Requerimiento 38: Disponibilidad y Horarios de Repartidores

**User Story:** Como repartidor, quiero indicar mi disponibilidad y turno de trabajo, para que el administrador pueda asignarme envíos cuando estoy activo.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una opción en el panel del Repartidor para indicar su Disponibilidad (disponible o no disponible)
2. THE Sistema SHALL permitir al Repartidor registrar su Turno de trabajo con hora de inicio y hora de fin
3. WHEN un Repartidor marca su Disponibilidad como activa, THE Sistema SHALL reflejar el cambio en tiempo real para el Administrador
4. THE Sistema SHALL mostrar al Administrador una lista de repartidores con Disponibilidad activa al momento de asignar envíos
5. WHEN un Repartidor finaliza su Turno, THE Sistema SHALL cambiar automáticamente su Disponibilidad a no disponible
6. THE Sistema SHALL registrar el historial de turnos y disponibilidad de cada Repartidor


### Requerimiento 39: Panel de Repartidor - Visualización de Envíos Asignados

**User Story:** Como repartidor, quiero ver los envíos asignados a mí, para que pueda planificar mis entregas.

#### Criterios de Aceptación

1. WHEN un Repartidor accede a su panel, THE Sistema SHALL mostrar todos los envíos asignados a ese Repartidor
2. FOR EACH envío asignado, THE Sistema SHALL mostrar Código_de_Seguimiento, dirección de destino, estado y prioridad
3. THE Sistema SHALL ordenar los envíos por prioridad y proximidad geográfica
4. THE Sistema SHALL permitir al Repartidor ver detalles completos de cada envío asignado

### Requerimiento 40: Optimización de Rutas para Repartidores

**User Story:** Como repartidor, quiero que el sistema optimice mi ruta, para que pueda realizar entregas de manera eficiente.

#### Criterios de Aceptación

1. WHEN un Repartidor tiene múltiples envíos asignados, THE Sistema SHALL calcular una Ruta_Optimizada
2. THE Sistema SHALL considerar la ubicación actual del Repartidor, destinos y prioridades al calcular la ruta
3. THE Sistema SHALL mostrar la ruta optimizada en un mapa con el orden sugerido de entregas
4. THE Sistema SHALL proporcionar navegación integrada para cada punto de entrega
5. THE Sistema SHALL recalcular la ruta automáticamente cuando se asignan nuevos envíos

### Requerimiento 41: Asignación de Envíos a Repartidores

**User Story:** Como administrador, quiero asignar envíos a repartidores, para que los paquetes sean entregados.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Administrador asignar un envío a un Repartidor específico
2. WHEN un envío es asignado a un Repartidor, THE Sistema SHALL cambiar el estado del envío a "Asignado"
3. WHEN un envío es asignado, THE Sistema SHALL notificar al Repartidor por correo electrónico
4. THE Sistema SHALL permitir al Administrador reasignar envíos a diferentes repartidores
5. THE Sistema SHALL registrar el historial de asignaciones con fecha, hora y administrador responsable
6. THE Sistema SHALL sugerir automáticamente el Repartidor con Disponibilidad activa más cercano geográficamente al origen del envío al momento de la asignación

### Requerimiento 42: Actualización de Estado de Entrega por Repartidor

**User Story:** Como repartidor, quiero actualizar el estado de mis entregas, para que el sistema refleje el progreso en tiempo real.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Repartidor cambiar el estado de un envío asignado a "En Camino"
2. THE Sistema SHALL permitir al Repartidor cambiar el estado de un envío a "En Entrega"
3. THE Sistema SHALL permitir al Repartidor marcar un envío como "Entregado"
4. WHEN un Repartidor actualiza el estado de un envío, THE Sistema SHALL registrar la actualización con fecha y hora
5. WHEN un Repartidor actualiza el estado, THE Sistema SHALL notificar al Usuario por correo electrónico
6. THE Sistema SHALL permitir al Repartidor marcar un envío como "Entrega_Fallida" únicamente si la geolocalización del dispositivo del Repartidor está a menos de 200 metros de la ubicación de entrega registrada
7. IF el Repartidor intenta marcar un envío como "Entrega_Fallida" y su ubicación está a más de 200 metros de la dirección de entrega, THEN THE Sistema SHALL rechazar la acción y mostrar un mensaje indicando que debe estar cerca del domicilio para registrar la entrega fallida
8. WHEN el Repartidor marca un envío como "Entrega_Fallida" y está dentro del rango de 200 metros, THE Sistema SHALL solicitar obligatoriamente una foto del domicilio o de la calle donde está marcada la entrega en el mapa antes de continuar
9. WHEN el Repartidor adjunta la foto requerida, THE Sistema SHALL mostrar una lista de motivos de no entrega para que el Repartidor seleccione uno: "No hay nadie en el domicilio", "Sin timbre o intercomunicador", "Domicilio no identificado", "No existe la calle o numeración", "Destinatario rechaza la entrega", "Destinatario fallecido", "Destinatario desconoce la entrega", "Menor de edad sin adulto responsable" u "Otro motivo"
10. IF el Repartidor no puede adjuntar la foto requerida o no está dentro del rango de 200 metros, THEN THE Sistema SHALL registrar el intento como "No Entregado sin justificación" sin motivo específico
11. WHEN un intento es registrado como "No Entregado sin justificación", THE Sistema SHALL contabilizarlo como uno de los 3 intentos de entrega permitidos para ese envío

### Requerimiento 43: Compartir Ubicación GPS del Repartidor

**User Story:** Como repartidor, quiero compartir mi ubicación GPS, para que los usuarios puedan rastrear sus paquetes en tiempo real.

#### Criterios de Aceptación

1. WHEN un Repartidor inicia sesión en su panel, THE Sistema SHALL solicitar permiso para acceder a su ubicación GPS
2. WHILE un Repartidor tiene envíos en estado "En Entrega", THE Sistema SHALL transmitir su ubicación GPS cada 30 segundos como máximo
3. THE Sistema SHALL almacenar la última ubicación GPS conocida del Repartidor
4. THE Sistema SHALL permitir al Repartidor pausar temporalmente el compartir ubicación
5. WHEN un Repartidor cierra sesión, THE Sistema SHALL detener la transmisión de ubicación GPS

### Requerimiento 44: Confirmación de Entrega con Evidencias

**User Story:** Como repartidor, quiero confirmar entregas con evidencias, para que quede registro completo de la entrega.

#### Criterios de Aceptación

1. WHEN un Repartidor marca un envío como "Entregado", THE Sistema SHALL solicitar al menos UNA de las siguientes evidencias: firma digital, código de verificación o foto
2. THE Sistema SHALL proporcionar un área táctil para capturar firma digital del destinatario
3. THE Sistema SHALL solicitar el código de verificación de 6 dígitos proporcionado al Usuario
4. THE Sistema SHALL permitir al Repartidor tomar una foto de evidencia usando la cámara del dispositivo
5. THE Sistema SHALL solicitar el nombre completo de quien recibe el paquete
6. THE Sistema SHALL permitir al Repartidor especificar la relación del receptor con el destinatario
7. THE Sistema SHALL almacenar todas las evidencias asociadas al envío
8. THE Sistema SHALL registrar la fecha, hora y ubicación GPS de la confirmación de entrega
9. THE Sistema SHALL permitir al Usuario visualizar todas las evidencias en el seguimiento del envío
10. WHEN el código de verificación ingresado es correcto, THE Sistema SHALL permitir completar la entrega
11. IF el código de verificación es incorrecto, THEN THE Sistema SHALL rechazar la confirmación y registrar el intento fallido

### Requerimiento 45: Gestión de Métodos de Pago

**User Story:** Como usuario, quiero gestionar mis métodos de pago, para que pueda agregar fondos fácilmente a mi cuenta.

#### Criterios de Aceptación

1. THE Sistema SHALL integrarse con al menos una pasarela de pago segura
2. WHEN un Usuario selecciona agregar fondos, THE Sistema SHALL mostrar opciones de pago disponibles
3. THE Sistema SHALL procesar pagos con tarjeta de crédito de forma segura
4. THE Sistema SHALL procesar pagos con tarjeta de débito de forma segura
5. THE Sistema SHALL aceptar pagos con tarjetas Visa, Mastercard y American Express
6. WHERE disponible, THE Sistema SHALL aceptar pagos mediante transferencia bancaria
7. WHEN un pago es exitoso, THE Sistema SHALL actualizar el Saldo_en_Cuenta del Usuario inmediatamente
8. IF un pago falla, THEN THE Sistema SHALL mostrar un mensaje de error descriptivo y no modificar el saldo
9. THE Sistema SHALL permitir al Usuario guardar métodos de pago para uso futuro
10. THE Sistema SHALL encriptar y proteger la información de tarjetas guardadas

### Requerimiento 46: Generación de Recibos y Comprobantes

**User Story:** Como usuario, quiero recibir un comprobante de pago, para que tenga registro de mis transacciones.

#### Criterios de Aceptación

1. WHEN un Usuario realiza un pago exitoso, THE Sistema SHALL generar un recibo digital
2. THE Sistema SHALL enviar el recibo al correo electrónico del Usuario
3. FOR EACH recibo, THE Sistema SHALL incluir fecha, monto, método de pago y número de transacción
4. THE Sistema SHALL permitir al Usuario descargar recibos desde su estado de cuenta
5. THE Sistema SHALL almacenar todos los recibos en el historial del Usuario

### Requerimiento 47: Gestión de Cancelaciones y Reembolsos

**User Story:** Como usuario, quiero cancelar envíos y recibir reembolsos, para que pueda recuperar mi dinero si cambio de opinión.

#### Criterios de Aceptación

1. WHILE un envío tiene estado "Pendiente" o "En Sucursal", THE Sistema SHALL permitir al Usuario cancelar el envío
2. WHEN un envío tiene estado "Asignado", "En Camino" o "En Entrega", THE Sistema SHALL ocultar el botón de cancelación
3. WHEN un envío tiene estado "Entregado" o "Cancelado", THE Sistema SHALL ocultar el botón de cancelación
4. WHEN un Usuario cancela un envío, THE Sistema SHALL cambiar el estado del envío a "Cancelado"
5. WHEN un envío es cancelado antes de salir de sucursal, THE Sistema SHALL reembolsar el costo completo al Saldo_en_Cuenta del Usuario
6. WHEN un envío es cancelado, THE Sistema SHALL enviar un correo electrónico de confirmación al Usuario
7. THE Sistema SHALL registrar la cancelación con fecha, hora y motivo
8. THE Sistema SHALL mostrar la política de reembolsos en una sección accesible desde el panel de usuario
9. THE Sistema SHALL especificar que los reembolsos completos aplican para envíos cancelados antes de salir de sucursal
10. THE Sistema SHALL especificar que no hay reembolsos para envíos en estado "En Camino" o posterior
11. THE Sistema SHALL especificar el tiempo de procesamiento de reembolsos
12. THE Sistema SHALL permitir al Usuario solicitar reembolso por envíos no entregados después de 30 días
13. THE Sistema SHALL mostrar un mensaje explicativo cuando la cancelación no está disponible


### Requerimiento 48: Gestión de Incidencias

**User Story:** Como usuario, quiero reportar incidencias con mis envíos, para que el sistema pueda investigar y resolver problemas.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un botón "Reportar Problema" en cada envío
2. WHEN un Usuario reporta un problema, THE Sistema SHALL solicitar el tipo de incidencia (paquete perdido, dañado, entrega incorrecta, retraso)
3. THE Sistema SHALL solicitar una descripción detallada del problema
4. WHEN un Usuario reporta una Incidencia, THE Sistema SHALL crear automáticamente un ticket de soporte asociado al envío
5. THE Sistema SHALL asignar un número único de incidencia
6. THE Sistema SHALL notificar al Administrador sobre la incidencia reportada inmediatamente
7. THE Sistema SHALL marcar el envío con una bandera de "Incidencia Reportada"
8. THE Sistema SHALL permitir al Usuario adjuntar fotos como evidencia de la incidencia
9. THE Sistema SHALL mostrar el estado de la incidencia (En Revisión, En Investigación, Resuelta, Cerrada)

### Requerimiento 49: Proceso de Reclamaciones Formales

**User Story:** Como usuario, quiero presentar una reclamación formal, para que pueda recibir compensación por problemas graves con mis envíos.

#### Criterios de Aceptación

1. WHEN una Incidencia no se resuelve satisfactoriamente, THE Sistema SHALL permitir al Usuario escalar a una Reclamación formal
2. THE Sistema SHALL proporcionar un formulario de reclamación con campos para descripción, monto reclamado y evidencias
3. WHEN un Usuario presenta una Reclamación, THE Sistema SHALL asignar un número único de reclamación
4. THE Sistema SHALL notificar al Administrador sobre la reclamación inmediatamente
5. THE Sistema SHALL permitir al Administrador revisar y responder reclamaciones
6. THE Sistema SHALL permitir al Administrador aprobar compensaciones monetarias
7. WHEN una compensación es aprobada, THE Sistema SHALL agregar el monto al Saldo_en_Cuenta del Usuario
8. THE Sistema SHALL registrar todas las reclamaciones y sus resoluciones en el Log_de_Auditoría
9. THE Sistema SHALL notificar al Usuario por correo electrónico sobre el estado de su reclamación

### Requerimiento 50: Escalamiento de Problemas Críticos

**User Story:** Como administrador, quiero que los problemas críticos se escalen automáticamente, para que pueda atenderlos con prioridad.

#### Criterios de Aceptación

1. WHEN una Incidencia de tipo "paquete perdido" es reportada, THE Sistema SHALL marcarla como crítica automáticamente
2. WHEN un envío tiene más de 48 horas de retraso respecto a la fecha estimada, THE Sistema SHALL crear una incidencia automática
3. WHEN se reportan 3 o más incidencias para el mismo Repartidor en un día, THE Sistema SHALL notificar al Administrador
4. THE Sistema SHALL enviar notificaciones por correo electrónico al Administrador para incidencias críticas
5. THE Sistema SHALL mostrar incidencias críticas en una sección destacada del Dashboard
6. WHEN un envío cambia automáticamente a estado "Devuelto_a_Sucursal" tras el tercer intento fallido, THE Sistema SHALL crear automáticamente una incidencia crítica y notificar al Administrador con los detalles del envío, la sucursal de destino y el historial de los 3 intentos fallidos

### Requerimiento 51: Acceso Público sin Registro

**User Story:** Como visitante, quiero acceder a información básica sin registrarme, para que pueda evaluar el servicio antes de crear una cuenta.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una herramienta de cotización accesible sin autenticación
2. WHEN un visitante ingresa origen, destino y peso, THE Sistema SHALL calcular y mostrar el costo estimado
3. THE Sistema SHALL mostrar los tiempos de entrega estimados para cada servicio disponible
4. THE Sistema SHALL permitir a visitantes no autenticados acceder a la sección de servicios logísticos
5. THE Sistema SHALL mostrar información completa de cada servicio sin requerir autenticación
6. THE Sistema SHALL mostrar tarifas base y tiempos de entrega para cada servicio
7. THE Sistema SHALL mostrar un mensaje indicando que se requiere registro para crear el envío
8. THE Sistema SHALL proporcionar un enlace directo al formulario de registro desde la cotización y servicios

### Requerimiento 52: Sistema de Tickets de Soporte

**User Story:** Como usuario, quiero gestionar tickets de soporte, para que pueda reportar problemas y recibir ayuda.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una sección de soporte en el panel de usuario
2. THE Sistema SHALL permitir al Usuario crear tickets de soporte con asunto y descripción
3. WHEN un Usuario crea un ticket, THE Sistema SHALL asignar un número de ticket único
4. THE Sistema SHALL permitir al Usuario adjuntar capturas de pantalla al ticket
5. THE Sistema SHALL enviar un correo electrónico de confirmación con el número de ticket al Usuario
6. THE Sistema SHALL mostrar todos los tickets del Usuario con su estado actual (Abierto, En Proceso, Resuelto, Cerrado)
7. FOR EACH ticket, THE Sistema SHALL mostrar número, asunto, fecha de creación y estado
8. THE Sistema SHALL permitir al Usuario ver el historial completo de respuestas del ticket
9. WHEN un Administrador responde un ticket, THE Sistema SHALL notificar al Usuario por correo electrónico
10. THE Sistema SHALL permitir al Usuario cerrar tickets resueltos
11. THE Sistema SHALL permitir al Administrador asignar prioridades a los tickets
12. THE Sistema SHALL permitir al Administrador filtrar tickets por estado, prioridad y fecha

### Requerimiento 53: Agente IA de Atención al Cliente

**User Story:** Como usuario, quiero interactuar con un agente conversacional inteligente, para que pueda resolver mis dudas, consultar información de mis envíos y realizar acciones directamente desde el chat sin necesidad de navegar por el sistema.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un Agente_IA accesible desde el panel de usuario
2. THE Agente_IA SHALL operar únicamente en idioma español en esta versión del sistema
3. THE Agente_IA SHALL responder a cada mensaje del Usuario en un tiempo máximo de 90 segundos
4. THE Agente_IA SHALL responder preguntas frecuentes sobre el sistema en lenguaje natural y amigable, utilizando el contenido del FAQ como base de conocimiento
5. THE Agente_IA SHALL responder consultas específicas del Usuario sobre sus propios envíos, estados, tarifas, políticas, procesos y cualquier situación relacionada con el sistema, más allá de las respuestas genéricas del FAQ
6. WHEN un Usuario proporciona un Código_de_Seguimiento al Agente_IA, THE Agente_IA SHALL consultar el estado actual del envío en tiempo real y mostrarlo al Usuario
7. THE Agente_IA SHALL permitir al Usuario consultar su Saldo_en_Cuenta directamente desde la conversación
8. THE Agente_IA SHALL permitir al Usuario reportar una Incidencia o problema con un envío desde el chat
9. THE Agente_IA SHALL permitir al Usuario iniciar una Reclamación formal desde la conversación
10. THE Agente_IA SHALL permitir al Usuario solicitar la cancelación de un envío desde el chat, validando que el estado del envío permita la cancelación
11. THE Agente_IA SHALL permitir al Usuario consultar su historial de pedidos desde la conversación
12. THE Agente_IA SHALL proporcionar información sobre la política de reembolsos cuando el Usuario lo solicite
13. WHEN el Agente_IA no puede resolver el problema del Usuario, THE Agente_IA SHALL informar al Usuario que un agente humano lo contactará en breve
14. IF no hay agentes humanos disponibles en el momento en que el Agente_IA detecta que se requiere atención humana, THEN THE Agente_IA SHALL igualmente informar al Usuario que un agente humano lo contactará en breve y dejar el caso como ticket abierto en espera de que un agente humano esté disponible
15. THE Agente_IA SHALL mantener el contexto de la conversación durante toda la sesión del chat
16. THE Sistema SHALL almacenar el historial completo de conversaciones con el Agente_IA asociado a la cuenta del Usuario
17. WHEN un Usuario finaliza una conversación con el Agente_IA, THE Sistema SHALL solicitar al Usuario una calificación de la atención recibida
18. THE Sistema SHALL permitir al Administrador configurar las respuestas pre-programadas y el comportamiento del Agente_IA
19. THE Sistema SHALL permitir al Administrador revisar el historial de conversaciones del Agente_IA
20. WHEN un Usuario consulta al Agente_IA sobre un envío en estado "Devuelto_a_Sucursal", THE Agente_IA SHALL informar automáticamente al Usuario: el nombre y dirección de la sucursal donde se encuentra el paquete, el horario de atención para retiro, y las dos opciones disponibles (retiro personal o pago de nuevo envío), indicando que la gestión final debe realizarse con personal humano vía teléfono

### Requerimiento 54: Sección de Preguntas Frecuentes (FAQ)

**User Story:** Como usuario, quiero consultar preguntas frecuentes, para que pueda resolver dudas comunes sin contactar soporte.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar una sección de FAQ accesible sin autenticación
2. THE Sistema SHALL organizar las preguntas por categorías (registro, envíos, pagos, seguimiento, cancelaciones)
3. THE Sistema SHALL incluir preguntas sobre registro, envíos, pagos, seguimiento y cancelaciones
4. THE Sistema SHALL proporcionar un buscador de preguntas frecuentes
5. THE Sistema SHALL permitir al Administrador agregar, modificar y eliminar preguntas frecuentes

### Requerimiento 55: Notificaciones Push en Navegador

**User Story:** Como usuario, quiero recibir notificaciones push en mi navegador, para que esté informado en tiempo real sobre mis envíos.

#### Criterios de Aceptación

1. WHEN un Usuario inicia sesión, THE Sistema SHALL solicitar permiso para enviar notificaciones push
2. WHEN un envío cambia de estado, THE Sistema SHALL enviar una notificación push al Usuario
3. WHEN un envío está próximo a ser entregado, THE Sistema SHALL enviar una notificación push al Usuario
4. THE Sistema SHALL permitir al Usuario activar o desactivar notificaciones push desde su perfil
5. THE Sistema SHALL respetar la configuración de notificaciones del navegador del Usuario
6. WHEN un envío cambia a estado "Entrega_Fallida", THE Sistema SHALL enviar una notificación push al Usuario
7. WHEN un envío cambia a estado "Devuelto_a_Sucursal", THE Sistema SHALL enviar una notificación push al Usuario

### Requerimiento 56: Notificaciones SMS para Actualizaciones Críticas

**User Story:** Como usuario, quiero recibir SMS para actualizaciones críticas, para que esté informado incluso sin acceso a internet.

#### Criterios de Aceptación

1. WHERE el Usuario proporciona un número de teléfono, THE Sistema SHALL enviar SMS para actualizaciones críticas
2. WHEN un envío está en estado "En Entrega", THE Sistema SHALL enviar un SMS al Usuario
3. WHEN un envío es entregado, THE Sistema SHALL enviar un SMS de confirmación al Usuario
4. WHEN hay un problema con un envío, THE Sistema SHALL enviar un SMS de alerta al Usuario
5. THE Sistema SHALL permitir al Usuario activar o desactivar notificaciones SMS desde su perfil
6. THE Sistema SHALL validar que el número de teléfono sea válido antes de enviar SMS
7. WHEN un envío cambia a estado "Entrega_Fallida", THE Sistema SHALL enviar un SMS al Usuario informando el intento fallido
8. WHEN un envío cambia a estado "Devuelto_a_Sucursal", THE Sistema SHALL enviar un SMS al Usuario con la información de la sucursal

### Requerimiento 57: Centro de Notificaciones In-App

**User Story:** Como usuario, quiero acceder a un centro de notificaciones dentro del sistema, para que pueda revisar el historial completo de mis alertas y mensajes en cualquier momento.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar un Centro_de_Notificaciones accesible desde el panel de usuario
2. THE Centro_de_Notificaciones SHALL mostrar todas las alertas históricas del Usuario incluyendo cambios de estado de envíos, confirmaciones de pago, mensajes del sistema y respuestas a tickets
3. FOR EACH notificación, THE Sistema SHALL mostrar fecha, hora, tipo de alerta y descripción del evento
4. THE Sistema SHALL ordenar las notificaciones de forma cronológica descendente por defecto
5. THE Sistema SHALL permitir al Usuario marcar notificaciones individuales como leídas
6. THE Sistema SHALL permitir al Usuario marcar todas las notificaciones como leídas en una sola acción
7. THE Sistema SHALL mostrar un indicador visual con el número de notificaciones no leídas en el panel de usuario
8. WHEN el Sistema genera una nueva notificación para el Usuario, THE Sistema SHALL agregarla al Centro_de_Notificaciones de forma inmediata

### Requerimiento 58: Gestión de Reintentos de Entrega

**User Story:** Como usuario y repartidor, quiero que el sistema gestione los reintentos de entrega de forma estructurada, para que los paquetes tengan hasta 3 oportunidades de ser entregados antes de ser devueltos a sucursal.

#### Criterios de Aceptación

1. WHEN un envío queda en estado "Entrega_Fallida", THE Sistema SHALL notificar al Usuario del intento fallido e informarle que el Repartidor coordinará un nuevo intento de entrega
2. WHEN un envío queda en estado "Entrega_Fallida", THE Sistema SHALL reabrir el canal de chat entre el Usuario y el Repartidor para coordinar el día y hora del siguiente Reintento
3. THE Sistema SHALL permitir un máximo de 3 intentos de entrega en total para cada envío
4. WHEN el Repartidor realiza un segundo o tercer intento y el destinatario no atiende, THE Sistema SHALL permitir al Repartidor marcar nuevamente el envío como "Entrega_Fallida" siguiendo el proceso de geolocalización, foto y motivo definido en el Requerimiento 42
5. WHILE el Usuario no responde los mensajes del chat para coordinar el Reintento, THE Sistema SHALL registrar la obligación del Repartidor de visitar el domicilio en los 3 intentos en horario común de reparto
6. WHEN un envío alcanza el tercer intento fallido, THE Sistema SHALL cambiar automáticamente el estado del envío a "Devuelto_a_Sucursal"
7. WHEN el estado de un envío cambia a "Devuelto_a_Sucursal", THE Sistema SHALL cerrar el caso de seguimiento activo del envío
8. WHEN el estado de un envío cambia a "Devuelto_a_Sucursal", THE Sistema SHALL enviar un correo electrónico al Usuario con la información de la sucursal donde se encuentra el paquete, el horario de retiro disponible y las opciones: retirar el paquete personalmente o pagar un nuevo envío para que salga a reparto nuevamente
9. THE Agente_IA SHALL informar al Usuario sobre el estado "Devuelto_a_Sucursal" y las opciones disponibles cuando el Usuario lo consulte
10. THE Sistema SHALL requerir contacto con personal humano vía teléfono para gestionar la resolución final de envíos en estado "Devuelto_a_Sucursal", ya sea retiro personal o pago de nuevo envío
11. WHEN un envío con Seguro contratado alcanza el estado "Devuelto_a_Sucursal", THE Sistema SHALL mantener el Seguro activo y vigente mientras el paquete permanezca en la sucursal, y el Usuario podrá activar el seguro únicamente si el paquete resulta perdido o dañado durante el proceso; si el Usuario retira el paquete o paga un nuevo envío, el Seguro original no cubre el nuevo trayecto
12. THE Sistema SHALL requerir que cada Reintento de entrega se realice dentro de los 3 días hábiles siguientes al intento fallido anterior; si el Repartidor no puede coordinar el Reintento dentro de ese plazo, THE Sistema SHALL notificar al Administrador para reasignación
