import React, { useState, useEffect } from "react";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";
import LeagueTeamScreen from "./LeagueTeamScreen";
import { supabase } from "../supabase";

export default function NormalisedTeamMapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useNormalisedTeamMap();
  const [showLeagueTeams, setShowLeagueTeams] = useState(null);

useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from("team_map")
      .select("*");

    if (error) {
      console.error("❌ load team_map:", error);
      return;
    }

    if (data) {
      const map = {};
      data.forEach(r => {
        map[r.key] = {
          screen1: r.screen1,
          sofa: r.sofa,
          normalized: r.normalized
        };
      });

      setTeamMap(map);
    }
  })();
}, []);

  // ✅ AUTOMATSKI postavi normalized = screen1 ako ne postoji
  useEffect(() => {
    const updated = { ...teamMap };
    let changed = false;

    Object.keys(updated).forEach(key => {
      if (!updated[key].normalized && updated[key].screen1) {
        updated[key].normalized = updated[key].screen1;
        changed = true;
      }
    });

    if (changed) {
      setTeamMap(updated);
    }
  }, [teamMap, setTeamMap]);

const handleNormalizedChange = async (key, value) => {
  const updated = {
    ...teamMap,
    [key]: {
      ...teamMap[key],
      normalized: value
    }
  };

  setTeamMap(updated);

  const row = updated[key];

  const { error } = await supabase
    .from("team_map")
    .upsert({
      key,
      screen1: row.screen1 || "",
      sofa: row.sofa || "",
      normalized: value
    });

  if (error) {
    console.error("❌ save team_map:", error);
  }
};

const handleDelete = async (key) => {
  if (!window.confirm("Da li želiš da izbrišeš normalizovani tim?")) return;

  setTeamMap(prev => {
    const newMap = { ...prev };
    delete newMap[key];
    return newMap;
  });

  await supabase.from("team_map").delete().eq("key", key);
};

const handleDeleteAll = async () => {
  if (!window.confirm("Da li želiš da izbrišeš SVE normalizovane timove?")) return;

  setTeamMap({});
  await supabase.from("team_map").delete().neq("key", "");
};

  const teams = Object.entries(teamMap || {}).map(([key, t]) => ({
    key,
    ...t
  }));

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
            {teams.map((t, i) => (
              <tr key={t.key}>
                <td>{i + 1}</td>
                <td>
                  <input
                    value={t.normalized || ""}
                    onChange={e => handleNormalizedChange(t.key, e.target.value)}
                    style={{ width: "100%" }}
                  />
                </td>
                <td>{t.screen1 || "-"}</td>
                <td>{t.sofa || "-"}</td>
                <td>
                  <button
                    onClick={() => handleDelete(t.key)}
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
