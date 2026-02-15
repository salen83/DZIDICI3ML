import React, { useState, useMemo } from "react";
import { useTeamMap } from "../TeamMapContext";
import { useLeagueMap } from "../LeagueMapContext";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";

export default function MapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useTeamMap();
  const { leagueMap, setLeagueMap } = useLeagueMap();
  const { rows: screen1Rows } = useMatches();
  const { sofaRows } = useSofa();

  // =====================
  // SVI TIMOVI I LIGE
  // =====================
  const screen1TeamsAll = useMemo(() => {
    if (!screen1Rows) return [];
    return Array.from(
      new Set(screen1Rows.flatMap(r => [r.Home || r.home, r.Away || r.away].filter(Boolean)))
    ).sort((a, b) => a.localeCompare(b));
  }, [screen1Rows]);

  const sofaTeamsAll = useMemo(() => {
    if (!sofaRows) return [];
    return Array.from(
      new Set(sofaRows.flatMap(r => [r.Domacin || r.domacin, r.Gost || r.gost].filter(Boolean)))
    ).sort((a, b) => a.localeCompare(b));
  }, [sofaRows]);

  const screen1LeaguesAll = useMemo(() => {
    if (!screen1Rows) return [];
    return Array.from(
      new Set(screen1Rows.map(r => r.Liga || r.liga).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [screen1Rows]);

  const sofaLeaguesAllInitial = useMemo(() => {
    if (!sofaRows) return [];
    return Array.from(
      new Set(sofaRows.map(r => r.Liga || r.liga).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [sofaRows]);

  // =====================
  // STATE ZA DINAMICKO UPRAVLJANJE SOFA LIGAMA
  // =====================
  const [sofaLeagues, setSofaLeagues] = useState(sofaLeaguesAllInitial);

  // =====================
  // VEC UPAARENI (ZA FILTER)
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

  // =====================
  // FILTRIRANI PRIKAZ
  // =====================
  const screen1Teams = screen1TeamsAll.filter(t => !pairedTeams.has(t));
  const sofaTeams = sofaTeamsAll.filter(t => !pairedTeams.has(t));

  const screen1Leagues = screen1LeaguesAll.filter(l => !pairedLeagues.has(l));

  // =====================
  // SELEKCIJA
  // =====================
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [selectedLeague1, setSelectedLeague1] = useState(null);
  const [selectedLeague2, setSelectedLeague2] = useState(null);

  // =====================
  // UPAARIVANJE TIMOVA
  // =====================
  const handleTeamClick = (source, value) => {
    if (source === "screen1") setSelectedTeam1(value === selectedTeam1 ? null : value);
    if (source === "sofa") setSelectedTeam2(value === selectedTeam2 ? null : value);

    if (source === "screen1" && selectedTeam2) confirmTeamPair(value, selectedTeam2);
    if (source === "sofa" && selectedTeam1) confirmTeamPair(selectedTeam1, value);
  };

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

  // =====================
  // UPAARIVANJE LIGA (Samo uklanja ligu iz kolone, timovi ostaju)
  // =====================
  const handleLeagueClick = (source, value) => {
    if (source === "screen1") setSelectedLeague1(value === selectedLeague1 ? null : value);
    if (source === "sofa") setSelectedLeague2(value === selectedLeague2 ? null : value);

    if (source === "screen1" && selectedLeague2) confirmLeaguePair(value, selectedLeague2);
    if (source === "sofa" && selectedLeague1) confirmLeaguePair(selectedLeague1, value);
  };

  const confirmLeaguePair = (l1, l2) => {
    if (window.confirm(`Upariti lige:\n${l1} ↔ ${l2}?`)) {
      const key = `league||${l1}||${l2}`;
      setLeagueMap(prev => ({
        ...prev,
        [key]: { screen1: l1, sofa: l2, normalized: l1 }
      }));
      setSelectedLeague1(null);
      setSelectedLeague2(null);

      // ✅ ukloni ligu iz kolone Sofa za uparivanje, timovi ostaju
      setSofaLeagues(prev => prev.filter(l => l !== l2));
    }
  };

  // =====================
  // BRISANJE LIGE I TIMOVA RUČNO
  // =====================
  const handleDeleteSofaLeague = (liga) => {
    if (!window.confirm(`Obrisati ligu ${liga} i sve njene timove iz kolone za uparivanje?`)) return;

    // ukloni ligu
    setSofaLeagues(prev => prev.filter(l => l !== liga));

    // ukloni sve timove koji pripadaju toj ligi
    const teamsToRemove = sofaRows
      .filter(r => (r.Liga || r.liga || "").trim() === liga)
      .flatMap(r => [r.Domacin || r.domacin, r.Gost || r.gost])
      .filter(Boolean);

    teamsToRemove.forEach(t => {
      setSelectedTeam2(null);
      setTeamMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key].sofa === t) delete updated[key];
        });
        return updated;
      });
    });
  };

  // =====================
  // RENDER KOLONE
  // =====================
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
              <button onClick={() => handleDeleteSofaLeague(item)} style={{ marginLeft: 5 }}>🗑</button>
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
