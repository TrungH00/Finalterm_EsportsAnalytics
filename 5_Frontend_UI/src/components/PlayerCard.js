// ============================================================
// FILE: components/PlayerCard.js
// MÔ TẢ: Card hiển thị KDA stats của 1 player
//        Dùng trong AnalystPage
// ============================================================

export default function PlayerCard({ player, rank }) {
  const kdaClass =
    player.kda_score >= 4  ? "kda-high"   :
    player.kda_score >= 2  ? "kda-medium" : "kda-low";

  const rankClass =
    rank === 1 ? "rank-1" :
    rank === 2 ? "rank-2" :
    rank === 3 ? "rank-3" : "";

  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>

      {/* Rank */}
      <div className={rankClass} style={{ minWidth: "40px", textAlign: "center", fontSize: "1.3rem" }}>
        #{rank}
      </div>

      {/* Avatar */}
      <div style={{
        width:        "48px",
        height:       "48px",
        borderRadius: "50%",
        background:   "linear-gradient(135deg, #e94560, #0f3460)",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        fontWeight:   700,
        fontSize:     "1.1rem",
        flexShrink:   0,
      }}>
        {player.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{player.name}</div>
        <div style={{ color: "#8892a4", fontSize: "0.85rem" }}>
          {player.team_name}
          <span className="badge badge-role" style={{ marginLeft: "0.5rem" }}>
            {player.role}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "2rem", textAlign: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{player.avg_kills}</div>
          <div style={{ color: "#8892a4", fontSize: "0.75rem" }}>K</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{player.avg_deaths}</div>
          <div style={{ color: "#8892a4", fontSize: "0.75rem" }}>D</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{player.avg_assists}</div>
          <div style={{ color: "#8892a4", fontSize: "0.75rem" }}>A</div>
        </div>
      </div>

      {/* KDA Score */}
      <div style={{ textAlign: "center", minWidth: "70px" }}>
        <div className={kdaClass} style={{ fontSize: "1.4rem" }}>
          {player.kda_score}
        </div>
        <div style={{ color: "#8892a4", fontSize: "0.75rem" }}>KDA</div>
      </div>

    </div>
  );
}
