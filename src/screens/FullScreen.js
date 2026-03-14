import React, { useContext, useState, useMemo } from "react";
import "./FullScreen.css";
import countries from "./screen2/teamCountryMap/countries";
import { MatchesContext } from "../MatchesContext";
import { saveRows, saveConfirmedLeagues } from "../db1";

export default function FullScreen({ onClose }) {
  const { rows, setRows, teamAliases, setTeamAliases } = useContext(MatchesContext);
  const [confirmedLeagues, setConfirmedLeagues] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);

  // --- grupišemo lige po zemlji ---
  const leaguesByCountry = useMemo(() => {
    const result = {};
    if (!rows) return result;

    const countryAliases = {
      "sad": "SAD",
      "usa": "SAD",
      "uae": "Ujedinjeni Arapski Emirati",
      "australia": "Australija",
      "austarlija": "Australija",
      "madjarska": "Mađarska",
      "republika irska": "Irska",
      "r. irska": "Irska",
      "kineski tajpej": "Tajvan",
      "saint kits i nevis": "Sveti Kits i Nevis",
      "južna afrika": "Južna Afrika",
      "makedonija": "Severna Makedonija",
      "san marino": "San Marino",
      "venecuela": "Venecuela",
      "zambija": "Zambija",
      "farska ostrva": "Farska Ostrva",
      "gibraltar": "Gibraltar",
    };

    const internationalKeywords = [
      "liga šampiona","liga evrope","liga konferencije",
      "libertadores","concacaf","azija","kup evrope",
      "svetsko prvenstvo","evropsko prvenstvo","međunarodne",
      "prijateljske","afc","ofc","cosafa","superkup",
      "kvalifikacije","prvenstvo južne amerike"
    ];

    rows.forEach(match => {
      let countryName = "Ostalo";
      const ligaLower = (match.liga || "").toLowerCase();

      if (internationalKeywords.some(k => ligaLower.includes(k))) {
        countryName = "Međunarodno";
      } else {
        Object.keys(countryAliases).forEach(alias => {
          if (ligaLower.startsWith(alias)) countryName = countryAliases[alias];
        });

        if (countryName !== "Međunarodno") {
          const found = Object.values(countries).find(c => (match.liga||"").toLowerCase().startsWith(c.name.toLowerCase()));
          if (found) countryName = found.name;
        }
      }

      if (!result[countryName]) result[countryName] = [];
      if (!result[countryName].some(l => l.leagueId === `${countryName}-${match.liga}`)) {
        result[countryName].push({ name: match.liga, leagueId: `${countryName}-${match.liga}` });
      }
    });

    Object.keys(result).forEach(c => result[c].sort((a,b)=>a.name.localeCompare(b.name)));

    return result;
  }, [rows]);

  // --- tabela lige ---
  const getLeagueTable = (liga) => {
    const table = {};
    rows.filter(m=>m.liga===liga).forEach(m=>{
      const [hGoal, aGoal] = (m.ft || "0:0").split(":").map(Number);
      const home = teamAliases[m.home] || m.home;
      const away = teamAliases[m.away] || m.away;

      if (!table[home]) table[home] = { team: home, teamId: `${liga}-${home}`, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
      if (!table[away]) table[away] = { team: away, teamId: `${liga}-${away}`, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };

      table[home].mp++; table[away].mp++;
      table[home].gf+=hGoal; table[home].ga+=aGoal;
      table[away].gf+=aGoal; table[away].ga+=hGoal;

      if (hGoal>aGoal){ table[home].w++; table[home].pts+=3; table[away].l++; }
      else if (hGoal<aGoal){ table[away].w++; table[away].pts+=3; table[home].l++; }
      else { table[home].d++; table[away].d++; }

      table[home].gd = table[home].gf - table[home].ga;
      table[away].gd = table[away].gf - table[away].ga;
    });

    return Object.values(table).sort((a,b)=>b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  // --- merge tima ---
  const mergeTeams = (teamName) => {
    const standardName = prompt(`Upiši standardno ime tima (ime koje treba da ostane):`);
    if (!standardName) return;
    const confirmMerge = window.confirm(`Da li želiš da "${teamName}" postane "${standardName}"?`);
    if (!confirmMerge) return;

    setTeamAliases(prev=>({...prev, [teamName]: standardName}));

    const updatedRows = rows.map(r=>({
      ...r,
      home: r.home===teamName ? standardName : r.home,
      away: r.away===teamName ? standardName : r.away
    }));
    setRows(updatedRows);
    saveRows(updatedRows);
  };

  const confirmLeagueTeams = (leagueName) => {
    const teams = getLeagueTable(leagueName).map(t=>t.team);
    const updated = {...confirmedLeagues, [leagueName]: teams};
    setConfirmedLeagues(updated);
    saveConfirmedLeagues(updated);
    alert(`Liga '${leagueName}' je potvrđena.`);
  };

  // --- render logika ---
  return (
    <div className="full-screen-container">
      <button className="close-button" onClick={onClose}>X Close</button>

      { !selectedCountry ? (
        <ul>
          {Object.keys(leaguesByCountry).map((country, idx)=>(
            <li key={idx}>
              <h3 onClick={()=>{setSelectedCountry(country); setSelectedLeague(null)}}>
                {idx+1}. {(countries ? Object.values(countries).find(c=>c.name===country)?.flag : null) || "🏳️"} {country}
              </h3>
            </li>
          ))}
        </ul>
      ) : !selectedLeague ? (
        <ul>
          <li>
            <button onClick={()=>setSelectedCountry(null)}>← Nazad na zemlje</button>
          </li>
          {leaguesByCountry[selectedCountry].map((ligaObj, idx)=>(
            <li key={idx}>
              <div onClick={()=>setSelectedLeague(ligaObj.leagueId)}>
                {ligaObj.name} {confirmedLeagues[ligaObj.name] ? "✅" : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <button onClick={()=>setSelectedLeague(null)}>← Nazad na lige</button>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Tim</th><th>Team ID</th><th>Merge</th>
                <th>MP</th><th>W</th><th>D</th><th>L</th>
                <th>GF</th><th>GA</th><th>GD</th><th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {getLeagueTable(selectedLeague.split("-")[1]).map((t,i)=>(
                <tr key={i}>
                  <td>{i+1}</td>
                  <td>{t.team}</td>
                  <td>{t.teamId}</td>
                  <td><button onClick={()=>mergeTeams(t.team)}>Spoji</button></td>
                  <td>{t.mp}</td><td>{t.w}</td><td>{t.d}</td><td>{t.l}</td>
                  <td>{t.gf}</td><td>{t.ga}</td><td>{t.gd}</td><td>{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={()=>confirmLeagueTeams(selectedLeague.split("-")[1])}>✅ Potvrdi listu timova</button>
        </div>
      )}
    </div>
  );
}
