import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Crear pool específico para el script
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'stnpq',
  user: process.env.POSTGRES_USER || 'stnpq_user',
  password: process.env.POSTGRES_PASSWORD || 'stnpq_pass',
});

async function seedDatabase() {
  console.log('🌱 Iniciando seed de la base de datos...');

  try {
    // 1. Crear usuarios de prueba
    console.log('📝 Creando usuarios...');
    
    const passwordHash = await bcrypt.hash('password123', 12);
    
    // Usuario regular
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['usuario@test.com', passwordHash, 'Juan Pérez', 'user', '+54 11 1234-5678', 50000]
    );
    const userId = userResult.rows[0].id;

    // Administrador
    const adminResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['admin@stnpq.com', passwordHash, 'Admin STN PQ', 'admin', '+54 11 9999-0000', 0]
    );
    const adminId = adminResult.rows[0].id;

    // Repartidor
    const courierUserResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['repartidor@stnpq.com', passwordHash, 'Carlos Repartidor', 'courier', '+54 11 5555-1234', 0]
    );
    const courierUserId = courierUserResult.rows[0].id;

    console.log(`✅ Usuarios creados: ${userId}, ${adminId}, ${courierUserId}`);

    // 2. Crear sucursales
    console.log('🏢 Creando sucursales...');
    
    const branchResult = await pool.query(
      `INSERT INTO branches (name, address, lat, lng, is_active, created_at)
       VALUES 
         ('Sucursal Centro', 'Av. Corrientes 1234, Buenos Aires, CABA', -34.6037, -58.3816, true, NOW()),
         ('Sucursal Norte', 'Av. Cabildo 2500, Buenos Aires, CABA', -34.5601, -58.4601, true, NOW()),
         ('Sucursal Sur', 'Av. Rivadavia 8000, Buenos Aires, CABA', -34.6368, -58.4831, true, NOW())
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      []
    );
    
    const branchIds = branchResult.rows.map(r => r.id);
    console.log(`✅ Sucursales creadas: ${branchIds.length}`);

    // 3. Crear repartidor
    console.log('🚚 Creando repartidor...');
    
    const courierResult = await pool.query(
      `INSERT INTO couriers (email, password_hash, full_name, phone, is_available, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (email) DO UPDATE SET is_available = true
       RETURNING id`,
      ['repartidor@stnpq.com', passwordHash, 'Carlos Repartidor', '+54 11 5555-1234']
    );
    const courierId = courierResult.rows[0].id;
    console.log(`✅ Repartidor creado: ${courierId}`);

    // 4. Crear servicios logísticos
    console.log('📦 Creando servicios...');
    
    await pool.query(
      `INSERT INTO logistics_services (name, description, is_active, created_at)
       VALUES 
         ('Envío Estándar', 'Entrega en 3-5 días hábiles', true, NOW()),
         ('Envío Express', 'Entrega en 24-48 horas', true, NOW())
       ON CONFLICT (name) DO NOTHING`
    );
    console.log('✅ Servicios creados');

    // 5. Crear tarifas
    console.log('💰 Creando tarifas...');
    
    await pool.query(
      `INSERT INTO rates (
        service_type, distance_min_km, distance_max_km, base_price, 
        price_per_kg, valid_from, valid_until, created_by, created_at
       )
       VALUES 
         ('standard', 0, 10, 1500, 150, NOW(), '2025-12-31', $1, NOW()),
         ('standard', 10, 50, 2500, 200, NOW(), '2025-12-31', $1, NOW()),
         ('standard', 50, 100, 4000, 250, NOW(), '2025-12-31', $1, NOW()),
         ('standard', 100, 500, 6000, 300, NOW(), '2025-12-31', $1, NOW()),
         ('express', 0, 10, 2100, 210, NOW(), '2025-12-31', $1, NOW()),
         ('express', 10, 50, 3500, 280, NOW(), '2025-12-31', $1, NOW()),
         ('express', 50, 100, 5600, 350, NOW(), '2025-12-31', $1, NOW()),
         ('express', 100, 500, 8400, 420, NOW(), '2025-12-31', $1, NOW())
       ON CONFLICT DO NOTHING`,
      [adminId]
    );
    console.log('✅ Tarifas creadas');

    // 6. Crear códigos promocionales
    console.log('🎟️ Creando códigos promocionales...');
    
    await pool.query(
      `INSERT INTO promo_codes (
        code, discount_type, discount_value, valid_from, valid_until, 
        max_uses, current_uses, is_active, created_by, created_at
       )
       VALUES 
         ('BIENVENIDO', 'percentage', 10, NOW(), '2025-12-31', 100, 0, true, $1, NOW()),
         ('VERANO2025', 'fixed', 500, NOW(), '2025-03-31', 50, 0, true, $1, NOW())
       ON CONFLICT (code) DO NOTHING`,
      [adminId]
    );
    console.log('✅ Códigos promocionales creados');

    // 7. Crear direcciones guardadas
    console.log('📍 Creando direcciones...');
    
    await pool.query(
      `INSERT INTO saved_addresses (
        user_id, label, address, city, province, postal_code, 
        latitude, longitude, is_favorite, created_at
       )
       VALUES 
         ($1, 'Casa', 'Av. Santa Fe 1500', 'Buenos Aires', 'CABA', '1060', -34.5956, -58.3886, true, NOW()),
         ($1, 'Trabajo', 'Av. Córdoba 800', 'Buenos Aires', 'CABA', '1054', -34.5992, -58.3756, false, NOW())
       ON CONFLICT DO NOTHING`,
      [userId]
    );
    console.log('✅ Direcciones creadas');

    // 8. Crear envíos de ejemplo
    console.log('📮 Creando envíos...');
    
    const shipment1 = await pool.query(
      `INSERT INTO shipments (
        user_id, tracking_code, verification_code, service_type,
        origin_branch_id, origin_address, origin_lat, origin_lng,
        destination_address, destination_city, destination_province, 
        destination_postal_code, destination_lat, destination_lng,
        package_type, weight_kg, length_cm, width_cm, height_cm,
        declared_value, insurance_cost, base_cost, total_cost,
        status, created_at
       )
       VALUES (
         $1, 'STN' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'), 
         LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
         'standard', $2,
         'Av. Corrientes 1234, CABA', -34.6037, -58.3816,
         'Av. Santa Fe 1500, CABA', 'Buenos Aires', 'CABA', '1060',
         -34.5956, -58.3886,
         'documento', 2.5, 30, 20, 10, 5000, 0, 1500, 1875,
         'En Sucursal', NOW()
       )
       RETURNING id, tracking_code`,
      [userId, branchIds[0]]
    );

    const shipment2 = await pool.query(
      `INSERT INTO shipments (
        user_id, tracking_code, verification_code, service_type,
        origin_branch_id, origin_address, origin_lat, origin_lng,
        destination_address, destination_city, destination_province,
        destination_postal_code, destination_lat, destination_lng,
        package_type, weight_kg, length_cm, width_cm, height_cm,
        declared_value, insurance_cost, base_cost, total_cost,
        status, courier_id, created_at
       )
       VALUES (
         $1, 'STN' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
         LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
         'express', $2,
         'Av. Cabildo 2500, CABA', -34.5601, -58.4601,
         'Av. Córdoba 800, CABA', 'Buenos Aires', 'CABA', '1054',
         -34.5992, -58.3756,
         'paquete', 5.0, 40, 30, 20, 15000, 150, 2100, 2775,
         'En Camino', $3, NOW()
       )
       RETURNING id, tracking_code`,
      [userId, branchIds[1], courierId]
    );

    console.log(`✅ Envíos creados: ${shipment1.rows[0].tracking_code}, ${shipment2.rows[0].tracking_code}`);

    // 9. Crear historial de estados
    console.log('📊 Creando historial de estados...');
    
    await pool.query(
      `INSERT INTO shipment_status_history (shipment_id, status, changed_by, created_at)
       VALUES 
         ($1, 'Pendiente', $2, NOW() - INTERVAL '2 days'),
         ($1, 'En Sucursal', $2, NOW() - INTERVAL '1 day'),
         ($3, 'Pendiente', $2, NOW() - INTERVAL '1 day'),
         ($3, 'En Sucursal', $2, NOW() - INTERVAL '12 hours'),
         ($3, 'Asignado', $4, NOW() - INTERVAL '6 hours'),
         ($3, 'En Camino', $5, NOW() - INTERVAL '2 hours')`,
      [shipment1.rows[0].id, adminId, shipment2.rows[0].id, adminId, courierUserId]
    );
    console.log('✅ Historial de estados creado');

    // 10. Crear transacciones
    console.log('💳 Creando transacciones...');
    
    await pool.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, balance_after, created_at
       )
       VALUES 
         ($1, 'topup', 50000, 'Recarga inicial', 50000, NOW() - INTERVAL '3 days'),
         ($1, 'shipment', -1875, 'Envío ${shipment1.rows[0].tracking_code}', 48125, NOW() - INTERVAL '2 days'),
         ($1, 'shipment', -2775, 'Envío ${shipment2.rows[0].tracking_code}', 45350, NOW() - INTERVAL '1 day')`,
      [userId]
    );
    console.log('✅ Transacciones creadas');

    // 11. Crear FAQs
    console.log('❓ Creando FAQs...');
    
    await pool.query(
      `INSERT INTO faqs (category, question, answer, display_order, is_active, created_at)
       VALUES 
         ('Envíos', '¿Cuánto tarda un envío estándar?', 'Los envíos estándar tardan entre 3 y 5 días hábiles en llegar a destino.', 1, true, NOW()),
         ('Envíos', '¿Cuánto tarda un envío express?', 'Los envíos express se entregan en 24 a 48 horas.', 2, true, NOW()),
         ('Tarifas', '¿Cómo se calcula el costo de envío?', 'El costo se calcula según la distancia, peso y tipo de servicio (estándar o express).', 1, true, NOW()),
         ('Tarifas', '¿Hay descuentos por volumen?', 'Sí, ofrecemos descuentos del 5%, 10% y 15% según la cantidad de envíos mensuales.', 2, true, NOW()),
         ('Seguimiento', '¿Cómo puedo rastrear mi envío?', 'Puedes rastrear tu envío ingresando el código de tracking en nuestra página o desde tu panel de usuario.', 1, true, NOW()),
         ('Pagos', '¿Qué métodos de pago aceptan?', 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express).', 1, true, NOW())
       ON CONFLICT DO NOTHING`
    );
    console.log('✅ FAQs creadas');

    // 12. Crear notificaciones
    console.log('🔔 Creando notificaciones...');
    
    await pool.query(
      `INSERT INTO notifications (
        user_id, type, title, message, related_entity_type, 
        related_entity_id, is_read, created_at
       )
       VALUES 
         ($1, 'shipment_status', 'Envío ${shipment1.rows[0].tracking_code}', 'Tu envío ha llegado a la sucursal', 'shipment', $2, false, NOW() - INTERVAL '1 day'),
         ($1, 'shipment_status', 'Envío ${shipment2.rows[0].tracking_code}', 'Tu envío está en camino', 'shipment', $3, false, NOW() - INTERVAL '2 hours'),
         ($1, 'balance_topup', 'Recarga exitosa', 'Se han acreditado $50000 a tu cuenta', NULL, NULL, true, NOW() - INTERVAL '3 days')`,
      [userId, shipment1.rows[0].id, shipment2.rows[0].id]
    );
    console.log('✅ Notificaciones creadas');

    console.log('\n✨ Seed completado exitosamente!\n');
    console.log('📧 Credenciales de prueba:');
    console.log('   Usuario: usuario@test.com / password123');
    console.log('   Admin: admin@stnpq.com / password123');
    console.log('   Repartidor: repartidor@stnpq.com / password123');
    console.log(`\n📦 Envíos creados:`);
    console.log(`   ${shipment1.rows[0].tracking_code} (En Sucursal)`);
    console.log(`   ${shipment2.rows[0].tracking_code} (En Camino)`);

  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase();
