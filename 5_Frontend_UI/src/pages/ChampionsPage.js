import { useState, useEffect } from "react";
import { getChampions } from "../api/apiClient";

export default function ChampionsPage() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState("pick_count");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getChampions();
      setData(res.data.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

  const filtered = sorted.filter(c =>
    c.champion.toLowerCase().includes(search.toLowerCase())
  );

  const totalPicks  = data.reduce((s, c) => s + c.pick_count, 0);
  const mostPicked  = data.length > 0 ? sorted[0].champion : "—";
  const highestWR   = data.length > 0 ? [...data].sort((a,b) => b.win_rate - a.win_rate)[0] : null;
  const highestKDA  = data.length > 0 ? [...data].sort((a,b) => b.kda_score - a.kda_score)[0] : null;

  // Màu sắc theo pick rate
  const getPickColor = (pick, max) => {
    const ratio = pick / max;
    if (ratio >= 0.7) return "#e94560";
    if (ratio >= 0.4) return "#ffd700";
    return "#8892a4";
  };
  const maxPick = data.length > 0 ? Math.max(...data.map(c => c.pick_count)) : 1;

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Champions <span>Analytics</span></h1>

      {/* Stats tổng */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.length}</div>
          <div className="stat-label">Tổng tướng</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{mostPicked}</div>
          <div className="stat-label">Pick nhiều nhất</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{highestWR ? highestWR.champion : "—"}</div>
          <div className="stat-label">Win rate cao nhất</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{highestKDA ? highestKDA.champion : "—"}</div>
          <div className="stat-label">KDA cao nhất</div>
        </div>
      </div>

      {/* Champion Grid — tất cả tướng sắp xếp theo pick */}
      {!loading && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "12px" }}>
            Tất cả tướng — sắp xếp theo lượt pick
          </h2>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}>
            {[...data].sort((a,b) => b.pick_count - a.pick_count).map((c, i) => (
              <div
                key={i}
                style={{
                  background:    "#16213e",
                  border:        `1px solid ${getPickColor(c.pick_count, maxPick)}40`,
                  borderRadius:  "8px",
                  padding:       "6px 12px",
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "6px",
                  cursor:        "default",
                  transition:    "all 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = getPickColor(c.pick_count, maxPick)}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${getPickColor(c.pick_count, maxPick)}40`}
              >
                <span style={{
                  fontSize:   "13px",
                  fontWeight: 600,
                  color:      getPickColor(c.pick_count, maxPick),
                }}>
                  {c.champion}
                </span>
                <span style={{
                  fontSize:      "11px",
                  color:         "#8892a4",
                  background:    "#0f0f1a",
                  borderRadius:  "99px",
                  padding:       "1px 6px",
                }}>
                  {c.pick_count}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "10px", display: "flex", gap: "16px", fontSize: "11px", color: "#8892a4" }}>
            <span><span style={{ color: "#e94560" }}>■</span> Pick cao</span>
            <span><span style={{ color: "#ffd700" }}>■</span> Pick trung bình</span>
            <span><span style={{ color: "#8892a4" }}>■</span> Pick thấp</span>
          </div>
        </div>
      )}

      {/* Filter + Search + Sort */}
      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1 }}>
          <label>Tìm kiếm tướng</label>
          <input
            placeholder="Tên tướng... (Jinx, Lee Sin, Thresh...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Sắp xếp theo</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="pick_count">Pick Rate</option>
            <option value="win_rate">Win Rate</option>
            <option value="kda_score">KDA Score</option>
            <option value="avg_kills">Avg Kills</option>
            <option value="avg_gold">Avg Gold</option>
          </select>
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

      {/* Bảng xếp hạng chi tiết */}
      {loading ? (
        <div className="loading">Đang tải dữ liệu từ MongoDB...</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Tướng</th>
                <th>Picks</th>
                <th>Pick Rate</th>
                <th>Wins</th>
                <th>Win Rate</th>
                <th>KDA</th>
                <th>Avg K</th>
                <th>Avg D</th>
                <th>Avg A</th>
                <th>Avg Gold</th>
                <th>Người dùng</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((c, i) => (
                <tr key={i}>
                  <td>
                    <span className={i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : ""}>
                      #{i + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: "#e94560" }}>{c.champion}</td>
                  <td style={{ fontWeight: 600 }}>{c.pick_count}</td>
                  <td style={{ color: "#8892a4" }}>
                    {totalPicks > 0 ? ((c.pick_count / totalPicks) * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td>{c.win_count}</td>
                  <td>
                    <span className={c.win_rate >= 0.6 ? "kda-high" : c.win_rate >= 0.4 ? "kda-medium" : "kda-low"}>
                      {(c.win_rate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <span className={c.kda_score >= 4 ? "kda-high" : c.kda_score >= 2 ? "kda-medium" : "kda-low"}>
                      {c.kda_score}
                    </span>
                  </td>
                  <td>{c.avg_kills}</td>
                  <td>{c.avg_deaths}</td>
                  <td>{c.avg_assists}</td>
                  <td style={{ color: "#ffd700" }}>
                    {c.avg_gold?.toLocaleString()}
                  </td>
                  <td style={{ color: "#8892a4", fontSize: "0.8rem" }}>
                    {c.players_used?.slice(0, 2).join(", ")}
                    {c.players_used?.length > 2 ? "..." : ""}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", color: "#8892a4", padding: "2rem" }}>
                    Không tìm thấy tướng "{search}"
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