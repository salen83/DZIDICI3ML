import React, { useState, useEffect, useMemo } from "react";
import { useTeamMap } from "../TeamMapContext";
import { useMatches } from "../MatchesContext";

export default function MapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useTeamMap();
  const { rows: screen1Rows } = useMatches();

  // --- Memoizovani Screen1 timovi i lige ---
  const screen1Teams = useMemo(() =>
    Array.from(new Set(
      screen1Rows?.map(r => r.home)
        .concat(screen1Rows?.map(r => r.away))
        .filter(Boolean)
    )),
    [screen1Rows]
  );

  const screen1Leagues = useMemo(() =>
    Array.from(new Set(screen1Rows?.map(r => r.liga).filter(Boolean))),
    [screen1Rows]
  );

  // --- Sofa kandidati i parovi ---
  const sofaCandidates = useMemo(() =>
    Object.values(teamMap).filter(t => t.source === "sofa-candidate"),
    [teamMap]
  );

  const pairedTeams = useMemo(() =>
    new Set(Object.values(teamMap).filter(t => t.type === "team").flatMap(t => [t.name1, t.name2])),
    [teamMap]
  );

  const pairedLeagues = useMemo(() =>
    new Set(Object.values(teamMap).filter(t => t.type === "league").flatMap(t => [t.name1, t.name2])),
    [teamMap]
  );

  // --- Lokalno stanje za listu kandidata ---
  const [sofaTeams, setSofaTeams] = useState([]);
  const [sofaLeagues, setSofaLeagues] = useState([]);

  // --- Prati promene u Screen1 i SofaScreen ---
  useEffect(() => {
    const allTeams = Array.from(new Set(sofaCandidates.map(t => t.sofa).filter(Boolean)));
    const allLeagues = Array.from(new Set(sofaCandidates.map(t => t.leagueSofa).filter(Boolean)));

    setSofaTeams(allTeams.filter(t => !pairedTeams.has(t)));
    setSofaLeagues(allLeagues.filter(l => !pairedLeagues.has(l)));
  }, [sofaCandidates, pairedTeams, pairedLeagues, screen1Teams, screen1Leagues]);

  // --- Selekcija timova i liga ---
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [selectedLeague1, setSelectedLeague1] = useState(null);
  const [selectedLeague2, setSelectedLeague2] = useState(null);

  const handleTeamClick = (source, value) => {
    if (source === "screen1") setSelectedTeam1(value === selectedTeam1 ? null : value);
    if (source === "sofa") setSelectedTeam2(value === selectedTeam2 ? null : value);

    if (source === "screen1" && selectedTeam2) confirmTeamPair(value, selectedTeam2);
    if (source === "sofa" && selectedTeam1) confirmTeamPair(selectedTeam1, value);
  };

  const confirmTeamPair = (t1, t2) => {
    if (window.confirm(`Da li zelite da uparite timove:\n"${t1}" sa "${t2}"?`)) {
      const key = `${t1}||${t2}`;
      setTeamMap(prev => ({ ...prev, [key]: { type: "team", name1: t1, name2: t2 } }));
      setSofaTeams(prev => prev.filter(t => t !== t1 && t !== t2));
      setSelectedTeam1(null);
      setSelectedTeam2(null);
    }
  };

  const handleLeagueClick = (source, value) => {
    if (source === "screen1") setSelectedLeague1(value === selectedLeague1 ? null : value);
    if (source === "sofa") setSelectedLeague2(value === selectedLeague2 ? null : value);

    if (source === "screen1" && selectedLeague2) confirmLeaguePair(value, selectedLeague2);
    if (source === "sofa" && selectedLeague1) confirmLeaguePair(selectedLeague1, value);
  };

  const confirmLeaguePair = (l1, l2) => {
    if (window.confirm(`Da li zelite da uparite lige:\n"${l1}" sa "${l2}"?`)) {
      const key = `league||${l1}||${l2}`;
      setTeamMap(prev => ({ ...prev, [key]: { type: "league", name1: l1, name2: l2 } }));
      setSofaLeagues(prev => prev.filter(l => l !== l1 && l !== l2));
      setSelectedLeague1(null);
      setSelectedLeague2(null);
    }
  };

  const renderColumn = (title, items, selected, onClick) => (
    <div style={{ flex: 1, margin: 5 }}>
      <h3>{title}</h3>
      <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #ccc", padding: 5 }}>
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => onClick(item)}
            style={{
              padding: "4px 8px",
              margin: "2px 0",
              cursor: "pointer",
              backgroundColor: selected === item ? "#ffcc80" : "#f0f0f0",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>🗺 Mapiranje timova i liga</h2>
      <button onClick={onClose} style={{ marginBottom: 15 }}>⬅ Nazad</button>

      <div style={{ display: "flex", gap: 10 }}>
        {renderColumn("Timovi Screen1", screen1Teams, selectedTeam1, val => handleTeamClick("screen1", val))}
        {renderColumn("Timovi SofaScreen", sofaTeams, selectedTeam2, val => handleTeamClick("sofa", val))}
        {renderColumn("Lige Screen1", screen1Leagues, selectedLeague1, val => handleLeagueClick("screen1", val))}
        {renderColumn("Lige SofaScreen", sofaLeagues, selectedLeague2, val => handleLeagueClick("sofa", val))}
      </div>

      <div style={{ marginTop: 20, fontSize: 12, background: "#f5f5f5", padding: 10 }}>
        <pre>{JSON.stringify(teamMap, null, 2)}</pre>
      </div>
    </div>
  );
}
