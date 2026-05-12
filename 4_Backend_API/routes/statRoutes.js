// FILE: routes/statRoutes.js
const express = require("express");
const router  = express.Router();
const { getKDA, getKDAByPlayer, getTeamAvg, getChampions } = require("../controllers/statController");

// GET /api/stats/kda                     → all players
// GET /api/stats/kda/:playerId           → one specific player
// GET /api/stats/team-avg                → all teams
// GET /api/stats/team-avg?tournament=... → filter by tournament
router.get("/kda",            getKDA);
router.get("/kda/:playerId",  getKDAByPlayer);
router.get("/team-avg",       getTeamAvg);
router.get("/champions", getChampions);

module.exports = router;
