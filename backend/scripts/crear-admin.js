'use strict';
// Crea o actualiza un admin. Uso: node scripts/crear-admin.js email password "Nombre"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const [,, email, password, nombre] = process.argv;
if (!email || !password) {
  console.log('Uso: node scripts/crear-admin.js <email> <password> [nombre]');
  process.exit(1);
}
(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'gymrillas', user: process.env.DB_USER || 'gymrillas_user',
    password: process.env.DB_PASS || '',
  });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, email_verificado)
       VALUES ($1,$2,$3,'admin',TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash=$3, rol='admin'`,
      [nombre || 'Admin', email.toLowerCase(), hash]);
    console.log('✓ Admin listo:', email);
  } catch (e) { console.error('✗', e.message); process.exit(1); }
  finally { await pool.end(); }
})();
