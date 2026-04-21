// FILE: routes/rosterRoutes.js
const express = require("express");
const router  = express.Router();
const { registerPlayer, getRosters } = require("../controllers/rosterController");

// GET  /api/rosters           → danh sách roster
// POST /api/rosters/register  → đăng ký player mới
router.get("/",          getRosters);
router.post("/register", registerPlayer);

module.exports = router;
