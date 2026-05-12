// ============================================================
// FILE: config/db_mongo.js
// Description: Connect to MongoDB using Mongoose
// ============================================================

const mongoose = require("mongoose");

async function connectMongo() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
    const db  = process.env.MONGO_DB  || "esports_db";

    await mongoose.connect(`${uri}/${db}`);
    console.log("✓ Connected to MongoDB successfully");
  } catch (err) {
    console.error("✗ MongoDB connection error:", err);
    throw err;
  }
}

module.exports = connectMongo;
