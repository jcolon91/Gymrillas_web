'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'gymrillas',
  user: process.env.DB_USER || 'gymrillas_user',
  password: process.env.DB_PASS || '',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] error inesperado en cliente idle:', err.message);
});

// Helper de query
function query(text, params) {
  return pool.query(text, params);
}

// Helper de transacción: cb(client) -> commit/rollback automático
async function tx(cb) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await cb(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
