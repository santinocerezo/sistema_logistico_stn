import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'stnpq',
  user: process.env.POSTGRES_USER || 'stnpq_user',
  password: process.env.POSTGRES_PASSWORD || 'stnpq_pass',
});

// Ordenadas aproximadamente por distancia al Obelisco (-34.6037, -58.3816)
const branches = [
  // ── CABA ────────────────────────────────────────────────────────────────────
  {
    name: 'Sucursal Centro',
    address: 'Av. Corrientes 1234, CABA',
    lat: -34.6037, lng: -58.3816,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Microcentro',
    address: 'Florida 500, CABA',
    lat: -34.6026, lng: -58.3756,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Recoleta',
    address: 'Av. del Libertador 1700, CABA',
    lat: -34.5874, lng: -58.3929,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal San Telmo',
    address: 'Defensa 900, CABA',
    lat: -34.6213, lng: -58.3694,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Palermo',
    address: 'Av. Santa Fe 3200, CABA',
    lat: -34.5888, lng: -58.4068,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal La Boca',
    address: 'Av. Pedro de Mendoza 1835, CABA',
    lat: -34.6365, lng: -58.3607,
    schedule: 'Lun–Vie 9:00–18:00 · Sáb 9:00–13:00',
  },
  {
    name: 'Sucursal Caballito',
    address: 'Av. Rivadavia 5000, CABA',
    lat: -34.6185, lng: -58.4463,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Belgrano',
    address: 'Av. Cabildo 2500, CABA',
    lat: -34.5601, lng: -58.4601,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Villa del Parque',
    address: 'Av. San Martín 4000, CABA',
    lat: -34.5978, lng: -58.5049,
    schedule: 'Lun–Vie 9:00–19:00 · Sáb 9:00–13:00',
  },
  // ── GBA ─────────────────────────────────────────────────────────────────────
  {
    name: 'Sucursal Lomas de Zamora',
    address: 'Belgrano 500, Lomas de Zamora, Buenos Aires',
    lat: -34.7548, lng: -58.4028,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Quilmes',
    address: 'Hipólito Yrigoyen 340, Quilmes, Buenos Aires',
    lat: -34.7198, lng: -58.2529,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal La Matanza',
    address: 'Av. Rivadavia 14000, La Matanza, Buenos Aires',
    lat: -34.6763, lng: -58.6015,
    schedule: 'Lun–Vie 8:00–19:00 · Sáb 9:00–13:00',
  },
  {
    name: 'Sucursal San Isidro',
    address: 'Av. del Libertador 16500, San Isidro, Buenos Aires',
    lat: -34.4727, lng: -58.5286,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Tigre',
    address: 'Av. Cazón 75, Tigre, Buenos Aires',
    lat: -34.4264, lng: -58.5796,
    schedule: 'Lun–Vie 8:00–19:00 · Sáb 9:00–13:00',
  },
  // ── Interior ────────────────────────────────────────────────────────────────
  {
    name: 'Sucursal Mar del Plata',
    address: 'San Martín 2800, Mar del Plata, Buenos Aires',
    lat: -37.9922, lng: -57.5533,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Rosario',
    address: 'Córdoba 1080, Rosario, Santa Fe',
    lat: -32.9442, lng: -60.6505,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Córdoba Capital',
    address: 'Av. Colón 80, Córdoba Capital',
    lat: -31.4135, lng: -64.1811,
    schedule: 'Lun–Vie 8:00–20:00 · Sáb 9:00–14:00',
  },
  {
    name: 'Sucursal Mendoza',
    address: 'Av. San Martín 1143, Mendoza Capital',
    lat: -32.8895, lng: -68.8458,
    schedule: 'Lun–Vie 8:00–19:00 · Sáb 9:00–13:00',
  },
];

async function seedBranches() {
  console.log('🏢 Insertando sucursales...\n');

  let inserted = 0;
  let skipped = 0;

  for (const b of branches) {
    const result = await pool.query(
      `INSERT INTO branches (name, address, lat, lng, schedule, is_active, created_at)
       SELECT $1::varchar, $2::varchar, $3::decimal, $4::decimal, $5::text, true, NOW()
       WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = $1::varchar)`,
      [b.name, b.address, b.lat, b.lng, b.schedule]
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`  ✅ ${b.name}`);
      inserted++;
    } else {
      console.log(`  ⏭️  ${b.name} (ya existe)`);
      skipped++;
    }
  }

  console.log(`\n✨ Listo. ${inserted} insertadas, ${skipped} ya existían.`);
}

seedBranches()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => pool.end());
