import { useMapStore } from "../stores/mapStore";
import React, { useMemo, useEffect, useState } from "react";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import { supabase } from "../supabase";
import {
  loadDeletedSofaLeagues,
  saveDeletedSofaLeagues,
  loadDeletedSofaTeams,
  saveDeletedSofaTeams,
  loadLeagueAliases,
  loadTeamAliases,
  insertTeamPairs,
  insertLeaguePairs
} from "../services/mapService";

import {
  insertTeamPairService,
  insertLeaguePairService,
  getPairedTeamsSet,
  getPairedLeaguesSet
} from "../services/mapService";
import { BrutalTracer } from "../brutalTracer";
window.BRUTAL = BrutalTracer;
window.BRUTAL_TRACE = BrutalTracer;

export default function MapScreen({ onClose }) {
useEffect(() => {
window.BRUTAL?.trace("lifecycle", { event: "MapScreen mounted" });
}, []);
  const { rows: screen1Rows } = useMatches();
  const { sofaRows } = useSofa();
  const [pairedScreen1Teams, setPairedScreen1Teams] = useState(new Set());
  const [pairedSofaTeams, setPairedSofaTeams] = useState(new Set());
  const [pairedScreen1Leagues, setPairedScreen1Leagues] = useState(new Set());
  const [pairedSofaLeagues, setPairedSofaLeagues] = useState(new Set());

useEffect(() => {
  async function loadPairs() {
    const paired = await getPairedTeamsSet();

    setPairedScreen1Teams(new Set(paired));
    setPairedSofaTeams(new Set(paired));
  }

  loadPairs();
}, []);

useEffect(() => {
  async function loadDeleted() {
    const leagues = await loadDeletedSofaLeagues();
    const teams = await loadDeletedSofaTeams();

    setDeletedSofaLeagues(leagues || []);
    setDeletedSofaTeams(teams || []);
  }

  loadDeleted();
}, []);

useEffect(() => {
  async function loadLeaguePairs() {
    const pairedLeagues = await getPairedLeaguesSet();

    const screen1 = new Set();
    const sofa = new Set();

    pairedLeagues.forEach(v => {
      const [alias, country] = v.split("|||");

      screen1.add((alias || "").trim());

      if (country) {
        sofa.add(`${alias.trim()}|||${country.trim()}`);
      } else {
        sofa.add(alias.trim());
      }
    });

    setPairedScreen1Leagues(screen1);
    setPairedSofaLeagues(sofa);
  }

  loadLeaguePairs();
}, []);
  // =====================
  // STORAGE – OBRISANE LIGE I TIMOVI
  // =====================
const {
  deletedSofaLeagues,
  setDeletedSofaLeagues,
  deletedSofaTeams,
  setDeletedSofaTeams
} = useMapStore();


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
new Set(
  screen1Rows
.map(r => (r.Liga || r.liga || "").trim())
    .filter(Boolean)
)
    ).sort((a, b) => a.localeCompare(b));
  }, [screen1Rows]);

const sofaLeaguesAll = useMemo(() => {
  if (!sofaRows) return [];

  const map = new Map();

  sofaRows.forEach(r => {
    const liga = r.Liga || r.liga;
    const country = r.Country || r.country;

    if (!liga) return;

    const key = liga + "||" + country;

    if (!map.has(key)) {
      map.set(key, { liga, country });
    }
  });

  return Array.from(map.values());
}, [sofaRows]);
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

const screen1Leagues = screen1LeaguesAll.filter(l =>
  !pairedScreen1Leagues.has((l || "").trim())
);

const sofaLeagues = sofaLeaguesAll.filter(l => {
  const key =
    typeof l === "object"
      ? `${(l.liga || "").trim()}|||${(l.country || "").trim()}`
      : `${(l || "").trim()}|||`;

  const normalizedKey = key.endsWith("|||")
    ? key.slice(0, -3)
    : key;

  const isDeleted = deletedSofaLeagues.some(d =>
    d?.liga === l.liga &&
    d?.country === l.country
  );

  return !isDeleted &&
    !pairedSofaLeagues.has(key) &&
    !pairedSofaLeagues.has(normalizedKey);
});

const screen1Teams = screen1TeamsAll.filter(t => !pairedScreen1Teams.has(t));
const deletedLeagueKeys = useMemo(() => {
  return new Set(
    deletedSofaLeagues.map(l => `${l.liga}|||${l.country || ""}`)
  );
}, [deletedSofaLeagues]);
const sofaTeams = sofaTeamsAll.filter(t => {
  const belongsToDeletedLeague = sofaRows?.some(r => {
    const teamMatch =
      r.domacin === t ||
      r.Domacin === t ||
      r.DOMACIN === t ||
      r.home === t ||
      r.Home === t ||
      r.gost === t ||
      r.Gost === t ||
      r.GOST === t ||
      r.away === t ||
      r.Away === t;

    if (!teamMatch) return false;

    const key = `${r.Liga || r.liga}|||${r.Country || r.country || ""}`;
    return deletedLeagueKeys.has(key);
  });

  return (
    !pairedSofaTeams.has(t) &&
    !deletedSofaTeams.includes(t) &&
    !belongsToDeletedLeague
  );
});
const sofaTeamsBase = sofaTeamsAll.filter(t => {
  const belongsToDeletedLeague = sofaRows?.some(r => {
    const teamMatch =
      r.domacin === t ||
      r.Domacin === t ||
      r.DOMACIN === t ||
      r.home === t ||
      r.Home === t ||
      r.gost === t ||
      r.Gost === t ||
      r.GOST === t ||
      r.away === t ||
      r.Away === t;

    if (!teamMatch) return false;

    const key = `${r.Liga || r.liga}|||${r.Country || r.country || ""}`;
    return deletedLeagueKeys.has(key);
  });

  return !deletedSofaTeams.includes(t) && !belongsToDeletedLeague;
});
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
  // =====================
  // SELEKCIJA
  // =====================
const selectedTeam1 = useMapStore(s => s.selectedTeam1);
const setSelectedTeam1 = useMapStore(s => s.setSelectedTeam1);

const selectedTeam2 = useMapStore(s => s.selectedTeam2);
const setSelectedTeam2 = useMapStore(s => s.setSelectedTeam2);

const selectedLeague1 = useMapStore(s => s.selectedLeague1);
const setSelectedLeague1 = useMapStore(s => s.setSelectedLeague1);

const selectedLeague2 = useMapStore(s => s.selectedLeague2);
const setSelectedLeague2 = useMapStore(s => s.setSelectedLeague2);

const debugLog = useMapStore(s => s.debugLog);
const addDebugLog = useMapStore(s => s.addDebugLog);

const restoredHighlight = useMapStore(s => s.restoredHighlight);
const setRestoredHighlight = useMapStore(s => s.setRestoredHighlight);

const showDeletedLeagues = useMapStore(s => s.showDeletedLeagues);
const setShowDeletedLeagues = useMapStore(s => s.setShowDeletedLeagues);

const showDeletedTeams = useMapStore(s => s.showDeletedTeams);
const setShowDeletedTeams = useMapStore(s => s.setShowDeletedTeams);

const searchTeam = useMapStore(s => s.searchTeam);
const setSearchTeam = useMapStore(s => s.setSearchTeam);

const searchResult = useMapStore(s => s.searchResult);
const setSearchResult = useMapStore(s => s.setSearchResult);

  // =====================
  // UPAARIVANJE TIMOVA
  // =====================
const confirmTeamPair = async (t1, t2) => {
window.BRUTAL?.trace("team_pair_confirm", { t1, t2 });
  if (!window.confirm(`Upariti timove:\n${t1} ↔ ${t2}?`)) return;

  // odmah skloni iz kolona
  setPairedScreen1Teams(prev => new Set([...prev, t1]));
  setPairedSofaTeams(prev => new Set([...prev, t2]));

  try {
    await insertTeamPairService(t1, t2);
  } catch (err) {
    console.log("❌ Team pair error:", err);
  }

  setSelectedTeam1(null);
  setSelectedTeam2(null);
};

  const handleTeamClick = (source, value) => {
window.BRUTAL?.trace("team_click", { source, value });
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
const confirmLeaguePair = async (screen1Liga, sofaObj) => {
window.BRUTAL?.trace("league_pair_confirm", {
  screen1Liga,
  sofaLiga: sofaObj?.liga,
  country: sofaObj?.country
});
  const sofaLiga = sofaObj.liga;
  const country = sofaObj.country || "";

  if (!window.confirm(`Upariti lige:\n${screen1Liga} ↔ ${sofaLiga} (${country})?`)) return;

  setPairedScreen1Leagues(prev =>
    new Set([...prev, screen1Liga])
  );

  setPairedSofaLeagues(prev =>
    new Set([...prev, `${sofaLiga}|||${country}`])
  );

  try {
    await insertLeaguePairService(
      screen1Liga,
      sofaLiga,
      country
    );
  } catch (err) {
    console.log("❌ League pair error:", err);
  }

  setSelectedLeague1(null);
};

  // 2. SUPABASE (ISTO KAO TIMOVI)
const handleLeagueClick = (source, value) => {
  window.BRUTAL?.trace("league_click", { source, value });

  if (source === "screen1") {
    if (Array.isArray(selectedLeague2) && selectedLeague2.length > 0) {
      selectedLeague2.forEach(l2 => confirmLeaguePair(value, l2));
      setSelectedLeague2([]);
    } else {
      setSelectedLeague1(value);
    }

    return;
  }

  if (source === "sofa") {
    setSelectedLeague2(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];

      const exists = safePrev.some(v =>
        v.liga === value.liga &&
        v.country === value.country
      );

      if (exists) {
        return safePrev.filter(v =>
          !(v.liga === value.liga && v.country === value.country)
        );
      }

      return [...safePrev, value];
    });
  }
};
  // =====================
  // TRAJNO BRISANJE LIGE + TIMOVA
  // =====================
const handleDeleteSofaLeague = async (obj) => {
  addDebugLog("tekst")
  if (!window.confirm(`Trajno obrisati ligu ${obj.liga} (${obj.country}) i sve timove?`)) return;

const updatedLeagues = [...deletedSofaLeagues, obj];
  setDeletedSofaLeagues(updatedLeagues);

await supabase.from("deleted_sofa_leagues").delete().neq("value", "");
await supabase.from("deleted_sofa_leagues").insert(
  updatedLeagues.map(l => ({ value: l }))
);

  const teamsToDelete = sofaRows
   .filter(r => {
  const ligaName = r.Liga || r.liga || "";
  const country = r.Country || r.country || "";

  return ligaName === obj.liga &&
         country === obj.country;
})
    .flatMap(r => [
      r.domacin, r.Domacin, r.DOMACIN, r.home, r.Home,
      r.gost, r.Gost, r.GOST, r.away, r.Away
    ].filter(Boolean));

  const updatedTeams = [...new Set([...deletedSofaTeams, ...teamsToDelete])];
  setDeletedSofaTeams(updatedTeams);

await supabase
  .from("deleted_sofa_teams")
  .delete()
  .neq("value", "");

for (let i = 0; i < updatedTeams.length; i += 200) {
  const chunk = updatedTeams
    .slice(i, i + 200)
    .map(t => ({ value: t }));

  const { error } = await supabase
    .from("deleted_sofa_teams")
    .insert(chunk);

  if (error) {
    addDebugLog("Chunk error: " + error.message);
    console.log(error);
  } else {
    addDebugLog("Inserted chunk: " + chunk.length);
  }
}
};

  // =====================
  // VRATI IZBRISANU LIGU + TIMOVE
  // =====================
// =====================
  // VRATI LIGU (bez automatskog vracanja timova)
  // =====================
const restoreSofaLeague = async (obj) => {
if (!window.confirm(`Vratiti ligu ${obj.liga} (${obj.country})?`)) return;

const updated = deletedSofaLeagues.filter(
  l => !(l.liga === obj.liga && l.country === obj.country)
);
  setDeletedSofaLeagues(updated);

  await supabase
  .from("deleted_sofa_leagues")
  .delete()
  .eq("value", liga);

  setRestoredHighlight(prev => [...prev, liga]);
};

// =====================
  // VRATI POJEDINACNI TIM
  // =====================
const restoreSofaTeam = async (team) => {
  if (!window.confirm(`Vratiti tim ${team}?`)) return;

  const updated = deletedSofaTeams.filter(t => t !== team);
  setDeletedSofaTeams(updated);

  await supabase
  .from("deleted_sofa_teams")
  .delete()
  .eq("value", team);

  setRestoredHighlight(prev => [...prev, team]);
};
// =====================
// RESET SAMO OBRISANIH TIMOVA
// =====================
const resetDeletedSofaTeams = async () => {
  if (!window.confirm("Da li želiš da resetuješ sve obrisane timove?")) return;

  setDeletedSofaTeams([]);
  await supabase
  .from("deleted_sofa_teams")
  .delete()
  .neq("value", "");

addDebugLog("tekst")
};
  // =====================
  // RENDER
  // =====================
const renderColumn = (
  title,
  items,
  selected,
  onClick,
  renderDelete = false
) => (
  <div style={{ flex: 1, margin: 5 }}>
    <h3>{title} ({items.length})</h3>

    <div
      style={{
        maxHeight: 400,
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: 5
      }}
    >
      {items.map((item, i) => {
        const isObject = typeof item === "object";

        const name = isObject ? item.liga : item;
        const country = isObject ? item.country : null;

const isSelected = Array.isArray(selected)
  ? selected.some(v =>
      v &&
      typeof v === "object" &&
      v.liga === name &&
      v.country === country
    )
  : selected &&
    typeof selected === "object"
  ? selected.liga === name &&
    selected.country === country
  : selected === name;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "2px 0"
            }}
          >
            <div
              onClick={() =>
                onClick(
                  isObject
                    ? { liga: name, country }
                    : name
                )
              }
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: isSelected
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
                <div
                  style={{
                    fontSize: 11,
                    color: "#777",
                    marginTop: 2
                  }}
                >
                  ({country})
                </div>
              )}
            </div>

            {renderDelete && (
              <button
                onClick={() =>
                  handleDeleteSofaLeague(item)
                }
                style={{ marginLeft: 5 }}
              >
                🗑
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
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
  sofaLeagues,
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
      <div
        key={i}
        style={{ display: "flex", gap: 10, marginBottom: 5 }}
      >
        <span>{l.liga} ({l.country})</span>

        <button onClick={() => restoreSofaLeague(l)}>
          ↩ Vrati
        </button>
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
