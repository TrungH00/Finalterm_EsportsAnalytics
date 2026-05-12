// ============================================================
// FILE: controllers/statController.js
// DESC: Call MongoDB Aggregation Pipeline
//       This belongs to Member B
//
// ENDPOINTS:
//   GET /api/stats/kda           → KDA for all players
//   GET /api/stats/kda/:playerId → KDA for one specific player
//   GET /api/stats/team-avg      → Team performance
//   GET /api/stats/team-avg?tournament=VPS Spring 2025
// ============================================================

const mongoose = require("mongoose");

// Get collection directly from mongoose connection
function getCollection() {
  return mongoose.connection.db.collection("MatchStats");
}

// ── KDA PIPELINE (from 02_pipeline_kda.js) ────────────────────
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

// ── TEAM AVG PIPELINE (from 03_pipeline_team_avg.js) ───────────
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
            { $divide: ["$wins", 5] },                        // actual wins = wins/5
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
// Return KDA for all players, sorted by kda_score descending
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
// Return KDA for a specific player
const getKDAByPlayer = async (req, res) => {
  try {
    const { playerId } = req.params;
    const collection   = getCollection();

    // Add $match filter by player_id at the start of the pipeline
    const filteredPipeline = [
      { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true } },
      { $match: { "teams.players.player_id": playerId } },
      ...kdaPipeline.slice(3), // skip first 3 stages, use from $group onward
    ];

    const results = await collection.aggregate(filteredPipeline).toArray();

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: `Player not found: ${playerId}` });
    }

    res.json({ success: true, data: results[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stats/team-avg
// GET /api/stats/team-avg?tournament=VPS Spring 2025
// Return team performance, filterable by tournament
const getTeamAvg = async (req, res) => {
  try {
    const { tournament } = req.query;
    const collection     = getCollection();

    // If tournament query param present → prepend $match to pipeline
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
// Return stats for each champion across all matches
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
