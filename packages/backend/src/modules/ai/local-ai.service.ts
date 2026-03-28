import pool from '../../db/pool';

interface UserContext {
  id: string;
  full_name: string;
  balance: number;
  total_shipments: number;
  active_shipments: number;
  recent_shipments: Array<{
    tracking_code: string;
    status: string;
    created_at: Date;
  }>;
}

export class LocalAIService {
  private patterns = {
    greeting: /^(hola|buenos dias|buenas tardes|buenas noches|hey|hi|buenas)/i,
    balance: /(saldo|balance|dinero|cuanto tengo|mi cuenta|plata)/i,
    shipments: /(envio|paquete|pedido|mis envio|tracking|rastreo|seguimiento|cuales son)/i,
    shipmentStatus: /(estado|donde esta|ubicacion|como va)/i,
    createShipment: /(crear|nuevo|hacer|quiero enviar|necesito enviar)/i,
    incident: /(problema|incidencia|reclamo|queja|perdido|danado|retraso)/i,
    help: /(ayuda|help|que puedes hacer|opciones|comandos)/i,
    human: /(humano|persona|operador|agente real|hablar con alguien)/i,
    goodbye: /(adios|chau|hasta luego|bye|gracias)/i,
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
      return 'Lo siento, tuve un problema procesando tu mensaje.';
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
      `SELECT tracking_code, status, created_at FROM shipments
       WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 5`,
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

  private detectIntent(message: string): string {
    const normalized = message.toLowerCase().trim();

    if (this.patterns.greeting.test(normalized) && normalized.length < 30) return 'greeting';
    if (this.patterns.human.test(normalized)) return 'human';
    if (this.patterns.balance.test(normalized)) return 'balance';
    if (this.patterns.incident.test(normalized)) return 'incident';
    if (this.patterns.createShipment.test(normalized)) return 'createShipment';
    if (this.patterns.shipmentStatus.test(normalized)) return 'shipmentStatus';
    if (this.patterns.shipments.test(normalized)) return 'shipments';
    if (this.patterns.help.test(normalized)) return 'help';
    if (this.patterns.goodbye.test(normalized)) return 'goodbye';

    return 'unknown';
  }

  private async generateResponse(intent: string, message: string, context: UserContext): Promise<string> {
    switch (intent) {
      case 'greeting': return this.greetingResponse(context);
      case 'balance': return this.balanceResponse(context);
      case 'shipments': return this.shipmentsResponse(context);
      case 'shipmentStatus': return this.shipmentStatusResponse(message, context);
      case 'createShipment': return this.createShipmentResponse(context);
      case 'incident': return this.incidentResponse();
      case 'help': return this.helpResponse();
      case 'human': return this.humanResponse();
      case 'goodbye': return this.goodbyeResponse(context);
      default: return this.unknownResponse();
    }
  }

  private greetingResponse(context: UserContext): string {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    return `${greeting}, ${context.full_name}! Soy tu asistente virtual. ¿En qué puedo ayudarte?`;
  }

  private balanceResponse(context: UserContext): string {
    return `Tu saldo actual es de $${context.balance.toFixed(2)}`;
  }

  private shipmentsResponse(context: UserContext): string {
    if (context.total_shipments === 0) {
      return 'Aún no tienes envíos registrados.';
    }
    return `Tienes ${context.total_shipments} envíos en total.`;
  }

  private shipmentStatusResponse(_message: string, _context: UserContext): string {
    return 'Puedes consultar el estado de tus envíos en la sección Mis Envíos.';
  }

  private createShipmentResponse(_context: UserContext): string {
    return 'Para crear un nuevo envío, ve a la sección Nuevo Envío en tu perfil.';
  }

  private incidentResponse(): string {
    return 'Para reportar una incidencia, cuéntame qué problema tienes.';
  }

  private helpResponse(): string {
    return 'Puedo ayudarte con: consultar envíos, ver saldo, reportar problemas.';
  }

  private humanResponse(): string {
    return 'Para hablar con un agente humano, llama al (011) 1234-5678.';
  }

  private goodbyeResponse(context: UserContext): string {
    return `Hasta luego, ${context.full_name}!`;
  }

  private unknownResponse(): string {
    return 'No estoy seguro de entender. ¿Puedes reformular tu pregunta?';
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
