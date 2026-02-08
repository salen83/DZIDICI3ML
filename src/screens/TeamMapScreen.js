import React, { useState } from "react";
import { useTeamMap } from "../TeamMapContext";
import LeagueMapScreen from "./LeagueMapScreen";

export default function TeamMapScreen({ onClose, openLeagueMap }) {
  const { teamMap, setTeamMap } = useTeamMap();
  const [showLeagueMap, setShowLeagueMap] = useState(false);

  const handleNormalizedChange = (key, value) => {
    setTeamMap(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        normalized: value
      }
    }));
  };

  const handleDelete = (key) => {
    if (window.confirm("Da li želiš da izbrišeš normalizovano ime i vrati tim u MapScreen?")) {
      setTeamMap(prev => {
        const newMap = { ...prev };
        delete newMap[key]; // briše iz teamMap
        return newMap;
      });
    }
  };

  // Funkcija za brisanje svih timova
  const handleDeleteAll = () => {
    if (window.confirm("Da li želiš da izbrišeš SVE normalizovane timove i vrati ih u MapScreen?")) {
      setTeamMap({});
    }
  };

  const teams = Object.entries(teamMap || {});

  // Ako showLeagueMap true, vraća LeagueMapScreen i prekida render TeamMapScreen
  if (showLeagueMap) {
    return <LeagueMapScreen onClose={() => setShowLeagueMap(false)} />;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>🗂 Team Map (normalizovani timovi)</h2>

      <button onClick={onClose}>⬅ Nazad</button>
      <button
        onClick={() => setShowLeagueMap(true)}
        style={{ marginLeft: 10 }}
      >
        🏆 League Map
      </button>
      {teams.length > 0 && (
        <button
          onClick={handleDeleteAll}
          style={{ marginLeft: 10, background: "#ff4444", color: "white", cursor: "pointer" }}
        >
          Izbriši sve
        </button>
      )}

      {teams.length === 0 ? (
        <div style={{ marginTop: 20, color: "gray", fontStyle: "italic" }}>
          Nema trenutno normalizovanih timova.
        </div>
      ) : (
        <table
          border="1"
          cellPadding="6"
          style={{ marginTop: 15, borderCollapse: "collapse", width: "100%" }}
        >
          <thead style={{ background: "#f0f0f0" }}>
            <tr>
              <th>#</th>
              <th>Normalized name</th>
              <th>Screen1 (Mozzart)</th>
              <th>SofaScore</th>
              <th>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(([key, t], i) => (
              <tr key={key}>
                <td>{i + 1}</td>
                <td>
                  <input
                    value={t.normalized || ""}
                    onChange={e => handleNormalizedChange(key, e.target.value)}
                    placeholder="npr. Manchester United"
                    style={{ width: "100%" }}
                  />
                </td>
                <td>{t.name1 || "-"}</td>
                <td>{t.name2 || "-"}</td>
                <td>
                  <button
                    onClick={() => handleDelete(key)}
                    style={{ background: "#ff6666", color: "white", cursor: "pointer" }}
                  >
                    Izbriši
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
