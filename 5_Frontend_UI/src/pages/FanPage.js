// ============================================================
// FILE: pages/FanPage.js — Screen 1: Global Leaderboard
// MÔ TẢ: Hiển thị bảng xếp hạng player từ SQL DENSE_RANK
//        Filter theo season
// ============================================================
import { useState, useEffect } from "react";
import { getLeaderboard } from "../api/apiClient";

export default function FanPage() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [season,  setSeason]  = useState("");
  const [search,  setSearch]  = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getLeaderboard(season || null);
      setData(res.data.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [season]);

  const filtered = data.filter(p =>
    p.nickname.toLowerCase().includes(search.toLowerCase()) ||
    p.team_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.role && p.role.toLowerCase().includes(search.toLowerCase())) ||
    String(data.indexOf(p) + 1).includes(search)
  );

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Global <span>Leaderboard</span></h1>

      <div className="filter-bar">
        <div className="form-group">
          <label>Filter theo Season</label>
          <select value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">Tất cả season</option>
            <option value="1">LCK Spring 2025</option>
            <option value="2">Worlds 2024</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Tìm kiếm</label>
          <input
            placeholder="ID, player, team hoặc role..."
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
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">{search ? "Kết quả tìm kiếm" : "Tổng player"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.length > 0 ? data[0].nickname : "—"}</div>
          <div className="stat-label">Hạng 1</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.length > 0 ? data[0].win_rate_pct + "%" : "—"}</div>
          <div className="stat-label">Win rate cao nhất</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Hạng</th>
                <th>Nickname</th>
                <th>Team</th>
                <th>Role</th>
                <th>Trận</th>
                <th>Thắng</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((p, i) => (
                <tr key={i}>
                  <td style={{ color: "#8892a4", fontSize: "0.85rem" }}>
                    {data.indexOf(p) + 1}
                  </td>
                  <td>
                    <span className={
                      p.rank === 1 ? "rank-1" :
                      p.rank === 2 ? "rank-2" :
                      p.rank === 3 ? "rank-3" : ""
                    }>
                      #{p.rank}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.nickname}</td>
                  <td>{p.team_name}</td>
                  <td><span className="badge badge-role">{p.role}</span></td>
                  <td>{p.total_matches}</td>
                  <td>{p.total_wins}</td>
                  <td>
                    <span className={p.win_rate_pct >= 60 ? "kda-high" : p.win_rate_pct >= 40 ? "kda-medium" : "kda-low"}>
                      {p.win_rate_pct}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "#8892a4", padding: "2rem" }}>
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