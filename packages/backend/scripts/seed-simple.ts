import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'stnpq',
  user: process.env.POSTGRES_USER || 'stnpq_user',
  password: process.env.POSTGRES_PASSWORD || 'stnpq_pass',
});

async function seedSimple() {
  console.log('🌱 Iniciando seed simplificado...');

  try {
    const passwordHash = await bcrypt.hash('password123', 12);
    
    // 1. Usuarios
    console.log('📝 Creando usuarios...');
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
      ['usuario@test.com', passwordHash, 'Juan Pérez', 'user', '+54 11 1234-5678', 50000]
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name`,
      ['admin@stnpq.com', passwordHash, 'Admin STN PQ', 'admin', '+54 11 9999-0000', 0]
    );

    console.log(`✅ Usuarios: usuario@test.com, admin@stnpq.com`);

    // 2. Sucursales
    console.log('🏢 Creando sucursales...');
    const branchResult = await pool.query(
      `INSERT INTO branches (name, address, lat, lng, is_active, created_at)
       VALUES 
         ('Sucursal Centro', 'Av. Corrientes 1234, Buenos Aires, CABA', -34.6037, -58.3816, true, NOW()),
         ('Sucursal Norte', 'Av. Cabildo 2500, Buenos Aires, CABA', -34.5601, -58.4601, true, NOW())
       RETURNING id`
    );
    const branchIds = branchResult.rows.map(r => r.id);
    console.log(`✅ Sucursales creadas: ${branchIds.length}`);

    // 3. Repartidor
    console.log('🚚 Creando repartidor...');
    await pool.query(
      `INSERT INTO couriers (email, password_hash, full_name, phone, is_available, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (email) DO UPDATE SET is_available = true`,
      ['repartidor@stnpq.com', passwordHash, 'Carlos Repartidor', '+54 11 5555-1234']
    );
    console.log(`✅ Repartidor creado`);

    console.log('\n✨ Seed completado!\n');
    console.log('📧 Credenciales:');
    console.log('   Usuario: usuario@test.com / password123');
    console.log('   Admin: admin@stnpq.com / password123');
    console.log('   Repartidor: repartidor@stnpq.com / password123');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedSimple();
