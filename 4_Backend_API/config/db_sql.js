// ============================================================
// FILE: config/db_sql.js
// MÔ TẢ: Kết nối MS SQL Server dùng thư viện mssql
//        Dùng connection pool để tái sử dụng kết nối
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
    max: 10,  // tối đa 10 kết nối đồng thời
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool dùng chung toàn app — không tạo mới mỗi request
let pool = null;

async function connectSQL() {
  try {
    pool = await sql.connect(config);
    console.log("✓ Kết nối MS SQL Server thành công");
    return pool;
  } catch (err) {
    console.error("✗ Lỗi kết nối SQL Server:", err);
    throw err;
  }
}

// Hàm lấy pool để dùng trong controller
function getPool() {
  if (!pool) throw new Error("SQL chưa được kết nối. Gọi connectSQL() trước.");
  return pool;
}

module.exports = connectSQL;
module.exports.getPool = getPool;
module.exports.sql     = sql;
