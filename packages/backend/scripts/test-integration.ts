import 'dotenv/config';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (error) console.log(`   Error: ${error}`);
}

async function runTests() {
  console.log('🧪 Iniciando pruebas de integración...\n');
  console.log(`API URL: ${API_URL}\n`);

  let accessToken = '';

  // 1. Health Check
  try {
    const response = await axios.get(`${API_URL}/health`);
    logTest('Health Check', response.status === 200 && response.data.status === 'ok');
  } catch (error: any) {
    logTest('Health Check', false, error.message);
  }

  // 2. Registro de usuario
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: `test${Date.now()}@test.com`,
      password: 'Test123!@#',
      fullName: 'Usuario Test',
      phone: '+54 11 1111-1111',
    });
    logTest('Registro de usuario', response.status === 201);
  } catch (error: any) {
    logTest('Registro de usuario', false, error.response?.data?.error || error.message);
  }

  // 3. Login
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'usuario@test.com',
      password: 'password123',
    });
    
    if (response.data.requires2FA) {
      logTest('Login (requiere 2FA)', true);
    } else {
      accessToken = response.data.accessToken;
      logTest('Login', response.status === 200 && !!accessToken);
    }
  } catch (error: any) {
    logTest('Login', false, error.response?.data?.error || error.message);
  }

  if (!accessToken) {
    console.log('\n⚠️  No se pudo obtener token de acceso. Deteniendo pruebas autenticadas.');
    printSummary();
    return;
  }

  const authHeaders = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  // 4. Obtener perfil
  try {
    const response = await axios.get(`${API_URL}/profile/me`, authHeaders);
    logTest('Obtener perfil', response.status === 200 && !!response.data.email);
  } catch (error: any) {
    logTest('Obtener perfil', false, error.response?.data?.error || error.message);
  }

  // 5. Cotización pública (sin auth)
  try {
    const response = await axios.post(`${API_URL}/shipments/quote`, {
      originLat: -34.6037,
      originLng: -58.3816,
      destLat: -34.5956,
      destLng: -58.3886,
      weightKg: 2.5,
      serviceType: 'standard',
    });
    logTest('Cotización pública', response.status === 200 && response.data.estimatedCost > 0);
  } catch (error: any) {
    logTest('Cotización pública', false, error.response?.data?.error || error.message);
  }

  // 6. Listar envíos
  try {
    const response = await axios.get(`${API_URL}/shipments`, authHeaders);
    logTest('Listar envíos', response.status === 200 && Array.isArray(response.data.shipments));
  } catch (error: any) {
    logTest('Listar envíos', false, error.response?.data?.error || error.message);
  }

  // 7. Obtener notificaciones
  try {
    const response = await axios.get(`${API_URL}/notifications`, authHeaders);
    logTest('Obtener notificaciones', response.status === 200);
  } catch (error: any) {
    logTest('Obtener notificaciones', false, error.response?.data?.error || error.message);
  }

  // 8. Obtener transacciones
  try {
    const response = await axios.get(`${API_URL}/payments/transactions`, authHeaders);
    logTest('Obtener transacciones', response.status === 200);
  } catch (error: any) {
    logTest('Obtener transacciones', false, error.response?.data?.error || error.message);
  }

  // 9. Obtener direcciones guardadas
  try {
    const response = await axios.get(`${API_URL}/profile/addresses`, authHeaders);
    logTest('Obtener direcciones', response.status === 200);
  } catch (error: any) {
    logTest('Obtener direcciones', false, error.response?.data?.error || error.message);
  }

  // 10. Chat con Agente IA (puede fallar si no hay API key)
  try {
    const response = await axios.post(
      `${API_URL}/ai/chat`,
      {
        message: 'Hola, ¿cómo puedo rastrear mi envío?',
      },
      authHeaders
    );
    logTest('Chat con Agente IA', response.status === 200 && !!response.data.response);
  } catch (error: any) {
    if (error.response?.status === 500 && error.response?.data?.response) {
      logTest('Chat con Agente IA (sin API key)', true);
    } else {
      logTest('Chat con Agente IA', false, error.response?.data?.error || error.message);
    }
  }

  // 11. WebSocket connection test
  try {
    const io = require('socket.io-client');
    const socket = io(API_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    logTest('Conexión WebSocket', true);
  } catch (error: any) {
    logTest('Conexión WebSocket', false, error.message);
  }

  // 12. Rate limiting test (login)
  try {
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(
        axios.post(`${API_URL}/auth/login`, {
          email: 'wrong@test.com',
          password: 'wrong',
        }).catch(e => e.response)
      );
    }
    
    const responses = await Promise.all(promises);
    const blocked = responses.some(r => r?.status === 429);
    logTest('Rate limiting (login)', blocked);
  } catch (error: any) {
    logTest('Rate limiting (login)', false, error.message);
  }

  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Resumen de Pruebas');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal: ${total}`);
  console.log(`✅ Pasadas: ${passed}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`📈 Tasa de éxito: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Pruebas fallidas:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`);
      if (r.error) console.log(`     ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(50));
}

// Ejecutar pruebas
runTests().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
