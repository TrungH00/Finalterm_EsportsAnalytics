// FILE: routes/statRoutes.js
const express = require("express");
const router  = express.Router();
const { getKDA, getKDAByPlayer, getTeamAvg, getChampions } = require("../controllers/statController");

// GET /api/stats/kda                     → tất cả player
// GET /api/stats/kda/:playerId           → 1 player cụ thể
// GET /api/stats/team-avg                → tất cả team
// GET /api/stats/team-avg?tournament=... → filter theo tournament
router.get("/kda",            getKDA);
router.get("/kda/:playerId",  getKDAByPlayer);
router.get("/team-avg",       getTeamAvg);
router.get("/champions", getChampions);

module.exports = router;
