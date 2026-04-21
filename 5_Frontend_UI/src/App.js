// ============================================================
// FILE: src/App.js
// MÔ TẢ: Main React component — routing giữa 3 trang
// ============================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar      from "./components/Navbar";
import FanPage     from "./pages/FanPage";
import AnalystPage from "./pages/AnalystPage";
import AdminPage   from "./pages/AdminPage";
import ChampionsPage from "./pages/ChampionsPage";
import "./styles/index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"        element={<FanPage />}     />
        <Route path="/analyst" element={<AnalystPage />} />
        <Route path="/admin"   element={<AdminPage />}   />
        <Route path="/champions" element={<ChampionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
