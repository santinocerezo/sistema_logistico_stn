import OpenAI from 'openai';
import pool from '../../db/pool';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-test-key',
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Iniciar flujo de reclamacion con Agente IA
export async function initiateClaimFlow(
  shipmentId: number,
  _userId: number,
  io: any
): Promise<void> {
  try {
    // Marcar que el flujo de reclamacion esta activo
    await pool.query(
      `UPDATE claims SET claim_flow_active = true WHERE shipment_id = $1`,
      [shipmentId]
    );

    // Obtener informacion del envio
    const shipmentResult = await pool.query(
      `SELECT 
        s.*,
        u.full_name as user_name,
        c.id as courier_id,
        cu.id as courier_user_id,
        cu.full_name as courier_name
       FROM shipments s
       JOIN users u ON s.sender_id = u.id
       LEFT JOIN couriers c ON s.assigned_courier_id = c.id
       LEFT JOIN users cu ON c.user_id = cu.id
       WHERE s.id = $1`,
      [shipmentId]
    );

    if (shipmentResult.rows.length === 0) {
      throw new Error('Envio no encontrado');
    }

    const shipment = shipmentResult.rows[0];

    // Obtener historial de chat
    const messagesResult = await pool.query(
      `SELECT 
        cm.message,
        cm.created_at,
        u.role,
        u.full_name
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.shipment_id = $1
       ORDER BY cm.created_at ASC`,
      [shipmentId]
    );

    const chatHistory: ChatMessage[] = messagesResult.rows.map(row => ({
      role: row.role === 'system' ? 'assistant' : 'user',
      content: `${row.full_name}: ${row.message}`,
    }));

    // Verificar si ya se recopilo la version del usuario
    const userVersionCollected = chatHistory.some(
      msg => msg.content.includes('version del usuario') || msg.content.includes('gracias por compartir')
    );

    // Crear usuario del sistema para el Agente IA si no existe
    let aiUserId: number;
    const aiUserResult = await pool.query(
      `SELECT id FROM users WHERE role = 'system' AND email = 'ai@stnpq.com' LIMIT 1`
    );

    if (aiUserResult.rows.length === 0) {
      const createAiResult = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, phone)
         VALUES ('ai@stnpq.com', '', 'Agente IA', 'system', '')
         RETURNING id`
      );
      aiUserId = createAiResult.rows[0].id;
    } else {
      aiUserId = aiUserResult.rows[0].id;
    }

    // Mensaje inicial del Agente IA al usuario
    const initialMessage = `Hola ${shipment.user_name}, soy el Agente IA de STN PQ's. Se ha iniciado una reclamacion sobre el envio ${shipment.tracking_code}. Por favor, cuentame tu version de lo que sucedio.`;

    let systemPrompt = `Eres un agente de atencion al cliente de STN PQ's, una empresa de logistica. 
Tu tarea es mediar en una reclamacion sobre el envio ${shipment.tracking_code}.
Estado del envio: ${shipment.status}
Repartidor asignado: ${shipment.courier_name || 'No asignado'}

`;

    if (!userVersionCollected) {
      systemPrompt += `Primero recopila la version del usuario. 
Haz preguntas de seguimiento si es necesario para entender bien la situacion.
Cuando tengas suficiente informacion, agradece al usuario y menciona que ahora contactaras al repartidor para obtener su version.`;
    } else {
      systemPrompt += `Ya recopilaste la version del usuario. Ahora deberas contactar al repartidor y menciona que contactaras al repartidor para obtener su version.
Menciona que cuando haya una resolucion se le notificara al usuario.`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: initialMessage },
    ];

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content || 'Lo siento, no pude procesar tu mensaje.';

    // Guardar respuesta del AI
    await pool.query(
      `INSERT INTO chat_messages (shipment_id, sender_id, message, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [shipmentId, aiUserId, aiResponse]
    );

    const aiUserResult2 = await pool.query(
      `SELECT id, full_name, role FROM users WHERE id = $1`,
      [aiUserId]
    );

    // Enviar mensaje via WebSocket
    io.to(`chat:${shipmentId}`).emit('chat:message', {
      shipment_id: shipmentId,
      sender_id: aiUserId,
      message: aiResponse,
      sender: aiUserResult2.rows[0],
      created_at: new Date(),
    });

    // Si ya se recopilo la version del usuario, contactar al repartidor
    if (userVersionCollected && shipment.courier_user_id) {
      await contactCourier(shipmentId, shipment.courier_user_id, io);
    }

  } catch (error) {
    console.error('Error al iniciar flujo de reclamacion:', error);
    throw error;
  }
}

// Contactar al repartidor para obtener su version
async function contactCourier(
  shipmentId: number,
  _courierUserId: number,
  io: any
): Promise<void> {
  const courierMessage = `Hola, soy el Agente IA de STN PQ's. Se ha iniciado una reclamacion sobre el envio que tienes asignado. Por favor, cuentame tu version de lo que sucedio.`;

  let aiUserId: number;
  const aiUserResult = await pool.query(
    `SELECT id FROM users WHERE role = 'system' AND email = 'ai@stnpq.com' LIMIT 1`
  );

  if (aiUserResult.rows.length === 0) {
    return;
  }

  aiUserId = aiUserResult.rows[0].id;

  await pool.query(
    `INSERT INTO chat_messages (shipment_id, sender_id, message, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [shipmentId, aiUserId, courierMessage]
  );

  const aiUserResult2 = await pool.query(
    `SELECT id, full_name, role FROM users WHERE id = $1`,
    [aiUserId]
  );

  io.to(`chat:${shipmentId}`).emit('chat:message', {
    shipment_id: shipmentId,
    sender_id: aiUserId,
    message: courierMessage,
    sender: aiUserResult2.rows[0],
    created_at: new Date(),
  });
}

// Procesar mensaje del usuario con el Agente IA
export async function processAIChat(
  userId: number,
  message: string,
  sessionId?: string
): Promise<string> {
  try {
    // Obtener contexto del usuario
    const userResult = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.balance,
        (SELECT COUNT(*) FROM shipments WHERE sender_id = u.id) as total_shipments,
        (SELECT COUNT(*) FROM shipments WHERE sender_id = u.id AND status IN ('En_Camino', 'En_Entrega')) as active_shipments
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const user = userResult.rows[0];

    // Obtener envios recientes
    const shipmentsResult = await pool.query(
      `SELECT tracking_code, status, created_at
       FROM shipments
       WHERE sender_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    const recentShipments = shipmentsResult.rows
      .map(s => `- ${s.tracking_code}: ${s.status}`)
      .join('\n');

    // System prompt
    const systemPrompt = `Eres un asistente de logistica de STN PQ's en español.

Informacion del usuario:
- Nombre: ${user.full_name}
- Saldo: $${user.balance}
- Envios totales: ${user.total_shipments}
- Envios activos: ${user.active_shipments}

Envios recientes:
${recentShipments || 'Sin envios recientes'}

Puedes ayudar con:
- Consultar estado de envios
- Consultar saldo
- Crear incidencias
- Iniciar reclamaciones
- Cancelar envios
- Consultar politicas de reembolso
- Escalar a un humano si es necesario

Responde de forma amigable, concisa y profesional.`;

    // Obtener historial de conversacion si existe sessionId
    let chatHistory: ChatMessage[] = [];
    if (sessionId) {
      // Primero verificar si existe la conversación
      const conversationResult = await pool.query(
        `SELECT id FROM ai_conversations WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (conversationResult.rows.length > 0) {
        const conversationId = conversationResult.rows[0].id;
        
        const historyResult = await pool.query(
          `SELECT role, content
           FROM ai_messages
           WHERE conversation_id = $1
           ORDER BY created_at ASC
           LIMIT 20`,
          [conversationId]
        );
        chatHistory = historyResult.rows;
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message },
    ];

    // Llamar a OpenAI con timeout
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        functions: [
          {
            name: 'get_shipment_status',
            description: 'Obtener el estado actual de un envio',
            parameters: {
              type: 'object',
              properties: {
                tracking_code: {
                  type: 'string',
                  description: 'Codigo de seguimiento del envio',
                },
              },
              required: ['tracking_code'],
            },
          },
          {
            name: 'get_user_balance',
            description: 'Obtener el saldo actual del usuario',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_incident',
            description: 'Crear una incidencia sobre un envio',
            parameters: {
              type: 'object',
              properties: {
                shipment_id: {
                  type: 'number',
                  description: 'ID del envio',
                },
                incident_type: {
                  type: 'string',
                  description: 'Tipo de incidencia',
                },
                description: {
                  type: 'string',
                  description: 'Descripcion de la incidencia',
                },
              },
              required: ['shipment_id', 'incident_type', 'description'],
            },
          },
          {
            name: 'escalate_to_human',
            description: 'Escalar la conversacion a un agente humano',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Razon del escalamiento',
                },
              },
              required: ['reason'],
            },
          },
        ],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 90000)
      ),
    ]);

    const aiResponse = (completion as any).choices[0].message.content || 
      'Lo siento, no pude procesar tu mensaje. ¿Quieres que te conecte con un agente humano?';

    // Guardar en historial si hay sessionId
    if (sessionId) {
      // Crear o obtener conversación
      let conversationId;
      const existingConv = await pool.query(
        `SELECT id FROM ai_conversations WHERE session_id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (existingConv.rows.length > 0) {
        conversationId = existingConv.rows[0].id;
      } else {
        const newConv = await pool.query(
          `INSERT INTO ai_conversations (user_id, session_id, started_at)
           VALUES ($1, $2, NOW())
           RETURNING id`,
          [userId, sessionId]
        );
        conversationId = newConv.rows[0].id;
      }

      // Guardar mensajes
      await pool.query(
        `INSERT INTO ai_messages (conversation_id, role, content, created_at)
         VALUES ($1, 'user', $2, NOW()), ($1, 'assistant', $3, NOW())`,
        [conversationId, message, aiResponse]
      );
    }

    return aiResponse;

  } catch (error: any) {
    console.error('Error al procesar chat con IA:', error);
    
    if (error.message === 'Timeout') {
      return 'Lo siento, el servicio esta tardando mas de lo esperado. ¿Quieres que te conecte con un agente humano?';
    }

    return 'Lo siento, ocurrio un error. ¿Quieres que te conecte con un agente humano?';
  }
}
