import React, { useState, useEffect, useRef } from "react";
import { useLeagueMap } from "../LeagueMapContext";

export default function LeagueMapScreen({ onClose }) {
  const { leagueMap, setLeagueMap } = useLeagueMap();
  const [selectedLeagueTeams, setSelectedLeagueTeams] = useState(null); 
  // { type: "screen1" | "sofa", leagueKey: string, teams: [] }

  const popupRef = useRef(null);

  const handleNormalizedChange = (key, value) => {
    setLeagueMap(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        normalized: value
      }
    }));
  };

  const handleDeleteLeague = (key) => {
    setLeagueMap(prev => {
      const newMap = { ...prev };
      delete newMap[key];
      return newMap;
    });
  };

  const handleShowTeams = (key, type) => {
    const league = leagueMap[key];
    if (!league) return;
    const teams = type === "screen1" ? league.screen1Teams || [] : league.sofaTeams || [];
    setSelectedLeagueTeams({ type, leagueKey: key, teams });
  };

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setSelectedLeagueTeams(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const leagues = Object.entries(leagueMap || {});

  return (
    <div style={{ padding: 20, position: "relative" }}>
      <h2>🏆 League Map Screen</h2>

      <button onClick={onClose} style={{ marginBottom: 15 }}>
        ⬅ Nazad
      </button>

      {leagues.length === 0 ? (
        <div style={{ color: "gray", fontStyle: "italic", marginTop: 20 }}>
          Nema trenutno uparenih liga.
        </div>
      ) : (
        <table
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse", width: "100%", marginTop: 15 }}
        >
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
                <td>
                  <span
                    style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => handleShowTeams(key, "screen1")}
                  >
                    {l.screen1 || "-"}
                  </span>
                </td>
                <td>
                  <span
                    style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => handleShowTeams(key, "sofa")}
                  >
                    {l.sofa || "-"}
                  </span>
                </td>
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

      {selectedLeagueTeams && (
        <div
          ref={popupRef}
          style={{
            position: "absolute",
            top: 50,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            border: "1px solid #ccc",
            padding: 15,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
            maxHeight: 300,
            overflowY: "auto",
            minWidth: 250
          }}
        >
          <h4 style={{ margin: "0 0 10px 0" }}>
            {selectedLeagueTeams.type === "screen1" ? "Screen1 Teams" : "SofaScore Teams"}
          </h4>
          {selectedLeagueTeams.teams.length === 0 ? (
            <div style={{ color: "gray", fontStyle: "italic" }}>Nema timova</div>
          ) : (
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {selectedLeagueTeams.teams.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
