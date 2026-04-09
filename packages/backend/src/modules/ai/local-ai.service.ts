import pool from '../../db/pool';

interface UserContext {
  id: string;
  full_name: string;
  balance: number;
  total_shipments: number;
  active_shipments: number;
  recent_shipments: Array<{
    id: string;
    tracking_code: string;
    status: string;
    dest_address: string | null;
    created_at: Date;
  }>;
}

export class LocalAIService {
  private patterns = {
    greeting: /^(hola|buenos dias|buenas tardes|buenas noches|hey|hi|buenas|buen dia)/i,
    balance: /(saldo|balance|cuanto tengo|mi cuenta|plata|dinero disponible)/i,
    shipments: /(mis envios|todos mis envios|listar envios|ver envios|cuales son mis|mis paquetes)/i,
    shipmentStatus: /(estado|donde esta|como va|sigue|llego|en que estado|tracking|rastrear|seguimiento)\s*(el|mi|del)?\s*([A-Z0-9-]{6,})?/i,
    trackingCode: /\b([A-Z]{2,4}-\d{4,}|[A-Z0-9]{8,})\b/,
    createShipment: /(crear|nuevo|hacer|quiero enviar|necesito enviar|como creo|como hago un envio)/i,
    cancelShipment: /(cancelar|anular|dar de baja)\s*(el|mi|un)?\s*(envio|paquete)?/i,
    prices: /(precio|costo|cuanto cuesta|tarifa|cobran|cuanto sale)/i,
    incident: /(problema|incidencia|reclamo|queja|inconveniente|falla|error con)/i,
    lostPackage: /(perdido|perdi|no llego|no aparece|no encuentro|extraviado)/i,
    damagedPackage: /(danado|roto|golpeado|mal estado|llegó roto|llegó mal)/i,
    delayedPackage: /(retraso|demora|tarda|tarde|cuando llega|mucho tiempo|dias)/i,
    wrongAddress: /(direccion incorrecta|domicilio mal|equivocado|wrong address|cambiar direccion)/i,
    wrongContent: /(contenido incorrecto|no es lo que pedi|equivocado|producto mal|no corresponde)/i,
    courierProblem: /(repartidor|mensajero|cadete|delivery|no toco timbre|no fue|no paso)/i,
    refund: /(reembolso|devolucion|devolver plata|reintegro|me devuelvan)/i,
    branches: /(sucursal|sucursales|oficina|donde estan|direccion de)/i,
    hours: /(horario|hora|cuando abren|cuando cierran|atienden)/i,
    help: /(ayuda|help|que puedes|que sabes|opciones|que haces|como funciona)/i,
    human: /(humano|persona|operador|agente real|hablar con alguien|no me ayuda|quiero hablar)/i,
    goodbye: /(adios|chau|hasta luego|bye|gracias|ok gracias|listo gracias)/i,
  };

  async processMessage(userId: string, message: string, sessionId?: string): Promise<string> {
    try {
      const context = await this.getUserContext(userId);

      if (sessionId) {
        await this.saveMessage(userId, sessionId, 'user', message);
      }

      const intent = this.detectIntent(message);
      const response = await this.generateResponse(intent, message, context);

      if (sessionId) {
        await this.saveMessage(userId, sessionId, 'assistant', response);
      }

      return response;
    } catch (error) {
      console.error('Error en LocalAI:', error);
      return 'Lo siento, tuve un problema procesando tu mensaje. Intentá nuevamente o escribí "ayuda" para ver las opciones disponibles.';
    }
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.balance,
        (SELECT COUNT(*) FROM shipments WHERE sender_id = u.id) as total_shipments,
        (SELECT COUNT(*) FROM shipments WHERE sender_id = u.id AND status IN ('En_Camino', 'En_Entrega')) as active_shipments
       FROM users u WHERE u.id = $1`,
      [userId]
    );

    const user = userResult.rows[0];

    const shipmentsResult = await pool.query(
      `SELECT id, tracking_code, status, dest_address, created_at
       FROM shipments WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    return {
      id: user.id,
      full_name: user.full_name,
      balance: parseFloat(user.balance),
      total_shipments: parseInt(user.total_shipments),
      active_shipments: parseInt(user.active_shipments),
      recent_shipments: shipmentsResult.rows,
    };
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private detectIntent(message: string): string {
    const msg = this.normalize(message);

    if (this.patterns.greeting.test(msg) && msg.length < 35) return 'greeting';
    if (this.patterns.human.test(msg)) return 'human';
    if (this.patterns.lostPackage.test(msg)) return 'lostPackage';
    if (this.patterns.damagedPackage.test(msg)) return 'damagedPackage';
    if (this.patterns.courierProblem.test(msg)) return 'courierProblem';
    if (this.patterns.wrongAddress.test(msg)) return 'wrongAddress';
    if (this.patterns.wrongContent.test(msg)) return 'wrongContent';
    if (this.patterns.delayedPackage.test(msg)) return 'delayedPackage';
    if (this.patterns.refund.test(msg)) return 'refund';
    if (this.patterns.cancelShipment.test(msg)) return 'cancelShipment';
    if (this.patterns.incident.test(msg)) return 'incident';
    if (this.patterns.balance.test(msg)) return 'balance';
    if (this.patterns.shipmentStatus.test(msg)) return 'shipmentStatus';
    if (this.patterns.shipments.test(msg)) return 'shipments';
    if (this.patterns.createShipment.test(msg)) return 'createShipment';
    if (this.patterns.prices.test(msg)) return 'prices';
    if (this.patterns.branches.test(msg)) return 'branches';
    if (this.patterns.hours.test(msg)) return 'hours';
    if (this.patterns.help.test(msg)) return 'help';
    if (this.patterns.goodbye.test(msg)) return 'goodbye';

    return 'unknown';
  }

  private async generateResponse(intent: string, message: string, context: UserContext): Promise<string> {
    switch (intent) {
      case 'greeting':        return this.greetingResponse(context);
      case 'balance':         return this.balanceResponse(context);
      case 'shipments':       return this.shipmentsResponse(context);
      case 'shipmentStatus':  return await this.shipmentStatusResponse(message, context);
      case 'createShipment':  return this.createShipmentResponse();
      case 'cancelShipment':  return this.cancelShipmentResponse(context);
      case 'prices':          return this.pricesResponse();
      case 'branches':        return this.branchesResponse();
      case 'hours':           return this.hoursResponse();
      case 'lostPackage':     return this.lostPackageResponse(context);
      case 'damagedPackage':  return this.damagedPackageResponse(context);
      case 'delayedPackage':  return this.delayedPackageResponse(context);
      case 'courierProblem':  return this.courierProblemResponse(context);
      case 'wrongAddress':    return this.wrongAddressResponse();
      case 'wrongContent':    return this.wrongContentResponse(context);
      case 'refund':          return this.refundResponse();
      case 'incident':        return this.incidentResponse(context);
      case 'help':            return this.helpResponse();
      case 'human':           return this.humanResponse();
      case 'goodbye':         return this.goodbyeResponse(context);
      default:                return this.unknownResponse();
    }
  }

  // ─── Respuestas ────────────────────────────────────────────────────────────

  private greetingResponse(context: UserContext): string {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    const active = context.active_shipments > 0
      ? ` Tenés ${context.active_shipments} envío${context.active_shipments > 1 ? 's' : ''} activo${context.active_shipments > 1 ? 's' : ''}.`
      : '';
    return `${greeting}, ${context.full_name}!${active} ¿En qué puedo ayudarte?`;
  }

  private balanceResponse(context: UserContext): string {
    return `Tu saldo disponible es de $${context.balance.toFixed(2)}. Podés usarlo para abonar nuevos envíos directamente desde la plataforma.`;
  }

  private shipmentsResponse(context: UserContext): string {
    if (context.total_shipments === 0) {
      return 'Todavía no tenés envíos registrados. Podés crear uno desde la sección "Nuevo Envío".';
    }
    if (context.recent_shipments.length === 0) {
      return `Tenés ${context.total_shipments} envíos en total. Podés verlos en la sección "Mis Envíos".`;
    }

    const list = context.recent_shipments
      .map(s => `• ${s.tracking_code} — ${this.formatStatus(s.status)}${s.dest_address ? ` → ${s.dest_address}` : ''}`)
      .join('\n');

    return `Tus últimos envíos:\n${list}\n\nPara más detalles, visitá la sección "Mis Envíos".`;
  }

  private async shipmentStatusResponse(message: string, context: UserContext): Promise<string> {
    // Intentar extraer tracking code del mensaje
    const match = message.match(this.patterns.trackingCode);

    if (match) {
      const trackingCode = match[1];
      try {
        const result = await pool.query(
          `SELECT tracking_code, status, dest_address, created_at
           FROM shipments WHERE tracking_code = $1 AND sender_id = $2`,
          [trackingCode, context.id]
        );
        if (result.rows.length > 0) {
          const s = result.rows[0];
          const addr = s.dest_address ? `\nDirección: ${s.dest_address}` : '';
          return `Envío **${s.tracking_code}**: ${this.formatStatus(s.status)}.${addr}`;
        } else {
          return `No encontré ningún envío con el código ${trackingCode} asociado a tu cuenta. Verificá el código e intentá nuevamente.`;
        }
      } catch {
        // fallthrough
      }
    }

    // Sin tracking code, mostrar el más reciente activo
    const active = context.recent_shipments.filter(
      s => ['Pendiente', 'En_Sucursal', 'Asignado', 'En_Camino', 'En_Entrega'].includes(s.status)
    );

    if (active.length === 0 && context.recent_shipments.length > 0) {
      const last = context.recent_shipments[0];
      return `Tu último envío (${last.tracking_code}) está en estado: ${this.formatStatus(last.status)}. Si querés consultar uno específico, indicame el código de seguimiento.`;
    }

    if (active.length > 0) {
      const list = active.map(s => `• ${s.tracking_code}: ${this.formatStatus(s.status)}`).join('\n');
      return `Tus envíos en curso:\n${list}\n\nSi querés el detalle de uno en particular, indicame el código de seguimiento.`;
    }

    return 'Para consultar el estado de un envío, indicame el código de seguimiento. Podés encontrarlo en la sección "Mis Envíos".';
  }

  private createShipmentResponse(): string {
    return 'Para crear un nuevo envío, andá a la sección "Nuevo Envío" en el menú. Vas a necesitar los datos del destinatario, la dirección y el tipo de paquete. Si tenés saldo disponible, podés pagarlo directamente desde ahí.';
  }

  private cancelShipmentResponse(context: UserContext): string {
    const cancellable = context.recent_shipments.filter(s => s.status === 'Pendiente');
    if (cancellable.length > 0) {
      const list = cancellable.map(s => `• ${s.tracking_code}`).join('\n');
      return `Solo se pueden cancelar envíos en estado Pendiente. Los tuyos cancelables son:\n${list}\n\nPodés cancelarlos desde "Mis Envíos" → detalle del envío.`;
    }
    return 'Solo se pueden cancelar envíos en estado Pendiente. En este momento no tenés envíos cancelables. Si el envío ya está en camino, necesitás contactarnos directamente.';
  }

  private pricesResponse(): string {
    return 'Las tarifas varían según el peso, dimensiones y destino del paquete. Podés ver el precio exacto al momento de crear el envío en la sección "Nuevo Envío", donde el sistema calcula el costo automáticamente.';
  }

  private branchesResponse(): string {
    return 'Podés ver todas nuestras sucursales con direcciones y horarios en la sección "Sucursales" del menú principal.';
  }

  private hoursResponse(): string {
    return 'Nuestras sucursales atienden de lunes a viernes de 8:00 a 20:00 hs, y los sábados de 9:00 a 14:00 hs. El seguimiento online está disponible las 24 hs.';
  }

  private lostPackageResponse(context: UserContext): string {
    const recent = context.recent_shipments[0];
    const ref = recent ? ` (ej: ${recent.tracking_code})` : '';
    return `Lamentamos el inconveniente. Para reportar un paquete que no llegó, necesitamos el código de seguimiento${ref}. Podés abrir una incidencia formal desde "Mis Envíos" → tu envío → "Reportar problema", o contactar a nuestro equipo al (011) 1234-5678. Investigamos todos los casos en un plazo máximo de 48 hs hábiles.`;
  }

  private damagedPackageResponse(context: UserContext): string {
    const recent = context.recent_shipments[0];
    const ref = recent ? ` como el ${recent.tracking_code}` : '';
    return `Lamentamos que el paquete${ref} haya llegado dañado. Por favor, sacá fotos del embalaje y el contenido antes de descartarlo. Abrí una incidencia desde "Mis Envíos" → tu envío → "Reportar problema", adjuntando las fotos. Lo revisamos en 48 hs hábiles. Si el daño es por culpa del servicio, aplicamos el seguro correspondiente.`;
  }

  private delayedPackageResponse(context: UserContext): string {
    const active = context.recent_shipments.filter(
      s => ['En_Sucursal', 'Asignado', 'En_Camino', 'En_Entrega'].includes(s.status)
    );
    if (active.length > 0) {
      const list = active.map(s => `• ${s.tracking_code}: ${this.formatStatus(s.status)}`).join('\n');
      return `Tus envíos en tránsito:\n${list}\n\nLos retrasos pueden ocurrir por condiciones climáticas, alta demanda o inconvenientes operativos. Si lleva más de 5 días hábiles sin movimiento, podés abrir una incidencia desde el detalle del envío.`;
    }
    return 'Para consultar si hay un retraso, necesito el código de seguimiento. Los retrasos superiores a 5 días hábiles se pueden reportar como incidencia desde "Mis Envíos".';
  }

  private courierProblemResponse(_context: UserContext): string {
    return `Si el repartidor no se presentó, no tocó el timbre o hubo algún problema con la entrega, podés reportarlo desde "Mis Envíos" → tu envío → "Reportar problema". Seleccioná el motivo "Problema con el repartidor". Tomamos estos casos muy en serio y respondemos en 24 hs hábiles.`;
  }

  private wrongAddressResponse(): string {
    return 'Si la dirección del envío es incorrecta y el paquete aún no salió (estado Pendiente), podés modificarla desde "Mis Envíos" → detalle del envío. Si ya está en camino, contactanos urgente al (011) 1234-5678 para intentar corregirlo antes de la entrega.';
  }

  private wrongContentResponse(context: UserContext): string {
    const recent = context.recent_shipments[0];
    const ref = recent ? ` (${recent.tracking_code})` : '';
    return `Si recibiste un paquete${ref} con contenido incorrecto, abrí una incidencia desde "Mis Envíos" → "Reportar problema" seleccionando "Contenido incorrecto". Necesitamos fotos del contenido recibido. Lo gestionamos en un plazo de 48 a 72 hs hábiles.`;
  }

  private refundResponse(): string {
    return 'Los reembolsos se procesan en los siguientes casos: cancelación antes del despacho, paquete perdido o daño comprobado por el servicio. El proceso tarda entre 3 y 5 días hábiles una vez aprobado. Podés solicitarlo desde "Mis Envíos" → tu envío → "Solicitar reembolso", o contactando al (011) 1234-5678.';
  }

  private incidentResponse(context: UserContext): string {
    const recent = context.recent_shipments[0];
    const ref = recent ? ` relacionado con el envío ${recent.tracking_code}` : '';
    return `Para registrar una incidencia${ref}, andá a "Mis Envíos", seleccioná el envío afectado y tocá "Reportar problema". Las categorías disponibles son: paquete perdido, paquete dañado, retraso, problema con el repartidor y contenido incorrecto. Si preferís, también podés llamar al (011) 1234-5678.`;
  }

  private helpResponse(): string {
    return `Puedo ayudarte con:\n• Consultar tu saldo\n• Ver el estado de tus envíos\n• Crear o cancelar un envío\n• Reportar paquete perdido, dañado o con retraso\n• Problema con el repartidor\n• Solicitar reembolso\n• Información de sucursales y horarios\n\n¿Sobre qué querés saber?`;
  }

  private humanResponse(): string {
    return 'Para hablar con un agente humano, llamá al (011) 1234-5678 de lunes a viernes de 8:00 a 20:00 hs, o enviá un mail a soporte@stnpqs.com. También podés dejar tu consulta y te contactamos a la brevedad.';
  }

  private goodbyeResponse(context: UserContext): string {
    return `¡Hasta luego, ${context.full_name}! Que tengas un buen día. Si necesitás algo más, acá voy a estar.`;
  }

  private unknownResponse(): string {
    return 'No entendí bien tu consulta. Podés escribir "ayuda" para ver todo lo que puedo hacer por vos, o contactar a un agente al (011) 1234-5678.';
  }

  // ─── Utilidades ────────────────────────────────────────────────────────────

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      'Pendiente':           'Pendiente de despacho',
      'En_Sucursal':         'En sucursal',
      'Asignado':            'Asignado a repartidor',
      'En_Camino':           'En camino',
      'En_Entrega':          'En proceso de entrega',
      'Entregado':           'Entregado',
      'Entrega_Fallida':     'Entrega fallida',
      'Devuelto_a_Sucursal': 'Devuelto a sucursal',
      'Cancelado':           'Cancelado',
    };
    return map[status] || status;
  }

  private async saveMessage(userId: string, sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      let conversationId;
      const existingConv = await pool.query(
        `SELECT id FROM ai_conversations WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (existingConv.rows.length > 0) {
        conversationId = existingConv.rows[0].id;
      } else {
        const newConv = await pool.query(
          `INSERT INTO ai_conversations (user_id, session_id, started_at) VALUES ($1, $2, NOW()) RETURNING id`,
          [userId, sessionId]
        );
        conversationId = newConv.rows[0].id;
      }

      await pool.query(
        `INSERT INTO ai_messages (conversation_id, role, content, created_at) VALUES ($1, $2, $3, NOW())`,
        [conversationId, role, content]
      );
    } catch (error) {
      console.error('Error guardando mensaje:', error);
    }
  }
}

export const localAI = new LocalAIService();
