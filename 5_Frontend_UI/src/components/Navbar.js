import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const links = [
    { path: "/",        label: "Leaderboard" },
    { path: "/analyst", label: "KDA Analytics" },
    { path: "/champions",  label: "Champions"     },
    { path: "/admin",   label: "Roster Admin" },
  ];

  return (
    <nav style={{
      background:   "#1a1a2e",
      borderBottom: "1px solid #2a2a4a",
      padding:      "0 1.5rem",
      display:      "flex",
      alignItems:   "center",
      gap:          "2rem",
      height:       "60px",
    }}>
      {/* Logo trái */}
      <span style={{ color: "#e94560", fontWeight: 700, fontSize: "1.1rem", whiteSpace: "nowrap" }}>
        ⚔ Esports Analytics
      </span>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding:        "0.4rem 1rem",
                borderRadius:   "6px",
                color:          active ? "#e94560" : "#8892a4",
                background:     active ? "rgba(233,69,96,0.1)" : "transparent",
                fontWeight:     active ? 600 : 400,
                fontSize:       "0.9rem",
                textDecoration: "none",
                transition:     "all 0.2s",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Logo LOL phải */}
      <img
        src="/lol-logo.png"
        alt="League of Legends"
        style={{ height: "50px", width: "150px", objectFit: "contain" }}
      />
    </nav>
  );
}