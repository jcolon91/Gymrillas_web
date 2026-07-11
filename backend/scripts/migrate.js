'use strict';
// Corre db/schema.sql contra la base configurada en .env
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'gymrillas',
    user: process.env.DB_USER || 'gymrillas_user',
    password: process.env.DB_PASS || '',
  });
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✓ Schema aplicado correctamente');
  } catch (e) {
    console.error('✗ Error al migrar:', e.message);
    process.exit(1);
  } finally { await pool.end(); }
})();
