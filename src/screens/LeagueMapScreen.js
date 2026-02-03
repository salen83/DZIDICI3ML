import React from "react";
import { useLeagueMap } from "../LeagueMapContext";

export default function LeagueMapScreen({ onClose }) {
  const { leagueMap, setLeagueMap } = useLeagueMap();

  const handleNormalizedChange = (key, value) => {
    setLeagueMap(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        normalized: value
      }
    }));
  };

  // Ova funkcija briše ceo entry iz leagueMap
  const handleDeleteLeague = (key) => {
    setLeagueMap(prev => {
      const newMap = { ...prev };
      delete newMap[key];
      return newMap;
    });
  };

  const leagues = Object.entries(leagueMap || {});

  return (
    <div style={{ padding: 20 }}>
      <h2>🏆 League Map Screen</h2>

      <button onClick={onClose} style={{ marginBottom: 15 }}>
        ⬅ Nazad
      </button>

      {leagues.length === 0 ? (
        <div style={{ color: "gray", fontStyle: "italic", marginTop: 20 }}>
          Nema trenutno uparenih liga.
        </div>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", marginTop: 15 }}>
          <thead style={{ background: "#f0f0f0" }}>
            <tr>
              <th>#</th>
              <th>Normalized Name</th>
              <th>Screen1 Name</th>
              <th>SofaScore Name</th>
              <th>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {leagues.map(([key, l], i) => (
              <tr key={key}>
                <td>{i + 1}</td>
                <td>
                  <input
                    value={l.normalized || ""}
                    onChange={e => handleNormalizedChange(key, e.target.value)}
                    placeholder="npr. Premier League"
                    style={{ width: "100%" }}
                  />
                </td>
                <td>{l.screen1 || "-"}</td>
                <td>{l.sofa || "-"}</td>
                <td>
                  <button
                    onClick={() => handleDeleteLeague(key)}
                    style={{ cursor: "pointer" }}
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
