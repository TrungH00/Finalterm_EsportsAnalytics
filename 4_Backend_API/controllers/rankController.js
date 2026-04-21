// ============================================================
// FILE: controllers/rankController.js
// MÔ TẢ: Gọi SQL DENSE_RANK query và sp_get_team_stats
//        Đây là phần của Member A
//
// ENDPOINTS:
//   GET /api/rank/leaderboard           → player leaderboard
//   GET /api/rank/leaderboard?season=1  → lọc theo season
//   GET /api/rank/teams                 → team stats
//   GET /api/rank/teams?team=1&season=1 → lọc cụ thể
// ============================================================

const { getPool, sql } = require("../config/db_sql");

// GET /api/rank/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { season } = req.query;
    const pool       = getPool();
    const request    = pool.request();

    // Query DENSE_RANK — lọc theo season nếu có
    let query = `
      WITH PlayerWinStats AS (
        SELECT
          p.player_id, p.nickname, p.role, t.team_name,
          COUNT(DISTINCT m.match_id) AS total_matches,
          SUM(CASE WHEN r.team_id = m.team_winner_id THEN 1 ELSE 0 END) AS total_wins
        FROM Players p
        JOIN Rosters r ON p.player_id = r.player_id
        JOIN Teams   t ON r.team_id   = t.team_id
        JOIN Matches m ON (r.team_id  = m.team_winner_id OR r.team_id = m.team_loser_id)
        WHERE m.season_id = r.season_id
        ${season ? "AND m.season_id = @season_id" : ""}
        GROUP BY p.player_id, p.nickname, p.role, t.team_name
      ),
      PlayerWinRate AS (
        SELECT *, CAST(total_wins AS FLOAT) / NULLIF(total_matches, 0) AS win_rate
        FROM PlayerWinStats
      )
      SELECT
        DENSE_RANK() OVER (ORDER BY win_rate DESC) AS rank,
        nickname, team_name, role,
        total_matches, total_wins,
        ROUND(win_rate * 100, 1) AS win_rate_pct
      FROM PlayerWinRate
      ORDER BY win_rate DESC, nickname;
    `;

    if (season) request.input("season_id", sql.Int, parseInt(season));

    const result = await request.query(query);

    res.json({
      success: true,
      season:  season || "all",
      count:   result.recordset.length,
      data:    result.recordset,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/rank/teams
const getTeamRank = async (req, res) => {
  try {
    const { team, season } = req.query;
    const pool             = getPool();
    const request          = pool.request();

    // Gọi Stored Procedure sp_get_team_stats của Member C
    if (team)   request.input("team_id",   sql.Int, parseInt(team));
    if (season) request.input("season_id", sql.Int, parseInt(season));

    const result = await request.execute("sp_get_team_stats");

    res.json({
      success: true,
      count:   result.recordset.length,
      data:    result.recordset,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getLeaderboard, getTeamRank };
