const { MongoClient } = require("mongodb");

const URI = "mongodb://localhost:27017";
const DB_NAME = "esports_db";
const COLLECTION = "MatchStats";

// ============================================================
// MOCK DATA — League of Legends
// 4 team: T1, Cloud9 (C9), Fnatic (FNC), G2 Esports (G2)
// 2 tournament: LCK Spring 2025, Worlds 2024
// 22 documents (20 trận + 2 edge cases)
// ============================================================

const teams = {
  T1: {
    team_id: "T1",
    team_name: "T1",
    players: [
      { player_id: "T101", name: "Zeus",      role: "Top"     },
      { player_id: "T102", name: "Oner",       role: "Jungle"  },
      { player_id: "T103", name: "Faker",      role: "Mid"     },
      { player_id: "T104", name: "Gumayusi",   role: "ADC"     },
      { player_id: "T105", name: "Keria",      role: "Support" },
    ],
  },
  C9: {
    team_id: "C9",
    team_name: "Cloud9",
    players: [
      { player_id: "C901", name: "Fudge",      role: "Top"     },
      { player_id: "C902", name: "Blaber",     role: "Jungle"  },
      { player_id: "C903", name: "EMENES",     role: "Mid"     },
      { player_id: "C904", name: "Berserker",  role: "ADC"     },
      { player_id: "C905", name: "Vulcan",     role: "Support" },
    ],
  },
  FNC: {
    team_id: "FNC",
    team_name: "Fnatic",
    players: [
      { player_id: "F101", name: "Wunder",     role: "Top"     },
      { player_id: "F102", name: "Razork",     role: "Jungle"  },
      { player_id: "F103", name: "Humanoid",   role: "Mid"     },
      { player_id: "F104", name: "Rekkles",    role: "ADC"     },
      { player_id: "F105", name: "Hylissang",  role: "Support" },
    ],
  },
  G2: {
    team_id: "G2",
    team_name: "G2 Esports",
    players: [
      { player_id: "G201", name: "BrokenBlade",role: "Top"     },
      { player_id: "G202", name: "Yike",       role: "Jungle"  },
      { player_id: "G203", name: "Caps",       role: "Mid"     },
      { player_id: "G204", name: "Hans Sama",  role: "ADC"     },
      { player_id: "G205", name: "Mikyx",      role: "Support" },
    ],
  },
};

const champions = [
  "Yasuo", "Zed", "Lee Sin", "Jinx", "Thresh",
  "Lulu", "Gragas", "Viktor", "Azir", "Caitlyn",
  "Blitzcrank", "Ahri", "Orianna", "Kai'Sa", "Nautilus",
  "Yone", "Vex", "Viego", "Xayah", "Rakan",
  "Akali", "Sylas", "Ezreal", "Leona", "Nidalee",
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickChampions(count, pool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function genPlayerStats(player, champion, isWinner) {
  return {
    player_id:    player.player_id,
    name:         player.name,
    role:         player.role,
    champion:     champion,
    kills:        isWinner ? rand(2, 14) : rand(0, 7),
    deaths:       isWinner ? rand(0, 5)  : rand(2, 9),
    assists:      rand(1, 18),
    gold_earned:  rand(8000, 18000),
    damage_dealt: rand(15000, 80000),
  };
}

function genMatch(matchId, teamAKey, teamBKey, tournament, date, winnerKey) {
  const teamADef  = teams[teamAKey];
  const teamBDef  = teams[teamBKey];
  const champPool = pickChampions(10, champions);

  return {
    match_id:         matchId,
    tournament:       tournament,
    date:             date,
    duration_minutes: rand(25, 45),
    teams: [
      {
        team_id:   teamADef.team_id,
        team_name: teamADef.team_name,
        result:    teamAKey === winnerKey ? "win" : "loss",
        players:   teamADef.players.map((p, i) =>
          genPlayerStats(p, champPool[i], teamAKey === winnerKey)
        ),
      },
      {
        team_id:   teamBDef.team_id,
        team_name: teamBDef.team_name,
        result:    teamBKey === winnerKey ? "win" : "loss",
        players:   teamBDef.players.map((p, i) =>
          genPlayerStats(p, champPool[i + 5], teamBKey === winnerKey)
        ),
      },
    ],
  };
}

// ============================================================
// 20 TRẬN CHÍNH
// ============================================================
const matches = [
  // LCK Spring 2025 — 12 trận
  genMatch("M001", "T1",  "C9",  "LCK Spring 2025", "2025-01-10", "T1"),
  genMatch("M002", "FNC", "G2",  "LCK Spring 2025", "2025-01-11", "G2"),
  genMatch("M003", "T1",  "FNC", "LCK Spring 2025", "2025-01-12", "T1"),
  genMatch("M004", "C9",  "G2",  "LCK Spring 2025", "2025-01-18", "C9"),
  genMatch("M005", "T1",  "G2",  "LCK Spring 2025", "2025-01-19", "G2"),
  genMatch("M006", "FNC", "C9",  "LCK Spring 2025", "2025-01-20", "FNC"),
  genMatch("M007", "T1",  "C9",  "LCK Spring 2025", "2025-01-25", "T1"),
  genMatch("M008", "G2",  "FNC", "LCK Spring 2025", "2025-01-26", "G2"),
  genMatch("M009", "T1",  "FNC", "LCK Spring 2025", "2025-02-01", "FNC"),
  genMatch("M010", "C9",  "G2",  "LCK Spring 2025", "2025-02-08", "G2"),
  genMatch("M011", "T1",  "G2",  "LCK Spring 2025", "2025-02-09", "T1"),
  genMatch("M012", "FNC", "C9",  "LCK Spring 2025", "2025-02-15", "C9"),

  // Worlds 2024 — 8 trận
  genMatch("M013", "T1",  "G2",  "Worlds 2024", "2024-10-15", "T1"),
  genMatch("M014", "C9",  "FNC", "Worlds 2024", "2024-10-16", "FNC"),
  genMatch("M015", "T1",  "FNC", "Worlds 2024", "2024-10-20", "T1"),
  genMatch("M016", "G2",  "C9",  "Worlds 2024", "2024-10-21", "G2"),
  genMatch("M017", "T1",  "C9",  "Worlds 2024", "2024-10-25", "T1"),
  genMatch("M018", "FNC", "G2",  "Worlds 2024", "2024-10-26", "FNC"),
  genMatch("M019", "T1",  "FNC", "Worlds 2024", "2024-11-02", "T1"),
  genMatch("M020", "G2",  "C9",  "Worlds 2024", "2024-11-03", "C9"),

  // EDGE CASE 1: players[] rỗng
  {
    match_id: "M021", tournament: "LCK Spring 2025", date: "2025-02-20",
    duration_minutes: 0,
    note: "EDGE CASE — trận bị hủy, players[] rỗng",
    teams: [
      { team_id: "T1",  team_name: "T1",     result: "no_contest", players: [] },
      { team_id: "FNC", team_name: "Fnatic", result: "no_contest", players: [] },
    ],
  },

  // EDGE CASE 2: kills=0, deaths=0
  {
    match_id: "M022", tournament: "Worlds 2024", date: "2024-11-05",
    duration_minutes: 22,
    note: "EDGE CASE — support có kills=0, deaths=0",
    teams: [
      {
        team_id: "T1", team_name: "T1", result: "win",
        players: [
          { player_id: "T101", name: "Zeus",    role: "Top",     champion: "Garen",   kills: 6,  deaths: 1, assists: 5,  gold_earned: 13000, damage_dealt: 40000 },
          { player_id: "T102", name: "Oner",    role: "Jungle",  champion: "Lee Sin", kills: 5,  deaths: 2, assists: 9,  gold_earned: 12000, damage_dealt: 30000 },
          { player_id: "T103", name: "Faker",   role: "Mid",     champion: "Ahri",    kills: 9,  deaths: 1, assists: 7,  gold_earned: 15000, damage_dealt: 55000 },
          { player_id: "T104", name: "Gumayusi",role: "ADC",     champion: "Jinx",    kills: 11, deaths: 0, assists: 4,  gold_earned: 16000, damage_dealt: 60000 },
          { player_id: "T105", name: "Keria",   role: "Support", champion: "Thresh",  kills: 0,  deaths: 0, assists: 18, gold_earned: 8000,  damage_dealt: 5000  },
        ],
      },
      {
        team_id: "G2", team_name: "G2 Esports", result: "loss",
        players: [
          { player_id: "G201", name: "BrokenBlade", role: "Top",     champion: "Jayce",   kills: 2, deaths: 4, assists: 3, gold_earned: 9000,  damage_dealt: 20000 },
          { player_id: "G202", name: "Yike",        role: "Jungle",  champion: "Nidalee", kills: 1, deaths: 5, assists: 4, gold_earned: 8500,  damage_dealt: 15000 },
          { player_id: "G203", name: "Caps",        role: "Mid",     champion: "Viktor",  kills: 3, deaths: 4, assists: 5, gold_earned: 11000, damage_dealt: 35000 },
          { player_id: "G204", name: "Hans Sama",   role: "ADC",     champion: "Xayah",   kills: 2, deaths: 5, assists: 3, gold_earned: 10000, damage_dealt: 25000 },
          { player_id: "G205", name: "Mikyx",       role: "Support", champion: "Rakan",   kills: 0, deaths: 3, assists: 6, gold_earned: 7000,  damage_dealt: 4000  },
        ],
      },
    ],
  },
];

async function seed() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    console.log("✓ Đã kết nối MongoDB");

    const db         = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    await collection.deleteMany({});
    console.log("✓ Đã xóa data cũ");

    const result = await collection.insertMany(matches);
    console.log(`✓ Insert thành công: ${result.insertedCount} documents`);

    const total = await collection.countDocuments();
    console.log(`✓ Tổng documents: ${total}`);
    console.log("─".repeat(50));
    console.log("Chạy tiếp: node 02_pipeline_kda.js");

  } catch (err) {
    console.error("✗ Lỗi:", err);
  } finally {
    await client.close();
  }
}

seed();