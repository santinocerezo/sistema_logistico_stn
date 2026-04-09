import { Queue, Worker, Job } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const parsedUrl = new URL(redisUrl);
const connection = {
  host: parsedUrl.hostname || 'localhost',
  port: parseInt(parsedUrl.port || '6379'),
  maxRetriesPerRequest: null as null,
  enableOfflineQueue: false,
  lazyConnect: true,
};

interface NotificationJob {
  userId: number;
  type: string;
  title: string;
  message: string;
  channels: ('email' | 'sms' | 'push')[];
  relatedEntityType?: string;
  relatedEntityId?: number;
}

// Cola de notificaciones
export const notificationQueue = new Queue<NotificationJob>('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 horas
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 dias
    },
  },
});

// Worker para procesar notificaciones
export const notificationWorker = new Worker<NotificationJob>(
  'notifications',
  async (job: Job<NotificationJob>) => {
    const { userId, type, title, message, channels } = job.data;

    console.log(`Procesando notificacion para usuario ${userId}: ${title}`);

    // Obtener preferencias del usuario
    const userPreferences = await getUserNotificationPreferences(userId);

    // Enviar por cada canal habilitado
    const results = await Promise.allSettled(
      channels.map(async (channel) => {
        if (!userPreferences[channel]) {
          console.log(`Canal ${channel} deshabilitado para usuario ${userId}`);
          return;
        }

        switch (channel) {
          case 'email':
            return await sendEmailNotification(userId, title, message, type);
          case 'sms':
            return await sendSMSNotification(userId, message);
          case 'push':
            return await sendPushNotification(userId, title, message);
        }
      })
    );

    // Log de resultados
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error en canal ${channels[index]}:`, result.reason);
      }
    });

    return { success: true, results };
  },
  {
    connection,
    concurrency: 10,
  }
);

// Obtener preferencias de notificacion del usuario
async function getUserNotificationPreferences(userId: number): Promise<Record<string, boolean>> {
  const pool = require('../../db/pool').default;
  
  const result = await pool.query(
    `SELECT preferences FROM notification_preferences WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Preferencias por defecto
    return {
      email: true,
      sms: true,
      push: true,
    };
  }

  return result.rows[0].preferences;
}

// Enviar email (simulado - integrar con SendGrid/SES)
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

  if (userResult.rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const { email, full_name } = userResult.rows[0];

  // TODO: Integrar con SendGrid o AWS SES
  console.log(`[EMAIL] To: ${email} (${full_name})`);
  console.log(`[EMAIL] Subject: ${title}`);
  console.log(`[EMAIL] Body: ${message}`);
  console.log(`[EMAIL] Type: ${type}`);

  // Simulacion de envio
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Enviar SMS (simulado - integrar con Twilio/SNS)
async function sendSMSNotification(userId: number, message: string): Promise<void> {
  const pool = require('../../db/pool').default;
  
  const userResult = await pool.query(
    `SELECT phone FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const { phone } = userResult.rows[0];

  if (!phone) {
    console.log(`Usuario ${userId} no tiene telefono registrado`);
    return;
  }

  // TODO: Integrar con Twilio o AWS SNS
  console.log(`[SMS] To: ${phone}`);
  console.log(`[SMS] Message: ${message}`);

  // Simulacion de envio
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Enviar push notification (simulado - integrar con Web Push VAPID)
async function sendPushNotification(
  userId: number,
  title: string,
  message: string
): Promise<void> {
  // TODO: Integrar con Web Push API usando VAPID
  console.log(`[PUSH] User: ${userId}`);
  console.log(`[PUSH] Title: ${title}`);
  console.log(`[PUSH] Message: ${message}`);

  // Simulacion de envio
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Agregar notificacion a la cola
export async function queueNotification(data: NotificationJob): Promise<void> {
  await notificationQueue.add('send-notification', data, {
    priority: data.type === 'critical' ? 1 : 10,
  });
}

// Eventos del worker
notificationWorker.on('completed', (job) => {
  console.log(`Notificacion ${job.id} completada`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Notificacion ${job?.id} fallo:`, err.message);
});

notificationWorker.on('error', () => {
  // Redis no disponible — notificaciones deshabilitadas
});

// Absorber errores de conexión de la cola
notificationQueue.on('error', () => {
  // Redis no disponible — cola de notificaciones deshabilitada
});
