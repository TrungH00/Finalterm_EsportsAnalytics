// ============================================================
// FILE: controllers/statController.js
// MÔ TẢ: Gọi MongoDB Aggregation Pipeline
//        Đây là phần của Member B — ownership của bạn
//
// ENDPOINTS:
//   GET /api/stats/kda           → KDA tất cả player
//   GET /api/stats/kda/:playerId → KDA 1 player cụ thể
//   GET /api/stats/team-avg      → Hiệu suất team
//   GET /api/stats/team-avg?tournament=VPS Spring 2025
// ============================================================

const mongoose = require("mongoose");

// Lấy collection trực tiếp từ mongoose connection
function getCollection() {
  return mongoose.connection.db.collection("MatchStats");
}

// ── KDA PIPELINE (từ 02_pipeline_kda.js) ────────────────────
const kdaPipeline = [
  { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
  { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true } },
  { $match: { "teams.players": { $ne: null }, "teams.players.player_id": { $exists: true } } },
  {
    $group: {
      _id:           "$teams.players.player_id",
      name:          { $first: "$teams.players.name"       },
      role:          { $first: "$teams.players.role"       },
      team_name:     { $first: "$teams.team_name"          },
      total_matches: { $sum: 1                             },
      avg_kills:     { $avg: "$teams.players.kills"        },
      avg_deaths:    { $avg: "$teams.players.deaths"       },
      avg_assists:   { $avg: "$teams.players.assists"      },
      avg_gold:      { $avg: "$teams.players.gold_earned"  },
    },
  },
  {
    $addFields: {
      kda_score:   { $round: [{ $divide: [{ $add: ["$avg_kills", "$avg_assists"] }, { $max: ["$avg_deaths", 1] }] }, 2] },
      avg_kills:   { $round: ["$avg_kills",   2] },
      avg_deaths:  { $round: ["$avg_deaths",  2] },
      avg_assists: { $round: ["$avg_assists", 2] },
      avg_gold:    { $round: ["$avg_gold",    0] },
    },
  },
  { $sort: { kda_score: -1 } },
  { $project: { _id: 0, player_id: "$_id", name: 1, role: 1, team_name: 1, total_matches: 1, avg_kills: 1, avg_deaths: 1, avg_assists: 1, avg_gold: 1, kda_score: 1 } },
];

// ── TEAM AVG PIPELINE (từ 03_pipeline_team_avg.js) ───────────
const teamAvgPipeline = [
  { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
  { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true } },
  { $match: { "teams.players": { $ne: null }, "teams.players.player_id": { $exists: true } } },
  {
    $group: {
      _id:                  { team_id: "$teams.team_id", tournament: "$tournament" },
      team_name:            { $first: "$teams.team_name" },
      total_player_entries: { $sum: 1 },
      wins:                 { $sum: { $cond: [{ $eq: ["$teams.result", "win"] }, 1, 0] } },
      avg_kills:            { $avg: "$teams.players.kills"   },
      avg_deaths:           { $avg: "$teams.players.deaths"  },
      avg_assists:          { $avg: "$teams.players.assists" },
    },
  },
  {
    $addFields: {
      total_matches: { $round: [{ $divide: ["$total_player_entries", 5] }, 0] },
      win_rate: {
        $round: [
          { $divide: [
            { $divide: ["$wins", 5] },                        // wins thật = wins/5
            { $divide: ["$total_player_entries", 5] },        // total_matches
          ]},
          2,
        ],
      },
      avg_kills:     { $round: ["$avg_kills",   2] },
      avg_deaths:    { $round: ["$avg_deaths",  2] },
      avg_assists:   { $round: ["$avg_assists", 2] },
    },
  },
  { $sort: { win_rate: -1 } },
  {
    $project: {
      _id: 0, team_id: "$_id.team_id", tournament: "$_id.tournament",
      team_name: 1, total_matches: 1,
      wins: { $round: [{ $divide: ["$wins", 5] }, 0] },
      win_rate: 1, avg_kills: 1, avg_deaths: 1, avg_assists: 1,
    },
  },
];

// ── CONTROLLER FUNCTIONS ────────────────────────────────────

// GET /api/stats/kda
// Trả về KDA tất cả player, sắp xếp theo kda_score giảm dần
const getKDA = async (req, res) => {
  try {
    const collection = getCollection();
    const results    = await collection.aggregate(kdaPipeline).toArray();

    res.json({
      success: true,
      count:   results.length,
      data:    results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stats/kda/:playerId
// Trả về KDA của 1 player cụ thể
const getKDAByPlayer = async (req, res) => {
  try {
    const { playerId } = req.params;
    const collection   = getCollection();

    // Thêm $match lọc theo player_id vào đầu pipeline
    const filteredPipeline = [
      { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true } },
      { $match: { "teams.players.player_id": playerId } },
      ...kdaPipeline.slice(3), // bỏ 3 stage đầu, dùng từ $group trở đi
    ];

    const results = await collection.aggregate(filteredPipeline).toArray();

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy player: ${playerId}` });
    }

    res.json({ success: true, data: results[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stats/team-avg
// GET /api/stats/team-avg?tournament=VPS Spring 2025
// Trả về hiệu suất team, có thể filter theo tournament
const getTeamAvg = async (req, res) => {
  try {
    const { tournament } = req.query;
    const collection     = getCollection();

    // Nếu có query param tournament → thêm $match vào đầu pipeline
    const pipeline = tournament
      ? [{ $match: { tournament } }, ...teamAvgPipeline]
      : teamAvgPipeline;

    const results = await collection.aggregate(pipeline).toArray();

    res.json({
      success:    true,
      tournament: tournament || "all",
      count:      results.length,
      data:       results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stats/champions
// Trả về thống kê từng tướng (champion) qua tất cả trận
const getChampions = async (req, res) => {
  try {
    const collection = getCollection();
    const championPipeline = [
      { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true } },
      { $match: { "teams.players": { $ne: null }, "teams.players.champion": { $exists: true } } },
      { $group: {
          _id:          "$teams.players.champion",
          pick_count:   { $sum: 1 },
          win_count:    { $sum: { $cond: [{ $eq: ["$teams.result", "win"] }, 1, 0] } },
          avg_kills:    { $avg: "$teams.players.kills"   },
          avg_deaths:   { $avg: "$teams.players.deaths"  },
          avg_assists:  { $avg: "$teams.players.assists" },
          avg_gold:     { $avg: "$teams.players.gold_earned" },
          players_used: { $addToSet: "$teams.players.name" },
      }},
      { $addFields: {
          win_rate:    { $round: [{ $divide: ["$win_count", "$pick_count"] }, 2] },
          kda_score:   { $round: [{ $divide: [{ $add: ["$avg_kills", "$avg_assists"] }, { $max: ["$avg_deaths", 1] }] }, 2] },
          avg_kills:   { $round: ["$avg_kills",   2] },
          avg_deaths:  { $round: ["$avg_deaths",  2] },
          avg_assists: { $round: ["$avg_assists", 2] },
          avg_gold:    { $round: ["$avg_gold",    0] },
      }},
      { $sort: { pick_count: -1 } },
      { $project: { _id: 0, champion: "$_id", pick_count: 1, win_count: 1, win_rate: 1, kda_score: 1, avg_kills: 1, avg_deaths: 1, avg_assists: 1, avg_gold: 1, players_used: 1 } },
    ];
    const results = await collection.aggregate(championPipeline).toArray();
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getKDA, getKDAByPlayer, getTeamAvg, getChampions  };
