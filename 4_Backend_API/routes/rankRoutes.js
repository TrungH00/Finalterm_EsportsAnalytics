// FILE: routes/rankRoutes.js
const express = require("express");
const router  = express.Router();
const { getLeaderboard, getTeamRank } = require("../controllers/rankController");

// GET /api/rank/leaderboard           → global leaderboard
// GET /api/rank/leaderboard?season=1  → filter by season
// GET /api/rank/teams                 → team ranking
// GET /api/rank/teams?team=1&season=1 → filter by team and season
router.get("/leaderboard", getLeaderboard);
router.get("/teams",       getTeamRank);

module.exports = router;
