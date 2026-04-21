// ============================================================
// FILE: api/apiClient.js
// MÔ TẢ: Axios client — gọi Backend API từ Frontend
//        Tất cả request đều đi qua file này
// ============================================================

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  timeout: 10000,
});

// ── MongoDB endpoints (statController — của B) ──────────────
export const getKDAAll        = ()           => api.get("/stats/kda");
export const getKDAByPlayer   = (playerId)   => api.get(`/stats/kda/${playerId}`);
export const getTeamAvg       = (tournament) =>
  api.get("/stats/team-avg", { params: tournament ? { tournament } : {} });

// ── SQL endpoints (rankController — của A) ──────────────────
export const getLeaderboard   = (season)     =>
  api.get("/rank/leaderboard", { params: season ? { season } : {} });
export const getTeamRank      = (team, season) =>
  api.get("/rank/teams", { params: { ...(team && { team }), ...(season && { season }) } });

// ── Roster endpoints (rosterController — của C) ─────────────
export const getRosters       = ()     => api.get("/rosters");
export const registerPlayer   = (data) => api.post("/rosters/register", data);

export default api;
export const getChampions = () => api.get("/stats/champions");
