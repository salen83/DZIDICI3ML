import React, { useContext, useState } from "react";
import "./FullScreen.css";
import countries from "./screen2/teamCountryMap/countries";
import { MatchesContext } from "../MatchesContext";
import { saveRows, saveConfirmedLeagues } from "../db1";

export default function FullScreen({ onClose }) {
  const { rows, setRows, teamAliases, setTeamAliases } = useContext(MatchesContext);
  const [openCountry, setOpenCountry] = useState(null);
  const [openLeague, setOpenLeague] = useState(null);
  const [confirmedLeagues, setConfirmedLeagues] = useState({});

  const leaguesByCountry = {};
  if (rows) {
    rows.forEach(match => {
      let countryName = "Ostalo";
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
        "liga šampiona",
        "liga evrope",
        "liga konferencije",
        "libertadores",
        "concacaf",
        "azija",
        "kup evrope",
        "svetsko prvenstvo",
        "evropsko prvenstvo",
        "međunarodne",
        "prijateljske",
        "afc",
        "ofc",
        "cosafa",
        "superkup",
        "kvalifikacije",
        "prvenstvo južne amerike",
      ];

      if (internationalKeywords.some(k => (match.liga || "").toLowerCase().includes(k))) {
        countryName = "Međunarodno";
      }

      const ligaLower = (match.liga || "").toLowerCase();
      Object.keys(countryAliases).forEach(alias => {
        if (ligaLower.startsWith(alias)) {
          countryName = countryAliases[alias];
        }
      });

      if (countryName !== "Međunarodno") {
        const found = Object.values(countries).find(c =>
          (match.liga || "").toLowerCase().startsWith(c.name.toLowerCase())
        );
        if (found) countryName = found.name;
      }

      if (!leaguesByCountry[countryName]) leaguesByCountry[countryName] = [];
      if (!leaguesByCountry[countryName].some(l => l.leagueId === `${countryName}-${match.liga}`)) {
        leaguesByCountry[countryName].push({
          name: match.liga,
          leagueId: `${countryName}-${match.liga}`
        });
      }
    });

    for (let country in leaguesByCountry) {
      leaguesByCountry[country].sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  const getLeagueTable = (liga) => {
    const table = {};
    rows
      .filter(m => m.liga === liga)
      .forEach(m => {
        const [hGoal, aGoal] = (m.ft || "0:0").split(":").map(Number);
        const home = teamAliases[m.home] || m.home;
        const away = teamAliases[m.away] || m.away;

        if (!table[home]) table[home] = { team: home, teamId: `${liga}-${home}`, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
        if (!table[away]) table[away] = { team: away, teamId: `${liga}-${away}`, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };

        table[home].mp++; table[away].mp++;
        table[home].gf += hGoal; table[home].ga += aGoal;
        table[away].gf += aGoal; table[away].ga += hGoal;

        if (hGoal > aGoal) {
          table[home].w++; table[home].pts += 3; table[away].l++;
        } else if (hGoal < aGoal) {
          table[away].w++; table[away].pts += 3; table[home].l++;
        } else {
          table[home].d++; table[away].d++;
        }

        table[home].gd = table[home].gf - table[home].ga;
        table[away].gd = table[away].gf - table[away].ga;
      });

    return Object.values(table)
      .filter(t => t.team && t.team.trim() !== "") // ✅ filtriraj prazne timove
      .sort((a,b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  const mergeTeams = (teamName) => {
    const standardName = prompt("Upiši standardno ime tima (ime koje treba da ostane):");
    if (!standardName) return;

    const confirmMerge = window.confirm(`Da li želiš da "${teamName}" postane "${standardName}"?`);
    if (!confirmMerge) return;

    setTeamAliases(prev => ({ ...prev, [teamName]: standardName }));

    const updatedRows = rows.map(r => ({
      ...r,
      home: r.home === teamName ? standardName : r.home,
      away: r.away === teamName ? standardName : r.away
    }));
    setRows(updatedRows);
    saveRows(updatedRows);
  };

  const confirmLeagueTeams = (leagueName) => {
    const teams = getLeagueTable(leagueName)
      .map(t => t.team)
      .filter(t => t && t.trim() !== ""); // ✅ ukloni prazne timove

    const updated = { ...confirmedLeagues, [leagueName]: teams };
    setConfirmedLeagues(updated);
    saveConfirmedLeagues(updated);

    alert("Liga '" + leagueName + "' je potvrđena.");
  };

  return (
    <div className="full-screen-container">
      <button className="close-button" onClick={onClose}>X Close</button>
      <ul>
        {Object.entries(leaguesByCountry).map(([country, leagues], index) => (
          <li key={index} className="country-block">
            <h3 onClick={() => setOpenCountry(openCountry === country ? null : country)}>
{index + 1}. {(countries ? Object.values(countries).find(c => c.name === country)?.flag : "🏳️")} {country}
            </h3>
            {openCountry === country && (
              <ul>
                {leagues.map((ligaObj, i) => (
                  <li key={i}>
                    <div onClick={() => setOpenLeague(openLeague === ligaObj.leagueId ? null : ligaObj.leagueId)}>
                      {ligaObj.name} {confirmedLeagues[ligaObj.name] ? "✅" : ""}
                    </div>
                    {openLeague === ligaObj.leagueId &&
                     !["kup","prijatelj","liga šampiona","liga evrope","liga konferencije"]
                     .some(k => ligaObj.name.toLowerCase().includes(k)) && (
                      <div>
                        <button onClick={() => confirmLeagueTeams(ligaObj.name)}>✅ Potvrdi listu timova</button>
                        <table>
                          <thead>
                            <tr>
                              <th>#</th><th>Tim</th><th>Team ID</th><th>Merge</th>
                              <th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getLeagueTable(ligaObj.name).map((t, i) => (
                              <tr key={i}>
                                <td>{i+1}</td>
                                <td>{t.team}</td>
                                <td>{t.teamId}</td>
                                <td><button onClick={() => mergeTeams(t.team)}>Spoji</button></td>
                                <td>{t.mp}</td><td>{t.w}</td><td>{t.d}</td><td>{t.l}</td>
                                <td>{t.gf}</td><td>{t.ga}</td><td>{t.gd}</td><td>{t.pts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
