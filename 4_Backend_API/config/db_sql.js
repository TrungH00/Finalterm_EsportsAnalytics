// ============================================================
// FILE: config/db_sql.js
// DESC: Connect to MS SQL Server using mssql library
//       Use connection pool for reuse
// ============================================================

const sql = require("mssql");

const config = {
  server: "localhost",
  database: process.env.SQL_DATABASE || "esports_db",
  user:     process.env.SQL_USER     || "sa",
  password: process.env.SQL_PASSWORD || "123456789",
  port:    1433,
  options: {
    encrypt:                false,  // true if using Azure
    trustServerCertificate: true,   // allow self-signed cert locally
    instanceName:           "SQLEXPRESS",
  },
  pool: {
    max: 10,  // max 10 concurrent connections
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Shared pool across the app — not recreated per request
let pool = null;

async function connectSQL() {
  try {
    pool = await sql.connect(config);
    console.log("✓ Connected to MS SQL Server");
    return pool;
  } catch (err) {
    console.error("✗ SQL Server connection error:", err);
    throw err;
  }
}

// Get pool for use in controllers
function getPool() {
  if (!pool) throw new Error("SQL not connected. Call connectSQL() first.");
  return pool;
}

module.exports = connectSQL;
module.exports.getPool = getPool;
module.exports.sql     = sql;
