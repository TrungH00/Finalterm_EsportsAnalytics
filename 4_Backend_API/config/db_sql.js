// ============================================================
// FILE: config/db_sql.js
// Description: Connect to MS SQL Server using mssql library
//        Uses connection pool to reuse connections
// ============================================================

const sql = require("mssql");

const config = {
  server: "localhost",
  database: process.env.SQL_DATABASE || "esports_db",
  user:     process.env.SQL_USER     || "sa",
  password: process.env.SQL_PASSWORD || "123456789",
  port:    1433,
  options: {
    encrypt:                false,  // true nếu dùng Azure
    trustServerCertificate: true,   // cho phép cert tự ký ở local
    instanceName:           "SQLEXPRESS",
  },
  pool: {
    max: 10,  // maximum 10 concurrent connections
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool dùng chung toàn app — không tạo mới mỗi request
let pool = null;

async function connectSQL() {
  try {
    pool = await sql.connect(config);
    console.log("✓ Connected to MS SQL Server successfully");
    return pool;
  } catch (err) {
    console.error("✗ SQL Server connection error:", err);
    throw err;
  }
}

// Hàm lấy pool để dùng trong controller
function getPool() {
  if (!pool) throw new Error("SQL has not been connected. Call connectSQL() first.");
  return pool;
}

module.exports = connectSQL;
module.exports.getPool = getPool;
module.exports.sql     = sql;
