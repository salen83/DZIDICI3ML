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

  const [deletedSofaLeagues, setDeletedSofaLeagues] = useState(() => {
    const saved = localStorage.getItem("deletedSofaLeagues");
    return saved ? JSON.parse(saved) : [];
  });
  const [deletedSofaTeams, setDeletedSofaTeams] = useState(() => {
    const saved = localStorage.getItem("deletedSofaTeams");
    return saved ? JSON.parse(saved) : [];
  });

  // =====================
  // SVI TIMOVI I LIGE
  // =====================
  const screen1TeamsAll = useMemo(() => Array.from(
    new Set(screen1Rows?.flatMap(r => [r.Home || r.home, r.Away || r.away].filter(Boolean))
  )).sort((a,b)=>a.localeCompare(b)), [screen1Rows]);

  const sofaTeamsAll = useMemo(() => Array.from(
    new Set(sofaRows?.flatMap(r => [r.Domacin || r.domacin, r.Gost || r.gost].filter(Boolean))
  )).sort((a,b)=>a.localeCompare(b)), [sofaRows]);

  const screen1LeaguesAll = useMemo(() => Array.from(
    new Set(screen1Rows?.map(r => r.Liga || r.liga).filter(Boolean))
  ).sort((a,b)=>a.localeCompare(b)), [screen1Rows]);

  const sofaLeaguesAll = useMemo(() => Array.from(
    new Set(sofaRows?.map(r => r.Liga || r.liga).filter(Boolean))
  ).sort((a,b)=>a.localeCompare(b)), [sofaRows]);

  // =====================
  // FILTRIRANJE OBRISANIH
  // =====================
  const sofaLeaguesBase = sofaLeaguesAll.filter(l => !deletedSofaLeagues.includes(l));
  const sofaTeamsBase = sofaTeamsAll.filter(t => !deletedSofaTeams.includes(t));

  // =====================
  // UPAARENI
  // =====================
  const pairedTeams = useMemo(() => new Set(Object.values(teamMap || {}).flatMap(t => [t.screen1, t.sofa])), [teamMap]);
  const pairedLeagues = useMemo(() => new Set(Object.values(leagueMap || {}).flatMap(l => [l.screen1, l.sofa])), [leagueMap]);

  const screen1Teams = screen1TeamsAll.filter(t => !pairedTeams.has(t));
  const sofaTeams = sofaTeamsBase.filter(t => !pairedTeams.has(t));
  const screen1Leagues = screen1LeaguesAll.filter(l => !pairedLeagues.has(l));
  const sofaLeagues = sofaLeaguesBase.filter(l => !pairedLeagues.has(l));

  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [selectedLeague1, setSelectedLeague1] = useState(null);
  const [selectedLeague2, setSelectedLeague2] = useState(null);

  // =====================
  // UPAARIVANJE TIMOVA
  // =====================
  const confirmTeamPair = (t1, t2) => {
    if (window.confirm(`Upariti timove:\n${t1} ↔ ${t2}?`)) {
      const key = `${t1}||${t2}`;
      // ✅ SAMO kreira mapu, ne postavlja više normalized
      setTeamMap(prev => ({
        ...prev,
        [key]: { screen1: t1, sofa: t2 }
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
  // TRAJNO BRISANJE LIGE + TIMOVA (NE DIRAJ NORMALIZOVANE)
  // =====================
  const handleDeleteSofaLeague = (liga) => {
    if (!window.confirm(`Trajno obrisati ligu ${liga} i sve njene timove koji nisu normalizovani?`)) return;

    const teamsToDelete = sofaRows
      .filter(r => (r.Liga || r.liga || "").trim() === liga)
      .flatMap(r => [r.Domacin || r.domacin, r.Gost || r.gost])
      .filter(Boolean)
      .filter(t => !Object.values(teamMap || {}).some(tm => tm.sofa === t));

    if (teamsToDelete.length === 0) return;

    const updatedLeagues = [...deletedSofaLeagues, liga];
    setDeletedSofaLeagues(updatedLeagues);
    localStorage.setItem("deletedSofaLeagues", JSON.stringify(updatedLeagues));

    const updatedTeams = [...new Set([...deletedSofaTeams, ...teamsToDelete])];
    setDeletedSofaTeams(updatedTeams);
    localStorage.setItem("deletedSofaTeams", JSON.stringify(updatedTeams));
  };

  const renderColumn = (title, items, selected, onClick, renderDelete=false) => (
    <div style={{ flex: 1, margin: 5 }}>
      <h3>{title}</h3>
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
    </div>
  );
}
