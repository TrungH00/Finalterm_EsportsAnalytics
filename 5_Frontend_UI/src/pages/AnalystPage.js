// ============================================================
// FILE: pages/AnalystPage.js — Screen 2: KDA Analytics
// MÔ TẢ: Hiển thị KDA stats từ MongoDB pipeline
//        Đây là màn hình của Member B
//        Filter theo tournament
// ============================================================
import { useState, useEffect } from "react";
import { getKDAAll, getTeamAvg } from "../api/apiClient";
import PlayerCard from "../components/PlayerCard";

export default function AnalystPage() {
  const [players,    setPlayers]    = useState([]);
  const [teamStats,  setTeamStats]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tournament, setTournament] = useState("");
  const [view,       setView]       = useState("players");
  const [search,     setSearch]     = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kdaRes, teamRes] = await Promise.all([
        getKDAAll(),
        getTeamAvg(tournament || null),
      ]);
      setPlayers(kdaRes.data.data);
      setTeamStats(teamRes.data.data);
    } catch {
      setPlayers([]);
      setTeamStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tournament]);

  const avgKDA = players.length > 0
    ? (players.reduce((s, p) => s + p.kda_score, 0) / players.length).toFixed(2)
    : "—";

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.team_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.role && p.role.toLowerCase().includes(search.toLowerCase())) ||
    String(players.indexOf(p) + 1).includes(search)
  );

  const filteredTeams = teamStats.filter(t =>
    t.team_name.toLowerCase().includes(search.toLowerCase()) ||
    t.tournament.toLowerCase().includes(search.toLowerCase()) ||
    String(teamStats.indexOf(t) + 1).includes(search)
  );

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Match <span>Analytics</span></h1>

      <div className="filter-bar">
        <div className="form-group">
          <label>Tournament</label>
          <select value={tournament} onChange={(e) => setTournament(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="LCK Spring 2025">LCK Spring 2025</option>
            <option value="Worlds 2024">Worlds 2024</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Tìm kiếm</label>
          <input
            placeholder={view === "players" ? "ID, player, team hoặc role..." : "ID, tên team hoặc tournament..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <div style={{ alignSelf: "flex-end" }}>
            <button
              className="btn-primary"
              style={{ background: "#2a2a4a", fontSize: "0.85rem" }}
              onClick={() => setSearch("")}
            >
              Xóa
            </button>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-end" }}>
          <button
            className="btn-primary"
            style={{ background: view === "players" ? "#e94560" : "#2a2a4a" }}
            onClick={() => { setView("players"); setSearch(""); }}
          >
            Players
          </button>
          <button
            className="btn-primary"
            style={{ background: view === "teams" ? "#e94560" : "#2a2a4a" }}
            onClick={() => { setView("teams"); setSearch(""); }}
          >
            Teams
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{search ? filteredPlayers.length : players.length}</div>
          <div className="stat-label">{search ? "Kết quả tìm kiếm" : "Tổng player"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{players[0]?.name || "—"}</div>
          <div className="stat-label">KDA cao nhất</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{players[0]?.kda_score || "—"}</div>
          <div className="stat-label">Best KDA</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgKDA}</div>
          <div className="stat-label">Avg KDA</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải dữ liệu từ MongoDB...</div>
      ) : view === "players" ? (
        <div>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((p, i) => (
              <div key={p.player_id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ minWidth: "32px", textAlign: "center", color: "#8892a4", fontSize: "0.85rem" }}>
                  {players.indexOf(p) + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <PlayerCard player={p} rank={i + 1} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", color: "#8892a4", padding: "2rem" }}>
              Không tìm thấy "{search}"
            </div>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Team</th>
                <th>Tournament</th>
                <th>Trận</th>
                <th>Thắng</th>
                <th>Win Rate</th>
                <th>Avg K</th>
                <th>Avg D</th>
                <th>Avg A</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.length > 0 ? filteredTeams.map((t, i) => (
                <tr key={i}>
                  <td style={{ color: "#8892a4", fontSize: "0.85rem" }}>
                    {teamStats.indexOf(t) + 1}
                  </td>
                  <td style={{ fontWeight: 700 }}>{t.team_name}</td>
                  <td>{t.tournament}</td>
                  <td>{t.total_matches}</td>
                  <td>{t.wins}</td>
                  <td>
                    <span className={t.win_rate * 100 >= 60 ? "kda-high" : t.win_rate * 100 >= 40 ? "kda-medium" : "kda-low"}>
                      {(t.win_rate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>{t.avg_kills}</td>
                  <td>{t.avg_deaths}</td>
                  <td>{t.avg_assists}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "#8892a4", padding: "2rem" }}>
                    Không tìm thấy "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}