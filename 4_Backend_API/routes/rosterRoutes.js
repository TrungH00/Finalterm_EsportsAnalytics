// FILE: routes/rosterRoutes.js
const express = require("express");
const router  = express.Router();
const { registerPlayer, getRosters } = require("../controllers/rosterController");

// GET  /api/rosters           → roster list
// POST /api/rosters/register  → register new player
router.get("/",          getRosters);
router.post("/register", registerPlayer);

module.exports = router;
