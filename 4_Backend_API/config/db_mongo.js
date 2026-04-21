// ============================================================
// FILE: config/db_mongo.js
// MÔ TẢ: Kết nối MongoDB dùng Mongoose
// ============================================================

const mongoose = require("mongoose");

async function connectMongo() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
    const db  = process.env.MONGO_DB  || "esports_db";

    await mongoose.connect(`${uri}/${db}`);
    console.log("✓ Kết nối MongoDB thành công");
  } catch (err) {
    console.error("✗ Lỗi kết nối MongoDB:", err);
    throw err;
  }
}

module.exports = connectMongo;
