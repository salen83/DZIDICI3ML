import React, { useState } from "react";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";
import LeagueTeamScreen from "./LeagueTeamScreen";

export default function NormalisedTeamMapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useNormalisedTeamMap();
  const [showLeagueTeams, setShowLeagueTeams] = useState(null);

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
        delete newMap[key];
        return newMap;
      });
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm("Da li želiš da izbrišeš SVE normalizovane timove i vrati ih u MapScreen?")) {
      setTeamMap({});
    }
  };

  const teams = Object.entries(teamMap || {});

  if (showLeagueTeams) {
    return (
      <LeagueTeamScreen
        leagueKey={showLeagueTeams}
        onClose={() => setShowLeagueTeams(null)}
      />
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>🗂 Normalised Team Map</h2>

      <button onClick={onClose}>⬅ Nazad</button>

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
                <td>{t.screen1 || "-"}</td>
                <td>{t.sofa || "-"}</td>
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
