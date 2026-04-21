// ============================================================
// FILE: controllers/rosterController.js
// MÔ TẢ: Gọi sp_register_player Stored Procedure của Member C
//
// ENDPOINTS:
//   POST /api/rosters/register  → đăng ký player vào roster
//   GET  /api/rosters           → lấy danh sách roster
// ============================================================

const { getPool, sql } = require("../config/db_sql");

// POST /api/rosters/register
// Body: { player_id, team_id, season_id, jersey_number }
const registerPlayer = async (req, res) => {
  try {
    const { player_id, team_id, season_id, jersey_number, is_starter } = req.body;

    // Validate input
    if (!player_id || !team_id || !season_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin: player_id, team_id, season_id là bắt buộc.",
      });
    }

    const pool    = getPool();
    const request = pool.request();

    // Input parameters
    request.input("player_id",     sql.Int, player_id);
    request.input("team_id",       sql.Int, team_id);
    request.input("season_id",     sql.Int, season_id);
    request.input("jersey_number", sql.Int, jersey_number || null);
    request.input("is_starter",    sql.Bit, is_starter !== undefined ? is_starter : 1);

    // Output parameters — nhận kết quả từ SP
    request.output("success",   sql.Bit);
    request.output("message",   sql.NVarChar(500));
    request.output("roster_id", sql.Int);

    const result = await request.execute("sp_register_player");

    const ok       = result.output.success;
    const message  = result.output.message;
    const rosterId = result.output.roster_id;

    if (ok) {
      res.status(201).json({ success: true,  message, roster_id: rosterId });
    } else {
      res.status(400).json({ success: false, message });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rosters
// Lấy danh sách roster hiện tại
const getRosters = async (req, res) => {
  try {
    const pool    = getPool();
    const request = pool.request();

    const result = await request.query(`
      SELECT
        r.roster_id,
        p.nickname   AS player,
        p.role,
        t.team_name  AS team,
        s.season_name AS season,
        r.jersey_number,
        r.is_starter
      FROM Rosters r
      JOIN Players p ON r.player_id = p.player_id
      JOIN Teams   t ON r.team_id   = t.team_id
      JOIN Seasons s ON r.season_id = s.season_id
      ORDER BY s.season_name, t.team_name, r.jersey_number;
    `);

    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { registerPlayer, getRosters };
