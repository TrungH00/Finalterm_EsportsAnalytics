const { MongoClient } = require("mongodb");

const URI = "mongodb://localhost:27017";
const DB_NAME = "esports_db";
const COLLECTION = "MatchStats";

// ============================================================
// FILE: 02_pipeline_kda.js
// MÔ TẢ: Tính KDA trung bình từng player qua tất cả các trận
//
// KDA = (kills + assists) / max(deaths, 1)
//       max(deaths, 1) để tránh chia cho 0 — edge case M022
//
// STAGES:
//   1. $unwind teams       → flatten teams[] (1 doc → 2 docs)
//   2. $unwind players     → flatten players[] (1 doc → 5 docs)
//   3. $match              → loại bỏ edge case players rỗng
//   4. $group player_id    → gom theo player, tính avg stats
//   5. $addFields kda      → tính KDA score
//   6. $sort kda_score     → player giỏi nhất lên đầu
//   7. $project            → format output gọn
// ============================================================

const pipeline = [
  // STAGE 1: Flatten teams[]
  // Trước: { match_id: "M001", teams: [teamA, teamB] }
  // Sau:   2 documents — mỗi document chứa 1 team
  {
    $unwind: {
      path: "$teams",
      preserveNullAndEmptyArrays: false,
    },
  },

  // STAGE 2: Flatten players[] bên trong team
  // Trước: { teams: { players: [p1, p2, p3, p4, p5] } }
  // Sau:   5 documents — mỗi document chứa 1 player
  // preserveNullAndEmptyArrays: true → GIỮ document dù players[] rỗng
  {
    $unwind: {
      path: "$teams.players",
      preserveNullAndEmptyArrays: true,
    },
  },

  // STAGE 3: Lọc bỏ document không có player data (edge case M021)
  {
    $match: {
      "teams.players": { $ne: null },
      "teams.players.player_id": { $exists: true },
    },
  },

  // STAGE 4: Gom theo player_id, tính trung bình
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

  // STAGE 5: Tính KDA score
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

  // STAGE 6: Sắp xếp KDA giảm dần
  { $sort: { kda_score: -1 } },

  // STAGE 7: Chỉ giữ field cần thiết
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
// PIPELINE LỌC THEO TOURNAMENT
// $match đặt TRƯỚC $unwind → chỉ xử lý document thỏa điều kiện
// → performance tốt hơn nhiều khi collection lớn
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

    // ── VERIFY số documents qua từng stage ──────────────────
    console.log("=".repeat(60));
    console.log("VERIFY: Documents qua từng $unwind stage");
    console.log("=".repeat(60));

    const total = await collection.countDocuments();
    console.log(`Trước pipeline:       ${total} documents`);

    const afterTeams = await collection.aggregate([
      { $unwind: { path: "$teams", preserveNullAndEmptyArrays: false } },
    ]).toArray();
    console.log(`Sau $unwind teams:    ${afterTeams.length} documents  (${total} × 2 team)`);

    const afterPlayers = await collection.aggregate([
      { $unwind: { path: "$teams",         preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$teams.players", preserveNullAndEmptyArrays: true  } },
    ]).toArray();
    console.log(`Sau $unwind players:  ${afterPlayers.length} documents  (× 5 player/team)`);

    // ── CHẠY PIPELINE CHÍNH ─────────────────────────────────
    console.log("");
    console.log("=".repeat(60));
    console.log("KDA Leaderboard — Tất cả tournament");
    console.log("=".repeat(60));

    const results = await collection.aggregate(pipeline).toArray();
    console.log(`\nTổng player: ${results.length}\n`);
    console.log("Rank | Player          | Team              | Role    | Matches | K     | D     | A     | KDA");
    console.log("─".repeat(100));

    results.forEach((p, i) => {
      console.log(
        `${String(i+1).padStart(4)} | ${p.name.padEnd(15)} | ${p.team_name.padEnd(17)} | ${(p.role||"").padEnd(7)} | ${String(p.total_matches).padStart(7)} | ${String(p.avg_kills).padStart(5)} | ${String(p.avg_deaths).padStart(5)} | ${String(p.avg_assists).padStart(5)} | ${p.kda_score}`
      );
    });

    // ── FILTER THEO TOURNAMENT ──────────────────────────────
    console.log("");
    console.log("=".repeat(60));
    console.log("KDA Leaderboard — Chỉ VPS Spring 2025");
    console.log("=".repeat(60));

    const vpsOnly = await collection
      .aggregate(getPipelineByTournament("VPS Spring 2025"))
      .toArray();

    vpsOnly.slice(0, 5).forEach((p, i) => {
      console.log(`${i+1}. ${p.name} (${p.team_name}) — KDA: ${p.kda_score}`);
    });

  } catch (err) {
    console.error("✗ Lỗi:", err);
  } finally {
    await client.close();
  }
}

runKDAPipeline();
