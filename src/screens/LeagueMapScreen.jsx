import React, { useState, useEffect, useRef } from "react";
import { useLeagueMap } from "../LeagueMapContext";
import { supabase } from "../supabase";

export default function LeagueMapScreen({ onClose, openLeagueTeams }) {
  const { leagueMap, setLeagueMap } = useLeagueMap();
  const [openLists, setOpenLists] = useState({});
  const wrapperRef = useRef(null);

  // =====================
  // UCITAVANJE IZ LOCALSTORAGE
  // =====================
useEffect(() => {
  async function loadLeagues() {
    try {
      const { data: aliases, error } = await supabase
        .from("league_aliases")
        .select("*");

      if (error) {
        console.log("❌ load leagues error:", error);
        return;
      }

      const grouped = {};

      aliases.forEach(a => {
        if (!grouped[a.league_id]) {
          grouped[a.league_id] = [];
        }
        grouped[a.league_id].push(a.alias);
      });

      const formatted = {};

      Object.entries(grouped).forEach(([leagueId, aliases]) => {
        const screen1 = aliases[0]; // privremeno
        const sofa = aliases.slice(1);

        const key = `league||${screen1}||${sofa[0] || "x"}`;

        formatted[key] = {
          screen1,
          sofa,
          normalized: screen1
        };
      });

      setLeagueMap(formatted);

      console.log("✅ leagues loaded", formatted);

    } catch (err) {
      console.log("❌ load error:", err);
    }
  }

  loadLeagues();
}, []);

const handleNormalizedChange = (key, value) => {
  if (!value && leagueMap[key]?.screen1) {
    value = leagueMap[key].screen1;
  }
  setLeagueMap(prev => {
    const next = {
      ...prev,
      [key]: {
        ...prev[key],
        normalized: value
      }
    };
    localStorage.setItem("leagueMap", JSON.stringify(next));
    return next;
  });
};

  const handleDeleteLeague = (key) => {
    setLeagueMap(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem("leagueMap", JSON.stringify(next));
      return next;
    });
  };

  const toggleList = (leagueKey, type) => {
    const id = `${leagueKey}||${type}`;
    setOpenLists(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // klik van liste zatvara sve
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpenLists({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const leagues = Object.entries(leagueMap || {});

  return (
    <div style={{ padding: 20 }} ref={wrapperRef}>
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
            {leagues.map(([key, l], i) => {
              const screen1Open = openLists[`${key}||screen1`];
              const sofaOpen = openLists[`${key}||sofa`];

              return (
                <tr key={key} style={{ verticalAlign: "top" }}>
                  <td>{i + 1}</td>

                  <td>
                    <input
                      value={l.normalized || l.screen1 || ""}
                      onChange={e => handleNormalizedChange(key, e.target.value)}
                      placeholder="npr. Premier League"
                      style={{ width: "100%" }}
                    />
                  </td>

                  <td
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleList(key, "screen1")}
                  >
                    <div style={{ fontWeight: "bold" }}>{l.screen1 || "-"}</div>

                    {screen1Open && (
                      <div style={{
                        marginTop: 6,
                        background: "#fafafa",
                        border: "1px solid #ccc",
                        padding: 6,
                        maxHeight: 200,
                        overflowY: "auto"
                      }}>
                        {(l.screen1Teams || []).length === 0 ? (
                          <div style={{ color: "gray", fontStyle: "italic" }}>
                            Nema timova
                          </div>
                        ) : (
                          l.screen1Teams.map((t, idx) => (
                            <div key={idx}>• {t}</div>
                          ))
                        )}
                      </div>
                    )}
                  </td>

                  <td
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleList(key, "sofa")}
                  >
                  <div>
  <div style={{ fontWeight: "bold" }}>
    {Array.isArray(l.sofa) ? l.sofa.join(", ") : (l.sofa || "-")}
  </div>

  {l.country && (
    <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
      ({l.country})
    </div>
  )}
</div>

                    {sofaOpen && (
                      <div style={{
                        marginTop: 6,
                        background: "#f7f7ff",
                        border: "1px solid #ccc",
                        padding: 6,
                        maxHeight: 200,
                        overflowY: "auto"
                      }}>
                        {(l.sofaTeams || []).length === 0 ? (
                          <div style={{ color: "gray", fontStyle: "italic" }}>
                            Nema timova
                          </div>
                        ) : (
                          l.sofaTeams.map((t, idx) => (
                            <div key={idx}>• {t}</div>
                          ))
                        )}
                      </div>
                    )}
                  </td>

                  <td style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => openLeagueTeams?.(key)}>Timovi</button>
                    <button onClick={() => handleDeleteLeague(key)}>Izbriši</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
