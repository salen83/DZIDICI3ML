import { useMapStore } from "../stores/mapStore";
import React, { useMemo, useEffect } from "react";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";
import { useLeagueMap } from "../LeagueMapContext";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import { dbMap, STORE_NAMES } from "../dbMap";
import { supabase } from "../supabase";

export default function MapScreen({ onClose }) {
  const { teamMap, setTeamMap } = useNormalisedTeamMap();
  const { leagueMap, setLeagueMap } = useLeagueMap();
  const { rows: screen1Rows } = useMatches();
  const { sofaRows } = useSofa();

  // =====================
  // STORAGE – OBRISANE LIGE I TIMOVI
  // =====================
const {
  deletedSofaLeagues,
  setDeletedSofaLeagues,
  deletedSofaTeams,
  setDeletedSofaTeams
} = useMapStore();

// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  async function loadDeleted() {
    // ✅ AKO VEĆ IMA PODATAKA – NE UČITAVAJ PONOVO
    if (deletedSofaLeagues.length > 0 || deletedSofaTeams.length > 0) return;

    const leagues = await dbMap.getAll(STORE_NAMES.DELETED_SOFALIGUES);
    const teams = await dbMap.getAll(STORE_NAMES.DELETED_SOFATEAMS);

    setDeletedSofaLeagues(leagues.map(l => l.value || l.id));
    setDeletedSofaTeams(teams.map(t => t.value || t.id));
  }

  loadDeleted();
}, [deletedSofaLeagues.length, deletedSofaTeams.length, setDeletedSofaLeagues, setDeletedSofaTeams]);

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
    new Set(
      sofaRows.map(r => {
        const liga = r.Liga || r.liga || "";
        const country = r.Country || r.country || "";
        return `${liga}|||${country}`;
      }).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}, [sofaRows]);
// =====================
// SOFA LIGA -> DRŽAVA MAPA
// =====================
// =====================
// SOFA LIGA -> DRŽAVA MAPA
// =====================
const sofaLeagueCountryMap = useMemo(() => {
  if (!sofaRows) return {};
  const map = {};
  sofaRows.forEach(r => {
    const liga = r.Liga || r.liga;
    const country =
      r.Country ||
      r.country ||
      r.Država ||
      r.drzava ||
      "";
    // ✅ dodaj country samo ako liga još nije u mapi
if (liga && country && !map[`${liga}|||${country}`]) map[`${liga}|||${country}`] = country;
  });
  return map;
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
// UPAARENI (ODVOJENO)
// =====================
const pairedScreen1Teams = useMemo(() => {
  return new Set(
    Object.values(teamMap || {}).map(t => t.screen1)
  );
}, [teamMap]);

const pairedSofaTeams = useMemo(() => {
  return new Set(
    Object.values(teamMap || {}).map(t => t.sofa)
  );
}, [teamMap]);

// =====================
// UPAARENE SCREEN1 LIGE
// =====================
const pairedScreen1Leagues = useMemo(() => {
  return new Set(
    Object.values(leagueMap || {}).map(l => l.screen1)
  );
}, [leagueMap]);

// =====================
// UPAARENE SOFA LIGE
// =====================
const pairedSofaLeagues = useMemo(() => {
  return new Set(
    Object.values(leagueMap || {}).flatMap(l =>
      Array.isArray(l.sofa) ? l.sofa : [l.sofa]
    )
  );
}, [leagueMap]);
useEffect(() => {
  if (!leagueMap) return;

  const updated = {};
  Object.entries(leagueMap).forEach(([key, value]) => {
    // Ako već ima country, ne diraj
    if (value.country) {
      updated[key] = value;
    } else {
      // uzmi prvu Sofa ligu iz niza ili string
      const sofaArray = Array.isArray(value.sofa) ? value.sofa : [value.sofa];
      const country = sofaLeagueCountryMap[sofaArray[0]] || "";
      updated[key] = { ...value, country };
    }
  });

setLeagueMap(updated);
}, [sofaLeagueCountryMap, setLeagueMap]);

const screen1Teams = screen1TeamsAll.filter(t => !pairedScreen1Teams.has(t));
const sofaTeams = sofaTeamsBase.filter(t => !pairedSofaTeams.has(t));
// =====================
// PRETRAGA TIMOVA SOFA – ISPRAVNO
// =====================
const findSofaTeamLocation = (team) => {
  if (sofaTeams.includes(team)) {
    return "U koloni za uparivanje (Sofa)";
  } else if (sofaTeamsBase.includes(team)) {
    return "U listi normalizovanih timova (Sofa)";
  } else if (deletedSofaTeams.includes(team)) {
    return "U listi izbrisanih timova (Sofa)";
  } else {
    return "Tim nije pronađen";
  }
};
const screen1Leagues = screen1LeaguesAll.filter(
  l => !pairedScreen1Leagues.has(l)
);
// =====================
// FILTER – SOFA LEAGUES
// =====================
const sofaLeagues = useMemo(() =>
  sofaLeaguesBase.filter(l => !pairedSofaLeagues.has(l))
, [sofaLeaguesBase, pairedSofaLeagues]);

  // =====================
  // SELEKCIJA
  // =====================
const {
  selectedTeam1,
  setSelectedTeam1,
  selectedTeam2,
  setSelectedTeam2,
  selectedLeague1,
  setSelectedLeague1,
  selectedLeague2,
  setSelectedLeague2,
  debugLog,
  addDebugLog,
  restoredHighlight,
  setRestoredHighlight,
  showDeletedLeagues,
  setShowDeletedLeagues,
  showDeletedTeams,
  setShowDeletedTeams,
  searchTeam,
  setSearchTeam,
  searchResult,
  setSearchResult
} = useMapStore();

  // =====================
  // UPAARIVANJE TIMOVA
  // =====================
const confirmTeamPair = async (t1, t2) => {
  if (!window.confirm(`Upariti timove:\n${t1} ↔ ${t2}?`)) return;

  const key = `${t1}||${t2}`;
 setTeamMap(prev => {
  if (prev[key]) return prev; // ✅ spreči duplikat
  return {
    ...prev,
    [key]: { screen1: t1, sofa: t2, normalized: t1 }
  };
});

  try {
    // 1. proveri da li već postoji neki od ova 2 aliasa
    const { data: existing } = await supabase
      .from("team_aliases")
      .select("*")
      .in("alias", [t1, t2]);

    let teamId;

    if (existing && existing.length > 0) {
  teamId = existing[0].team_id;
} else {
  // ✅ napravi novi tim u teams tabeli
  const { data: newTeam, error: teamError } = await supabase
    .from("teams")
    .insert([{ name: t1 }])
    .select()
    .single();

  if (teamError) {
    console.log("❌ Team insert error:", teamError);
    return;
  }

  teamId = newTeam.id;
}

    // 2. ubaci oba aliasa (ako već ne postoje)
    const inserts = [];

    if (!existing.find(e => e.alias === t1)) {
      inserts.push({ alias: t1, team_id: teamId });
    }

    if (!existing.find(e => e.alias === t2)) {
      inserts.push({ alias: t2, team_id: teamId });
    }

    if (inserts.length > 0) {
      const { error } = await supabase
        .from("team_aliases")
        .insert(inserts);

      if (error) {
        console.log("Supabase insert error:", error);
      } else {
        console.log("✅ team_id:", teamId, inserts);
      }
    }

  } catch (err) {
    console.log("❌ Supabase error:", err);
  }

  setSelectedTeam1(null);
  setSelectedTeam2(null);
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
const confirmLeaguePair = async (l1, l2) => {
  if (!window.confirm(`Upariti lige:\n${l1} ↔ ${l2}?`)) return;

  const country = sofaLeagueCountryMap[l2] || "";

  // 1. LOCAL STATE
  setLeagueMap(prev => {
    const existingKey = Object.keys(prev).find(k => prev[k].screen1 === l1);

    if (existingKey) {
      const existing = prev[existingKey];
      return {
        ...prev,
        [existingKey]: {
          ...existing,
          sofa: Array.isArray(existing.sofa)
            ? [...existing.sofa, l2]
            : [existing.sofa, l2],
          country: existing.country || country
        }
      };
    } else {
      const key = `league||${l1}||${l2}`;
      return {
        ...prev,
        [key]: { screen1: l1, sofa: [l2], normalized: l1, country }
      };
    }
  });

  // 2. SUPABASE (ISTO KAO TIMOVI)
  try {
    const { data: existing } = await supabase
      .from("league_aliases")
      .select("*")
      .in("alias", [l1, l2]);

    let leagueId;

    if (existing && existing.length > 0) {
      leagueId = existing[0].league_id;
    } else {
      const { data: newLeague, error: leagueError } = await supabase
        .from("leagues")
        .insert([{ name: l1, country }])
        .select()
        .single();

      if (leagueError) {
        console.log("❌ League insert error:", leagueError);
        return;
      }

      leagueId = newLeague.id;
    }

    const inserts = [];

    if (!existing.find(e => e.alias === l1)) {
      inserts.push({ alias: l1, league_id: leagueId });
    }

    if (!existing.find(e => e.alias === l2)) {
      inserts.push({ alias: l2, league_id: leagueId });
    }

    if (inserts.length > 0) {
      const { error } = await supabase
        .from("league_aliases")
        .insert(inserts);

      if (error) {
        console.log("❌ League alias insert error:", error);
      } else {
        console.log("✅ league_id:", leagueId, inserts);
      }
    }

  } catch (err) {
    console.log("❌ Supabase error:", err);
  }

  setSelectedLeague1(null);
  setSelectedLeague2(null);
};


const handleLeagueClick = (source, value) => {
  if (source === "screen1") {
    if (selectedLeague2) {
      if (Array.isArray(selectedLeague2)) {
        selectedLeague2.forEach(l2 => confirmLeaguePair(value, l2));
      } else {
        confirmLeaguePair(value, selectedLeague2);
      }
      setSelectedLeague2(null);
    } else {
      setSelectedLeague1(value);
    }
  }

  if (source === "sofa") {
    if (!selectedLeague2) {
      setSelectedLeague2(value);
    } else if (Array.isArray(selectedLeague2)) {
      setSelectedLeague2(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else {
      if (selectedLeague2 === value) {
        setSelectedLeague2(null);
      } else {
        setSelectedLeague2([selectedLeague2, value]);
      }
    }
  }
};

  // =====================
  // TRAJNO BRISANJE LIGE + TIMOVA
  // =====================
const handleDeleteSofaLeague = async (liga) => {
  addDebugLog("tekst")
  if (!window.confirm(`Trajno obrisati ligu ${liga} i sve njene timove?`)) return;

  const updatedLeagues = [...deletedSofaLeagues, liga];
  setDeletedSofaLeagues(updatedLeagues);

  await dbMap.clear(STORE_NAMES.DELETED_SOFALIGUES);
  for (const l of updatedLeagues) {
    await dbMap.put(STORE_NAMES.DELETED_SOFALIGUES, { id: l, value: l });
  }

  const teamsToDelete = sofaRows
    .filter(r => {
      const ligaName = r.Liga || r.liga || "";
      const country = r.Country || r.country || "";
      return `${ligaName}|||${country}` === liga;
    })
    .flatMap(r => [
      r.domacin, r.Domacin, r.DOMACIN, r.home, r.Home,
      r.gost, r.Gost, r.GOST, r.away, r.Away
    ].filter(Boolean));

  const updatedTeams = [...new Set([...deletedSofaTeams, ...teamsToDelete])];
  setDeletedSofaTeams(updatedTeams);

  await dbMap.clear(STORE_NAMES.DELETED_SOFATEAMS);
  for (const t of updatedTeams) {
    await dbMap.put(STORE_NAMES.DELETED_SOFATEAMS, { id: t, value: t });
  }

addDebugLog("tekst")
};

  // =====================
  // VRATI IZBRISANU LIGU + TIMOVE
  // =====================
// =====================
  // VRATI LIGU (bez automatskog vracanja timova)
  // =====================
const restoreSofaLeague = async (liga) => {
  if (!window.confirm(`Vratiti ligu ${liga}?`)) return;

  const updated = deletedSofaLeagues.filter(l => l !== liga);
  setDeletedSofaLeagues(updated);

  await dbMap.delete(STORE_NAMES.DELETED_SOFALIGUES, liga);

  setRestoredHighlight(prev => [...prev, liga]);
};

// =====================
  // VRATI POJEDINACNI TIM
  // =====================
const restoreSofaTeam = async (team) => {
  if (!window.confirm(`Vratiti tim ${team}?`)) return;

  const updated = deletedSofaTeams.filter(t => t !== team);
  setDeletedSofaTeams(updated);

  await dbMap.delete(STORE_NAMES.DELETED_SOFATEAMS, team);

  setRestoredHighlight(prev => [...prev, team]);
};
// =====================
// RESET SAMO OBRISANIH TIMOVA
// =====================
const resetDeletedSofaTeams = async () => {
  if (!window.confirm("Da li želiš da resetuješ sve obrisane timove?")) return;

  setDeletedSofaTeams([]);
  await dbMap.clear(STORE_NAMES.DELETED_SOFATEAMS);

addDebugLog("tekst")
};
  // =====================
  // RENDER
  // =====================
  const renderColumn = (title, items, selected, onClick, renderDelete=false) => (
    <div style={{ flex: 1, margin: 5 }}>
  <h3>{title} ({items.length})</h3>
      <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #ccc", padding: 5 }}>
{items.map((item, i) => {
  const isObject = typeof item === "object";

  const name = isObject ? item.name : item;
  const country = isObject ? item.country : null;

  return (
    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "2px 0" }}>
      <div
onClick={() => onClick(isObject ? `${name}|||${country}` : name)}
        style={{
          padding: "4px 8px",
          cursor: "pointer",
          backgroundColor:
            Array.isArray(selected)
? selected.includes(isObject ? `${name}|||${country}` : name)
                ? "#ffcc80"
                : restoredHighlight.includes(name)
                ? "#fff59d"
                : "#f0f0f0"
: selected === (isObject ? `${name}|||${country}` : name)
              ? "#ffcc80"
              : restoredHighlight.includes(name)
              ? "#fff59d"
              : "#f0f0f0",
          flex: 1
        }}
      >
        <div style={{ fontWeight: "bold" }}>
          {name}
        </div>

        {country && (
          <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
            ({country})
          </div>
        )}
      </div>

      {renderDelete && (
<button onClick={() => handleDeleteSofaLeague(`${item.name}|||${item.country}`)} style={{ marginLeft: 5 }}>
          🗑
        </button>
      )}
    </div>
  );
})}
      </div>
    </div>
  );
const sofaLeaguesWithCountry = useMemo(() =>
  sofaLeagues.map(l => {
    const [name, country] = l.split("|||");
    return { name, country };
  }),
  [sofaLeagues]
);

  return (
    <div style={{ padding: 20 }}>
      <h2>🗺 Mapiranje timova i liga</h2>

      <button onClick={onClose} style={{ marginBottom: 15 }}>
        ⬅ Nazad
      </button>
      <button onClick={resetDeletedSofaTeams} style={{ marginBottom: 15, marginLeft: 10 }}>
  ♻ Resetuj obrisane timove
</button>
     <button onClick={() => setShowDeletedLeagues(true)} style={{ marginLeft: 10 }}>
    📁 Izbrisane lige
  </button>

  <button onClick={() => setShowDeletedTeams(true)} style={{ marginLeft: 10 }}>
    📁 Izbrisani timovi
  </button>

      <div style={{ display: "flex", gap: 10 }}>
      <div style={{ marginBottom: 5 }}>
  <input
    type="text"
    placeholder="Pretraži Sofa tim..."
    value={searchTeam}
    onChange={(e) => {
      const val = e.target.value.trim();
      setSearchTeam(val);
      setSearchResult(val ? findSofaTeamLocation(val) : "");
    }}
    style={{ padding: 4, width: "200px" }}
  />
  {searchTeam && (
    <div style={{ marginTop: 2, color: "#ff9900", fontSize: 12 }}>
      {searchTeam}: {searchResult}
    </div>
  )}
</div>
        {renderColumn("Timovi Screen1", screen1Teams, selectedTeam1, v => handleTeamClick("screen1", v))}
        {renderColumn("Timovi Sofa", sofaTeams, selectedTeam2, v => handleTeamClick("sofa", v))}
        {renderColumn("Lige Screen1", screen1Leagues, selectedLeague1, v => handleLeagueClick("screen1", v))}
        {renderColumn(
  "Lige Sofa",
  sofaLeaguesWithCountry,
  selectedLeague2,
  v => handleLeagueClick("sofa", v),
  true
)}
      </div>
{showDeletedLeagues && (
<div style={{ background: "#f5f5f5", padding: 15, marginTop: 15, border: "1px solid #ccc" }}>
      <h3>Izbrisane lige</h3>
{[...deletedSofaLeagues]
  .sort((a, b) => a.localeCompare(b))
  .map((l, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5 }}>
          <span>{l}</span>
          <button onClick={() => restoreSofaLeague(l)}>↩ Vrati</button>
        </div>
      ))}
      <button onClick={() => setShowDeletedLeagues(false)}>Zatvori</button>
    </div>
  )}
{showDeletedTeams && (
<div style={{ background: "#f5f5f5", padding: 15, marginTop: 15, border: "1px solid #ccc" }}>
      <h3>Izbrisani timovi</h3>
{[...deletedSofaTeams]
  .filter(t => typeof t === "string")
  .sort((a, b) => a.localeCompare(b))
  .map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5 }}>
          <span>{t}</span>
          <button onClick={() => restoreSofaTeam(t)}>↩ Vrati</button>
        </div>
      ))}
      <button onClick={() => setShowDeletedTeams(false)}>Zatvori</button>
    </div>
  )}
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

    </div>
  );
}
