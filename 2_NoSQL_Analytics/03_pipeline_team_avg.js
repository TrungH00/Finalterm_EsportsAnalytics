const { MongoClient } = require("mongodb");

const URI = "mongodb://localhost:27017";
const DB_NAME = "esports_db";
const COLLECTION = "MatchStats";

// ============================================================
// FILE: 03_pipeline_team_avg.js
// DESC: Calculate average performance per team by tournament
//
// STAGES:
//   1. $unwind teams         → flatten teams[]
//   2. $unwind players       → flatten players[]
//   3. $match                → filter out empty edge cases
//   4. $group team+tournament→ group by team + tournament
//   5. $addFields            → compute total_matches, win_rate
//   6. $sort win_rate        → strongest team first
//   7. $project              → format output
// ============================================================

const pipeline = [
  // STAGE 1
  {
    $unwind: {
      path: "$teams",
      preserveNullAndEmptyArrays: false,
    },
  },

  // STAGE 2
  {
    $unwind: {
      path: "$teams.players",
      preserveNullAndEmptyArrays: true,
    },
  },

  // STAGE 3
  {
    $match: {
      "teams.players": { $ne: null },
      "teams.players.player_id": { $exists: true },
    },
  },

  // STAGE 4: Group by team_id + tournament
  // Why group by both fields?
  // → 1 team plays in multiple tournaments → need separate entries per tournament
  {
    $group: {
      _id: {
        team_id:    "$teams.team_id",
        tournament: "$tournament",
      },
      team_name:            { $first: "$teams.team_name" },
      total_player_entries: { $sum: 1 },
      wins: {
        $sum: { $cond: [{ $eq: ["$teams.result", "win"] }, 1, 0] },
      },
      avg_kills:   { $avg: "$teams.players.kills"        },
      avg_deaths:  { $avg: "$teams.players.deaths"       },
      avg_assists: { $avg: "$teams.players.assists"      },
      avg_gold:    { $avg: "$teams.players.gold_earned"  },
      avg_damage:  { $avg: "$teams.players.damage_dealt" },
    },
  },

  // STAGE 5: Compute total_matches and win_rate
  // total_player_entries = total_matches × 5 players
  // → total_matches = total_player_entries / 5
  {
    $addFields: {
      total_matches: {
        $round: [{ $divide: ["$total_player_entries", 5] }, 0],
      },
      actual_wins: {
        $round: [{ $divide: ["$wins", 5] }, 0],
      },
      win_rate: {
        $round: [
          { $divide: [
            { $divide: ["$wins", 5] },
            { $divide: ["$total_player_entries", 5] },
          ]},
          2,
        ],
      },
      avg_kills:   { $round: ["$avg_kills",   2] },
      avg_deaths:  { $round: ["$avg_deaths",  2] },
      avg_assists: { $round: ["$avg_assists", 2] },
      avg_gold:    { $round: ["$avg_gold",    0] },
      avg_damage:  { $round: ["$avg_damage",  0] },
    },
  },

  // STAGE 6: Sort win_rate descending
  { $sort: { win_rate: -1, avg_kills: -1 } },

  // STAGE 7
  {
    $project: {
      _id:           0,
      team_id:       "$_id.team_id",
      tournament:    "$_id.tournament",
      team_name:     1,
      total_matches: 1,
      wins:          { $round: [{ $divide: ["$wins", 5] }, 0] },
      win_rate:      1,
      avg_kills:     1,
      avg_deaths:    1,
      avg_assists:   1,
      avg_gold:      1,
      avg_damage:    1,
    },
  },
];

// Filter by tournament — $match placed BEFORE $unwind
function getPipelineByTournament(tournamentName) {
  return [
    { $match: { tournament: tournamentName } },
    ...pipeline,
  ];
}

async function runTeamAvgPipeline() {
  const client = new MongoClient(URI);
  try {
    await client.connect();

    const db         = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // ── ALL TOURNAMENTS ──────────────────────────────────────────────
    console.log("=".repeat(70));
    console.log("Team Stats — All tournaments");
    console.log("=".repeat(70));

    const results = await collection.aggregate(pipeline).toArray();
    console.log(`\nResults: ${results.length} groups (team × tournament)\n`);
    console.log("Tournament           | Team              | Matches | Wins | Win%  | K/D/A");
    console.log("─".repeat(80));

    results.forEach((r) => {
      const winPct = (r.win_rate * 100).toFixed(0) + "%";
      console.log(
        `${r.tournament.padEnd(20)} | ${r.team_name.padEnd(17)} | ${String(r.total_matches).padStart(7)} | ${String(r.wins).padStart(4)} | ${winPct.padStart(5)} | ${r.avg_kills}/${r.avg_deaths}/${r.avg_assists}`
      );
    });

    // ── VPS SPRING 2025 ONLY ─────────────────────────────────────────
    console.log("");
    console.log("=".repeat(70));
    console.log("Team Stats — VPS Spring 2025 only");
    console.log("($match placed before $unwind → optimized performance)");
    console.log("=".repeat(70));

    const vpsOnly = await collection
      .aggregate(getPipelineByTournament("VPS Spring 2025"))
      .toArray();

    vpsOnly.forEach((r) => {
      const winPct = (r.win_rate * 100).toFixed(0) + "%";
      console.log(
        `${r.team_name.padEnd(20)} | Matches: ${r.total_matches} | Wins: ${r.wins} | Win rate: ${winPct} | Avg K/D/A: ${r.avg_kills}/${r.avg_deaths}/${r.avg_assists}`
      );
    });

  } catch (err) {
    console.error("✗ Error:", err);
  } finally {
    await client.close();
  }
}

runTeamAvgPipeline();
