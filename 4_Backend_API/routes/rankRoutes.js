// FILE: routes/rankRoutes.js
const express = require("express");
const router  = express.Router();
const { getLeaderboard, getTeamRank } = require("../controllers/rankController");

// GET /api/rank/leaderboard           → global leaderboard
// GET /api/rank/leaderboard?season=1  → filter theo season
// GET /api/rank/teams                 → team ranking
// GET /api/rank/teams?team=1&season=1 → filter cụ thể
router.get("/leaderboard", getLeaderboard);
router.get("/teams",       getTeamRank);

module.exports = router;
