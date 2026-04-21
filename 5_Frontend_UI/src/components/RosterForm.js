// ============================================================
// FILE: components/RosterForm.js
// MÔ TẢ: Form đăng ký player vào roster
//        Dùng trong AdminPage
// ============================================================

import { useState } from "react";
import { registerPlayer } from "../api/apiClient";

export default function RosterForm({ onSuccess }) {
  const [form, setForm]       = useState({ player_id: "", team_id: "", season_id: "", jersey_number: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.player_id || !form.team_id || !form.season_id) {
      setMessage({ type: "error", text: "Vui lòng điền đầy đủ Player ID, Team ID và Season ID." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await registerPlayer({
        player_id:     parseInt(form.player_id),
        team_id:       parseInt(form.team_id),
        season_id:     parseInt(form.season_id),
        jersey_number: form.jersey_number ? parseInt(form.jersey_number) : null,
      });

      setMessage({ type: "success", text: res.data.message });
      setForm({ player_id: "", team_id: "", season_id: "", jersey_number: "" });
      if (onSuccess) onSuccess();

    } catch (err) {
      const errMsg = err.response?.data?.message || "Lỗi kết nối server.";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: "1.2rem", color: "#e94560" }}>Đăng ký Player vào Roster</h3>

      {message && (
        <div className={`alert alert-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label>Player ID *</label>
          <input name="player_id" value={form.player_id} onChange={handleChange} placeholder="VD: 1" />
        </div>
        <div className="form-group">
          <label>Team ID *</label>
          <input name="team_id" value={form.team_id} onChange={handleChange} placeholder="1=T1, 2=C9, 3=FNC, 4=G2" />
        </div>
        <div className="form-group">
          <label>Season ID *</label>
          <input name="season_id" value={form.season_id} onChange={handleChange} placeholder="1=LCK Spring 2025, 2=Worlds 2024" />
        </div>
        <div className="form-group">
          <label>Số áo</label>
          <input name="jersey_number" value={form.jersey_number} onChange={handleChange} placeholder="VD: 10" />
        </div>
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "Đang xử lý..." : "Đăng ký"}
      </button>
    </div>
  );
}
