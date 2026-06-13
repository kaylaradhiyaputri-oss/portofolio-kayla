const sql = require('mssql/msnodesqlv8');

// SQL Server connection config
// Using msnodesqlv8 driver — supports shared memory / named pipes (no TCP needed)
const connString = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost\\SQLEXPRESS;Database=portfolio_db;Trusted_Connection=yes;TrustServerCertificate=yes;';

const config = {
  connectionString: connString,
  driver: 'msnodesqlv8',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('[DB] Connected to SQL Server (msnodesqlv8) — portfolio_db');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Make sure:');
    console.error('   1. SQL Server is running');
    console.error('   2. Database "portfolio_db" exists (run server/database.sql first)');
    pool = null;
    throw err;
  }
  return pool;
}

async function query(sqlText, params = {}) {
  const p = await getPool();
  const request = p.request();
  for (const [key, val] of Object.entries(params)) {
    request.input(key, val);
  }
  return request.query(sqlText);
}

module.exports = { sql, getPool, query };
