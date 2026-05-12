const { MongoClient } = require("mongodb");

const URI = "mongodb://localhost:27017";
const DB_NAME = "esports_db";
const COLLECTION = "MatchStats";

// ============================================================
// FILE: 02_pipeline_kda.js
// DESC: Calculate average KDA per player across all matches
//
// KDA = (kills + assists) / max(deaths, 1)
//       max(deaths, 1) to avoid division by zero — edge case M022
//
// STAGES:
//   1. $unwind teams       → flatten teams[] (1 doc → 2 docs)
//   2. $unwind players     → flatten players[] (1 doc → 5 docs)
//   3. $match              → filter out empty players edge cases
//   4. $group player_id    → group by player, compute avg stats
//   5. $addFields kda      → compute KDA score
//   6. $sort kda_score     → best player first
//   7. $project            → format output
// ============================================================

const pipeline = [
  // STAGE 1: Flatten teams[]
  // Before: { match_id: "M001", teams: [teamA, teamB] }
  // After:  2 documents — each document contains 1 team
  {
    $unwind: {
      path: "$teams",
      preserveNullAndEmptyArrays: false,
    },
  },

  // STAGE 2: Flatten players[] inside each team
  // Before: { teams: { players: [p1, p2, p3, p4, p5] } }
  // After:  5 documents — each document contains 1 player
  // preserveNullAndEmptyArrays: true → KEEP document even if players[] is empty
  {
    $unwind: {
      path: "$teams.players",
      preserveNullAndEmptyArrays: true,
    },
  },

  // STAGE 3: Filter out documents with no player data (edge case M021)
  {
    $match: {
      "teams.players": { $ne: null },
      "teams.players.player_id": { $exists: true },
    },
  },

  // STAGE 4: Group by player_id, compute averages
  {
    $group: {
      _id:           "$teams.players.player_id",
      name:          { $first: "$teams.players.name"         },
      role:          { $first: "$teams.players.role"         },
      team_id:       { $first: "$teams.team_id"              },
      team_name:     { $first: "$teams.team_name"            },
      total_matches: { $sum: 1                               },
      avg_kills:     { $avg: "$teams.players.kills"          },
      avg_deaths:    { $avg: "$teams.players.deaths"         },
      avg_assists:   { $avg: "$teams.players.assists"        },
      avg_gold:      { $avg: "$teams.players.gold_earned"    },
      avg_damage:    { $avg: "$teams.players.damage_dealt"   },
      total_kills:   { $sum: "$teams.players.kills"          },
    },
  },

  // STAGE 5: Compute KDA score
  // KDA = (avg_kills + avg_assists) / max(avg_deaths, 1)
  {
    $addFields: {
      kda_score: {
        $round: [
          { $divide: [
            { $add: ["$avg_kills", "$avg_assists"] },
            { $max:  ["$avg_deaths", 1] },
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

  // STAGE 6: Sort KDA descending
  { $sort: { kda_score: -1 } },

  // STAGE 7: Keep only required fields
  {
    $project: {
      _id:           0,
      player_id:     "$_id",
      name:          1,
      role:          1,
      team_name:     1,
      total_matches: 1,
      avg_kills:     1,
      avg_deaths:    1,
      avg_assists:   1,
      avg_gold:      1,
      avg_damage:    1,
      kda_score:     1,
    },
  },
];

// ============================================================
// PIPELINE FILTER BY TOURNAMENT
// $match placed BEFORE $unwind → only processes matching documents
// → much better performance on large collections
// ============================================================
function getPipelineByTournament(tournamentName) {
  return [
    { $match: { tournament: tournamentName } },
    ...pipeline,
  ];
}

async function runKDAPipeline() {
  const client = new MongoClient(URI);
  try {
    await client.connect();

    const db         = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // ── VERIFY document count through each stage ────────────────────
    console.log("=".repeat(60));
    console.log("VERIFY: Documents through each $unwind stage");
    console.log("=".repeat(60));

    const total = await collection.countDocuments();
    console.log(`Before pipeline:      ${total} documents`);

    const afterTeams = await collection.aggregate([
      { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
    ]).toArray();
    console.log(`After $unwind teams:  ${afterTeams.length} documents  (${total} × 2 teams)`);

    const afterPlayers = await collection.aggregate([
      { $unwind: { path: "$teams",         preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true  } },
    ]).toArray();
    console.log(`After $unwind players:${afterPlayers.length} documents  (× 5 players/team)`);

    // ── RUN MAIN PIPELINE ──────────────────────────────────────────
    console.log("");
    console.log("=".repeat(60));
    console.log("KDA Leaderboard — All tournaments");
    console.log("=".repeat(60));

    const results = await collection.aggregate(pipeline).toArray();
    console.log(`\nTotal players: ${results.length}\n`);
    console.log("Rank | Player          | Team              | Role    | Matches | K     | D     | A     | KDA");
    console.log("─".repeat(100));

    results.forEach((p, i) => {
      console.log(
        `${String(i+1).padStart(4)} | ${p.name.padEnd(15)} | ${p.team_name.padEnd(17)} | ${(p.role||"").padEnd(7)} | ${String(p.total_matches).padStart(7)} | ${String(p.avg_kills).padStart(5)} | ${String(p.avg_deaths).padStart(5)} | ${String(p.avg_assists).padStart(5)} | ${p.kda_score}`
      );
    });

    // ── FILTER BY TOURNAMENT ───────────────────────────────────────
    console.log("");
    console.log("=".repeat(60));
    console.log("KDA Leaderboard — VPS Spring 2025 only");
    console.log("=".repeat(60));

    const vpsOnly = await collection
      .aggregate(getPipelineByTournament("VPS Spring 2025"))
      .toArray();

    vpsOnly.slice(0, 5).forEach((p, i) => {
      console.log(`${i+1}. ${p.name} (${p.team_name}) — KDA: ${p.kda_score}`);
    });

  } catch (err) {
    console.error("✗ Error:", err);
  } finally {
    await client.close();
  }
}

runKDAPipeline();
