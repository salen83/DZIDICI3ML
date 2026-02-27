import React, { useState, useMemo } from "react";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";
import { useLeagueMap } from "../LeagueMapContext";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";

export default function MapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useNormalisedTeamMap();
  const { leagueMap, setLeagueMap } = useLeagueMap();
  const { rows: screen1Rows } = useMatches();
  const { sofaRows } = useSofa();

  // =====================
  // STORAGE – OBRISANE LIGE I TIMOVI
  // =====================
  const [deletedSofaLeagues, setDeletedSofaLeagues] = useState(() => {
    const saved = localStorage.getItem("deletedSofaLeagues");
    return saved ? JSON.parse(saved) : [];
  });

  const [deletedSofaTeams, setDeletedSofaTeams] = useState(() => {
    const saved = localStorage.getItem("deletedSofaTeams");
    return saved ? JSON.parse(saved) : [];
  });

  // =====================
  // SVI TIMOVI
  // =====================
  const screen1TeamsAll = useMemo(() => {
    if (!screen1Rows) return [];
    return Array.from(
      new Set(screen1Rows.flatMap(r =>
        [r.Home || r.home, r.Away || r.away].filter(Boolean)
      ))
    ).sort((a, b) => a.localeCompare(b));
  }, [screen1Rows]);

const sofaTeamsAll = useMemo(() => {
  if (!sofaRows) return [];
  return Array.from(
    new Set(
      sofaRows.flatMap(r =>
        [
          r.domacin,
          r.Domacin,
          r.DOMACIN,
          r.home,
          r.Home,
          r.gost,
          r.Gost,
          r.GOST,
          r.away,
          r.Away
        ].filter(Boolean)
      )
    )
  ).sort((a, b) => a.localeCompare(b));
}, [sofaRows]);

  // =====================
  // SVE LIGE
  // =====================
  const screen1LeaguesAll = useMemo(() => {
    if (!screen1Rows) return [];
    return Array.from(
      new Set(screen1Rows.map(r => r.Liga || r.liga).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [screen1Rows]);

  const sofaLeaguesAll = useMemo(() => {
    if (!sofaRows) return [];
    return Array.from(
      new Set(sofaRows.map(r => r.Liga || r.liga).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [sofaRows]);

  // =====================
  // FILTRIRANJE OBRISANIH
  // =====================
  const sofaLeaguesBase = sofaLeaguesAll.filter(
    l => !deletedSofaLeagues.includes(l)
  );

  const sofaTeamsBase = sofaTeamsAll.filter(
    t => !deletedSofaTeams.includes(t)
  );

  // =====================
  // UPAARENI
  // =====================
  const pairedTeams = useMemo(() => {
    return new Set(
      Object.values(teamMap || {}).flatMap(t => [t.screen1, t.sofa])
    );
  }, [teamMap]);

  const pairedLeagues = useMemo(() => {
    return new Set(
      Object.values(leagueMap || {}).flatMap(l => [l.screen1, l.sofa])
    );
  }, [leagueMap]);

  const screen1Teams = screen1TeamsAll.filter(t => !pairedTeams.has(t));
  const sofaTeams = sofaTeamsBase.filter(t => !pairedTeams.has(t));
  const screen1Leagues = screen1LeaguesAll.filter(l => !pairedLeagues.has(l));
  const sofaLeagues = sofaLeaguesBase.filter(l => !pairedLeagues.has(l));

  // =====================
  // SELEKCIJA
  // =====================
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [selectedLeague1, setSelectedLeague1] = useState(null);
  const [selectedLeague2, setSelectedLeague2] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  // =====================
  // UPAARIVANJE TIMOVA
  // =====================
  const confirmTeamPair = (t1, t2) => {
    if (window.confirm(`Upariti timove:\n${t1} ↔ ${t2}?`)) {
      const key = `${t1}||${t2}`;
      setTeamMap(prev => ({
        ...prev,
        [key]: { screen1: t1, sofa: t2, normalized: t1 }
      }));
      setSelectedTeam1(null);
      setSelectedTeam2(null);
    }
  };

  const handleTeamClick = (source, value) => {
    if (source === "screen1") {
      if (selectedTeam2) confirmTeamPair(value, selectedTeam2);
      else setSelectedTeam1(value);
    }
    if (source === "sofa") {
      if (selectedTeam1) confirmTeamPair(selectedTeam1, value);
      else setSelectedTeam2(value);
    }
  };

  // =====================
  // UPAARIVANJE LIGA
  // =====================
  const confirmLeaguePair = (l1, l2) => {
    if (window.confirm(`Upariti lige:\n${l1} ↔ ${l2}?`)) {
      const key = `league||${l1}||${l2}`;
      setLeagueMap(prev => ({
        ...prev,
        [key]: { screen1: l1, sofa: l2, normalized: l1 }
      }));
      setSelectedLeague1(null);
      setSelectedLeague2(null);
    }
  };

  const handleLeagueClick = (source, value) => {
    if (source === "screen1") {
      if (selectedLeague2) confirmLeaguePair(value, selectedLeague2);
      else setSelectedLeague1(value);
    }
    if (source === "sofa") {
      if (selectedLeague1) confirmLeaguePair(selectedLeague1, value);
      else setSelectedLeague2(value);
    }
  };

  // =====================
  // TRAJNO BRISANJE LIGE + TIMOVA
  // =====================
  const handleDeleteSofaLeague = (liga) => {
  setDebugLog(prev => [`🗑 Kliknuto brisanje lige: ${liga}`, ...prev]);
   if (!window.confirm(`Trajno obrisati ligu ${liga} i sve njene timove?`)) return;

    // 1️⃣ liga u storage
    const updatedLeagues = [...deletedSofaLeagues, liga];
    setDeletedSofaLeagues(updatedLeagues);
    localStorage.setItem("deletedSofaLeagues", JSON.stringify(updatedLeagues));

    // 2️⃣ timovi iz te lige
    const teamsToDelete = sofaRows
  .filter(r => (r.Liga || r.liga || "").trim() === liga)
  .flatMap(r => [
    r.domacin,
    r.Domacin,
    r.DOMACIN,
    r.home,
    r.Home,
    r.gost,
    r.Gost,
    r.GOST,
    r.away,
    r.Away
  ].filter(Boolean));

    const updatedTeams = [...new Set([...deletedSofaTeams, ...teamsToDelete])];
    setDeletedSofaTeams(updatedTeams);
    localStorage.setItem("deletedSofaTeams", JSON.stringify(updatedTeams));
    setDebugLog(prev => [`✅ OBRISANI timovi: ${updatedTeams.join(", ")}`, ...prev]);
 };

  // =====================
  // VRATI IZBRISANU LIGU + TIMOVE
  // =====================
// Linije: 206–241
const restoreSofaLeague = (liga) => {
  setDebugLog(prev => [`↩ Kliknuto vraćanje lige: ${liga}`, ...prev]);
  if (!window.confirm(`Vratiti ligu ${liga} i njene timove?`)) return;

  // 1️⃣ ukloni ligu iz deletedSofaLeagues
  const updatedLeagues = deletedSofaLeagues.filter(l => l !== liga);
  setDeletedSofaLeagues(updatedLeagues);
  localStorage.setItem("deletedSofaLeagues", JSON.stringify(updatedLeagues));
  setDebugLog(prev => [`✅ Vraćene lige: ${updatedLeagues.join(", ")}`, ...prev]);

  // 2️⃣ pronadji sve timove te lige
  const teamsToRestore = sofaRows
    .filter(r => ((r.Liga || r.liga || "").trim() === liga))
    .flatMap(r => [
      r.domacin,
      r.Domacin,
      r.DOMACIN,
      r.home,
      r.Home,
      r.gost,
      r.Gost,
      r.GOST,
      r.away,
      r.Away
    ].filter(Boolean));

  // 3️⃣ ukloni te timove iz deletedSofaTeams
  const updatedTeams = deletedSofaTeams.filter(
    t => !teamsToRestore.some(rt => rt.trim().toLowerCase() === t.trim().toLowerCase())
  );
  setDeletedSofaTeams(updatedTeams);
  localStorage.setItem("deletedSofaTeams", JSON.stringify(updatedTeams));
  setDebugLog(prev => [`✅ Vraćeni timovi: ${updatedTeams.join(", ")}`, ...prev]);
};

  // =====================
  // RENDER
  // =====================
  const renderColumn = (title, items, selected, onClick, renderDelete=false) => (
    <div style={{ flex: 1, margin: 5 }}>
  <h3>{title} ({items.length})</h3>
      <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #ccc", padding: 5 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "2px 0" }}>
            <div
              onClick={() => onClick(item)}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: selected === item ? "#ffcc80" : "#f0f0f0",
                flex: 1
              }}
            >
              {item}
            </div>
            {renderDelete && (
              <button onClick={() => handleDeleteSofaLeague(item)} style={{ marginLeft: 5 }}>
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>🗺 Mapiranje timova i liga</h2>

      <button onClick={onClose} style={{ marginBottom: 15 }}>
        ⬅ Nazad
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        {renderColumn("Timovi Screen1", screen1Teams, selectedTeam1, v => handleTeamClick("screen1", v))}
        {renderColumn("Timovi Sofa", sofaTeams, selectedTeam2, v => handleTeamClick("sofa", v))}
        {renderColumn("Lige Screen1", screen1Leagues, selectedLeague1, v => handleLeagueClick("screen1", v))}
        {renderColumn("Lige Sofa", sofaLeagues, selectedLeague2, v => handleLeagueClick("sofa", v), true)}
      </div>
{debugLog.length > 0 && (
  <div style={{
    marginTop: 20,
    padding: 10,
    background: "#111",
    color: "#0f0",
    maxHeight: 200,
    overflowY: "auto",
    fontSize: 12
  }}>
    <b>DEBUG LOG:</b>
    {debugLog.map((log, i) => (
      <div key={i}>{log}</div>
    ))}
  </div>
)}

      {/* Lista izbrisanih liga */}
      {deletedSofaLeagues.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <h4>🟢 Izbrisane lige (može se vratiti)</h4>
          {deletedSofaLeagues.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span>{l}</span>
              <button onClick={() => restoreSofaLeague(l)}>↩ Vrati</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
