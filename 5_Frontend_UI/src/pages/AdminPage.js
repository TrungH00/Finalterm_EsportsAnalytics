// ============================================================
// FILE: pages/AdminPage.js — Screen 3: Roster Management
// MÔ TẢ: Đăng ký player + xem danh sách roster
//        Gọi sp_register_player qua API
// ============================================================

import { useState, useEffect } from "react";
import { getRosters } from "../api/apiClient";
import RosterForm from "../components/RosterForm";

export default function AdminPage() {
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("");

  const fetchRosters = async () => {
    setLoading(true);
    try {
      const res = await getRosters();
      setRosters(res.data.data);
    } catch {
      setRosters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRosters(); }, []);

  const filtered = rosters.filter((r) =>
    r.player.toLowerCase().includes(filter.toLowerCase()) ||
    r.team.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <h1 className="page-title">Roster <span>Management</span></h1>

      {/* Form đăng ký — gọi sp_register_player */}
      <RosterForm onSuccess={fetchRosters} />

      {/* Danh sách roster */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3>Roster List ({rosters.length} register)</h3>
          <input
            placeholder="Find player or team..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: "220px" }}
          />
        </div>

        {loading ? (
          <div className="loading">loading...</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Player</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Season</th>
                  <th>Jersey Number</th>
                  <th>Starter</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.roster_id}>
                    <td style={{ color: "#8892a4" }}>{r.roster_id}</td>
                    <td style={{ fontWeight: 600 }}>{r.player}</td>
                    <td><span className="badge badge-role">{r.role}</span></td>
                    <td>{r.team}</td>
                    <td>{r.season}</td>
                    <td>{r.jersey_number || "—"}</td>
                    <td>
                      <span className={`badge ${r.is_starter ? "badge-win" : "badge-loss"}`}>
                        {r.is_starter ? "Starter" : "Sub"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "#8892a4" }}>No results found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
