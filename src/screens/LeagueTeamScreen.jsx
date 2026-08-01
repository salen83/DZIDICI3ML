import React, { useState, useMemo, useEffect } from "react";
import { useContext } from "react";
import { MatchesContext } from "../MatchesContext";
import { supabase } from "../supabase";
import "./LeagueTeamScreen.css";

export default function LeagueTeamScreen({ onClose }) {

const { futureMatches: screen3Rows } = useContext(MatchesContext);

const [openScreen3, setOpenScreen3] = useState(null);
const [openSofa, setOpenSofa] = useState(null);

const [sofaLeagues, setSofaLeagues] = useState([]);
const [sofaTeams, setSofaTeams] = useState([]);
const [leagueAliases, setLeagueAliases] = useState([]); 
const [selectedScreenTeam, setSelectedScreenTeam] = useState(null);
const [teamSearch, setTeamSearch] = useState(""); 
// =====================
  // FUNKCIJA ZA TIMOVE PO LIGAMA
  // =====================
  const getTeamsByLeague = (rows) => {
    const map = {};
    if (!rows) return map;

    rows.forEach(r => {
      const liga =
        (r.liga ||
         r.Liga ||
         r.league ||
         r.League ||
         r.competition ||
         r.Competition ||
         "").trim();

      const country =
        (r.Country ||
         r.country ||
         r.Država ||
         r.drzava ||
         "").trim();

      const key = `${liga}|||${country}`;

      const home =
        (r.domacin ||
         r.Domacin ||
         r.DOMACIN ||
         r.home ||
         r.Home ||
         "").trim();

      const away =
        (r.gost ||
         r.Gost ||
         r.GOST ||
         r.away ||
         r.Away ||
         "").trim();

      if (!liga) return;

      if (!map[key]) map[key] = [];
      if (home && !map[key].includes(home)) map[key].push(home);
      if (away && !map[key].includes(away)) map[key].push(away);
    });

    return map;
  };

useEffect(() => {
  loadSofa();
}, []);

async function loadSofa() {

const { data: aliases } = await supabase
  .from("league_aliases")
  .select("league_id, type");

const ids = (aliases || []).map(a => a.league_id);

console.log("League IDs:", ids);
console.log("Sadrži 10307?", ids.includes(10307), ids.includes("10307"));

const { data: leagues } = await supabase
  .from("sofa_leagues")
  .select("*")
  .in("id", ids)
  .order("name");

async function loadAllSofaTeams(ids) {
  let all = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("sofa_teams")
      .select("*")
      .in("league_id", ids)
      .range(from, from + step - 1);

    if (error) throw error;

    all = [...all, ...(data || [])];

    if (!data || data.length < step) {
      break;
    }

    from += step;
  }

  return all;
}

const teams1 = await loadAllSofaTeams(ids);

console.log("teams1 ukupno:", teams1?.length);
console.table(
  (teams1 || []).filter(t => Number(t.league_id) === 10307)
);
console.table(
  (teams1 || []).filter(t => Number(t.league_id) === 10307)
);

async function loadAllSofaLeagueTeams(ids) {
  let all = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("sofa_league_teams")
      .select("*")
      .in("league_id", ids)
      .range(from, from + step - 1);

    if (error) throw error;

    all = [...all, ...(data || [])];

    if (!data || data.length < step) {
      break;
    }

    from += step;
  }

  return all;
}

const teams2 = await loadAllSofaLeagueTeams(ids);

console.log("teams2 ukupno:", teams2.length);
console.table(
  teams2.filter(t => Number(t.league_id) === 10307)
);
console.log(
  "teams2 liga 853:",
  teams2.filter(t => t.league_id === 853)
);
// spoji izvore prema type
const leagueTypeMap = {};

(aliases || []).forEach(a => {
  leagueTypeMap[Number(a.league_id)] = a.type;
});

const teams = [
  ...(teams1 || [])
    .filter(t => leagueTypeMap[Number(t.league_id)] === "league"),

  ...(teams2 || [])
    .filter(t => leagueTypeMap[Number(t.league_id)] === "cup")
    .map(t => ({
      id: t.team_id,
      name: t.team_name,
      league_id: t.league_id,
      country_id: t.country_id
    }))
];
console.log(
  "Ima li 55509 u teams1:",
  teams1?.find(t => t.id === 55509)
);
console.log("Svi sofaTeams:", teams.length);
console.table(
  teams.filter(t => Number(t.league_id) === 10307)
);
console.log(
  "Sofa teams liga 853:",
  teams.filter(t => t.league_id === 853)
);
console.log(
  "PROVERA SVIH TIMOVA ZA LIGU:",
  sofaTeams.filter(t => Number(t.league_id) === 10307)
);
  setSofaLeagues(leagues || []);
  setSofaTeams(teams || []);
  setLeagueAliases(aliases || []);
}
async function saveTeamAlias(sofaTeam) {

  if (!selectedScreenTeam) {
    alert("Prvo izaberi tim sa leve strane");
    return;
  }

  const { error } = await supabase
    .from("team_aliases")
    .insert({
      team_id: sofaTeam.id,
      alias: selectedScreenTeam,
      league_id: sofaTeam.league_id,
      country_id: sofaTeam.country_id
    });

  if (error) {
    console.log(error);

    if (error.code === "23505") {
      alert("Ovo mapiranje već postoji");
    } else {
      alert("Greška pri upisu");
    }

    return;
  }

  alert(
    selectedScreenTeam +
    " → " +
    sofaTeam.name +
    " sačuvano"
  );

  setSelectedScreenTeam(null);
}
  // =====================
  // SCREEN3 I SOFA TIMOVI PO LIGAMA
  // =====================
const screen3Teams =
  useMemo(() => getTeamsByLeague(screen3Rows), [screen3Rows]);

const screen3Leagues =
  useMemo(() => Object.keys(screen3Teams).sort(), [screen3Teams]);

const visibleSofaLeagues = useMemo(() => {
  const ids = new Set(
    leagueAliases.map(a => Number(a.league_id))
  );

  return sofaLeagues.filter(l => ids.has(l.id));
}, [sofaLeagues, leagueAliases]);
console.log(
  "liga 853 u sofaLeagues:",
  sofaLeagues.find(l => l.id === 853)
);

console.log(
  "timovi koji ce se prikazati za 853:",
  sofaTeams.filter(t => t.league_id === 853)
);
console.log("Sofa leagues:", sofaLeagues.length);
console.log("Aliases:", leagueAliases.length);
console.log("Visible:", visibleSofaLeagues.length);
  // =====================
  // RENDER
  // =====================
console.table(
  sofaTeams
    .filter(t => Number(t.league_id) === 10307)
    .map(t => ({
      id: t.id,
      name: t.name,
      league_id: t.league_id
    }))
);
  return (
    <div className="league-wrapper">
      <button className="back-btn" onClick={onClose}>⬅ Nazad</button>

      <div className="columns">

       {/* SCREEN3 PANEL */}
        <div className="panel">
          <div className="panel-title">Screen3 Lige</div>
           {screen3Leagues.map((liga, i) => (
            <div key={i} className="accordion-item">
              <div
                className="accordion-header"
                onClick={() =>
                 setOpenScreen3(openScreen3 === liga ? null : liga)
                }
              >
                {liga} <span>{openScreen3 === liga ? "▲" : "▼"}</span>
              </div>

              {openScreen3 === liga && (
                <div className="accordion-body">
                  {screen3Teams[liga]?.map((t, idx) => (
<div
  key={idx}
  className="team"
  onClick={() => setSelectedScreenTeam(t)}
  style={{
    cursor: "pointer",
    background:
      selectedScreenTeam === t
        ? "#ddd"
        : "transparent"
  }}
>
  {idx + 1}. {t}
</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* SOFA PANEL PO LIGAMA */}
<div className="panel">
<div className="panel-title">Sofa Lige</div>

<input
  className="league-search"
  placeholder="Pretraga timova..."
  value={teamSearch}
  onChange={(e) => setTeamSearch(e.target.value)}
/>

{visibleSofaLeagues.map((liga) => (
  <div
    key={liga.id}
    className="accordion-item"
  >
    <div
      className="accordion-header"
onClick={() => {
  setOpenSofa(openSofa === liga.id ? null : liga.id);
  setTeamSearch("");
}}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{liga.name}</span>
        <span>{openSofa === liga.id ? "▲" : "▼"}</span>
      </div>
    </div>

    {openSofa === liga.id && (
      <div className="accordion-body">
{sofaTeams
  .filter(t =>
    Number(t.league_id) === Number(liga.id)
  )
  .filter(t =>
    (t.name || "")
      .toLowerCase()
      .includes(teamSearch.toLowerCase())
  )
  .map((t, idx) => (
<div
  key={t.id}
  className="team"
  onClick={() => saveTeamAlias(t)}
  style={{
    cursor: "pointer"
  }}
>
  {idx + 1}. {t.name}
</div>
          ))}
      </div>
    )}
  </div>
))}
</div>

      </div>
    </div>
  );
}
