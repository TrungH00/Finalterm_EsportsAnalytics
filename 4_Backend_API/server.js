// ============================================================
// FILE: server.js
// DESC: Entry point — start Express server
//       Connect SQL + MongoDB, register routes
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
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));                    // allow Frontend to call API
app.use(express.json());            // parse JSON body

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

// ── Start server ──────────────────────────────────────────────
async function startServer() {
  try {
    // Connect both databases before listening
    await connectSQL();
    await connectMongo();

    app.listen(PORT, () => {
      console.log("=".repeat(50));
      console.log(`✓ Server running at http://localhost:${PORT}`);
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
