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
  .select("league_id");

const ids = (aliases || []).map(a => a.league_id);

const { data: leagues } = await supabase
  .from("sofa_leagues")
  .select("*")
  .in("id", ids)
  .order("name");

const { data: teams } = await supabase
  .from("sofa_teams")
  .select("*")
  .in("league_id", ids)
  .order("name");

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
console.log("Sofa leagues:", sofaLeagues.length);
console.log("Aliases:", leagueAliases.length);
console.log("Visible:", visibleSofaLeagues.length);
  // =====================
  // RENDER
  // =====================
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

{visibleSofaLeagues.map((liga) => (
  <div
    key={liga.id}
    className="accordion-item"
  >
    <div
      className="accordion-header"
      onClick={() =>
        setOpenSofa(openSofa === liga.id ? null : liga.id)
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{liga.name}</span>
        <span>{openSofa === liga.id ? "▲" : "▼"}</span>
      </div>
    </div>

    {openSofa === liga.id && (
      <div className="accordion-body">
        {sofaTeams
          .filter(t => t.league_id === liga.id)
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
