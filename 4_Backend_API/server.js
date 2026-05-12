// ============================================================
// FILE: server.js
// Description: Express server entry point
//        Connects to SQL + MongoDB, registers routes
// ============================================================

require("dotenv").config();
const express = require("express");
const cors    = require("cors");

// Import database connections
const connectSQL   = require("./config/db_sql");
const connectMongo = require("./config/db_mongo");

// Import routes
const rosterRoutes = require("./routes/rosterRoutes");
const rankRoutes   = require("./routes/rankRoutes");
const statRoutes   = require("./routes/statRoutes");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));                    // Allow frontend to call API
app.use((req, res, next) => {
  res.set("Content-Type", "application/json; charset=utf-8");
  next();
});
app.use(express.json({ charset: "utf-8" }));            // Parse JSON body

// ── Routes ──────────────────────────────────────────────────
// /api/rosters  → rosterController  → sp_register_player (SQL)
// /api/rank     → rankController    → DENSE_RANK query   (SQL)
// /api/stats    → statController    → MongoDB pipeline   (NoSQL)
app.use("/api/rosters", rosterRoutes);
app.use("/api/rank",    rankRoutes);
app.use("/api/stats",   statRoutes);

// ── Health check ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "Esports Analytics API is running!",
    endpoints: {
      leaderboard:  "GET  /api/rank/leaderboard",
      teamStats:    "GET  /api/rank/teams",
      kdaAnalytics: "GET  /api/stats/kda",
      teamAnalytics:"GET  /api/stats/team-avg",
      register:     "POST /api/rosters/register",
    },
  });
});

// ── Khởi động server ────────────────────────────────────────
async function startServer() {
  try {
    // Connect both databases before listening
    await connectSQL();
    await connectMongo();

    app.listen(PORT, () => {
      console.log("=".repeat(50));
      console.log(`✓ Server is running at http://localhost:${PORT}`);
      console.log(`✓ SQL Server  : connected`);
      console.log(`✓ MongoDB     : connected`);
      console.log("=".repeat(50));
    });
  } catch (err) {
    console.error("✗ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
