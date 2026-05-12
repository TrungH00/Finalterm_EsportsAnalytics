const { MongoClient } = require("mongodb");

const URI = "mongodb://localhost:27017";
const DB_NAME = "esports_db";
const COLLECTION = "MatchStats";

// ============================================================
// FILE: 04_pipeline_champions.js
// DESC: Calculate stats for each champion across all matches
//
// STAGES:
//   1. $unwind teams       → flatten teams[]
//   2. $unwind players     → flatten players[]
//   3. $match              → filter out empty edge cases
//   4. $group champion     → group by champion name
//   5. $addFields          → compute avg stats + pick rate
//   6. $sort pick_count    → most picked champion first
//   7. $project            → format output
// ============================================================

const pipeline = [
  // STAGE 1
  { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },

  // STAGE 2
  { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true } },

  // STAGE 3
  {
    $match: {
      "teams.players": { $ne: null },
      "teams.players.player_id": { $exists: true },
      "teams.players.champion": { $exists: true },
    },
  },

  // STAGE 4: Group by champion
  {
    $group: {
      _id:        "$teams.players.champion",
      pick_count: { $sum: 1 },
      win_count: {
        $sum: { $cond: [{ $eq: ["$teams.result", "win"] }, 1, 0] },
      },
      avg_kills:   { $avg: "$teams.players.kills"   },
      avg_deaths:  { $avg: "$teams.players.deaths"  },
      avg_assists: { $avg: "$teams.players.assists" },
      avg_gold:    { $avg: "$teams.players.gold_earned" },
      // Collect names of players who used this champion
      players_used: { $addToSet: "$teams.players.name" },
    },
  },

  // STAGE 5: Compute win rate and KDA
  {
    $addFields: {
      win_rate: {
        $round: [{ $divide: ["$win_count", "$pick_count"] }, 2],
      },
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
    },
  },

  // STAGE 6: Sort by pick_count descending
  { $sort: { pick_count: -1 } },

  // STAGE 7
  {
    $project: {
      _id:          0,
      champion:     "$_id",
      pick_count:   1,
      win_count:    1,
      win_rate:     1,
      kda_score:    1,
      avg_kills:    1,
      avg_deaths:   1,
      avg_assists:  1,
      avg_gold:     1,
      players_used: 1,
    },
  },
];

async function runChampionsPipeline() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db         = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    console.log("=".repeat(60));
    console.log("Champions Analytics — Pick Rate & Win Rate");
    console.log("=".repeat(60));

    const results = await collection.aggregate(pipeline).toArray();
    console.log(`\nTotal champions: ${results.length}\n`);
    console.log("Champion         | Picks | Wins | Win%  | KDA  | Avg K/D/A");
    console.log("─".repeat(70));

    results.forEach((c) => {
      const winPct = (c.win_rate * 100).toFixed(0) + "%";
      console.log(
        `${c.champion.padEnd(16)} | ${String(c.pick_count).padStart(5)} | ${String(c.win_count).padStart(4)} | ${winPct.padStart(5)} | ${String(c.kda_score).padStart(4)} | ${c.avg_kills}/${c.avg_deaths}/${c.avg_assists}`
      );
    }); 

  } catch (err) {
    console.error("✗ Error:", err);
  } finally {
    await client.close();
  }
}

runChampionsPipeline();