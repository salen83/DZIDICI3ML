import React, { useContext, useState } from "react";
import "./FullScreen.css";
import countries from "./screen2/teamCountryMap/countries";
import { MatchesContext } from "../MatchesContext";
import { supabase } from "../supabase";

export default function FullScreen({ onClose }) {
  const { rows, setRows, teamAliases, setTeamAliases } = useContext(MatchesContext);
  const [openCountry, setOpenCountry] = useState(null);
  const [openLeague, setOpenLeague] = useState(null);
  const [confirmedLeagues, setConfirmedLeagues] = useState({});
const [importStatus, setImportStatus] = useState("");
const [sofaLeagueId, setSofaLeagueId] = useState("");
const [sofaCountryId, setSofaCountryId] = useState("");

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
const importSofaTeams = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
if (!sofaLeagueId || !sofaCountryId) {
  setImportStatus("❌ Unesi League ID i Country ID");
  return;
}

  try {
    const text = await file.text();

    let teams = [];

    if (file.name.endsWith(".json")) {
      teams = JSON.parse(text);
    } else {
const lines = text.trim().split("\n");

const header = lines[0].split(",");

const idIndex = header.findIndex(h =>
  h.trim().toLowerCase() === "teamid"
);

const nameIndex = header.findIndex(h =>
  h.trim().toLowerCase() === "teamname"
);

teams = lines.slice(1).map(line => {
  const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
    .map(v => v.replace(/^"|"$/g, ""));

  return {
    id: Number(values[idIndex]),
    name: values[nameIndex]
  };
});
}
const leagueRows = teams.map(t => ({
    league_id: Number(sofaLeagueId),
    team_id: Number(t.id || t.teamId)
}));

const teamRows = teams.map(t => ({
    id: Number(t.id || t.teamId),
    name: t.name || t.teamName,
    country_id: Number(sofaCountryId)
}));

console.log("=== IMPORT START ===");
console.log("Broj timova:", rows.length);
console.log("Prvi tim:", rows[0]);
console.log("Svi timovi:", rows);

console.log("Provera postojećih timova...");

const ids = teamRows.map(t => t.id);


const { data: existing, error: checkError } = await supabase
  .from("sofa_teams")
  .select("id")
  .in("id", ids);


if (checkError) {
  throw checkError;
}


const existingIds = existing.map(t => t.id);


const newTeams = teamRows.filter(
  t => !existingIds.includes(t.id)
);


console.log("Novi timovi za unos:", newTeams);


if (newTeams.length > 0) {

  const { error: insertTeamsError } = await supabase
    .from("sofa_teams")
    .insert(newTeams);


  if (insertTeamsError) {
    throw insertTeamsError;
  }

}


console.log("Svi timovi postoje u sofa_teams");


console.log("Upis veze liga-tim...");

const { data: inserted, error } = await supabase
  .from("sofa_league_teams")
  .upsert(leagueRows)
  .select();

console.log("Supabase response data:", inserted);
console.log("Supabase response error:", error);

if (error) {
  console.error("DETALJNA GREŠKA:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });

  throw error;
}
console.log("Timovi uspešno ubačeni u sofa_teams");
console.log("=== IMPORT KRAJ ===");

    setImportStatus(
"✅ Ubačeno timova: " + leagueRows.length
    );

  } catch (err) {
    setImportStatus(
      "❌ Greška: " + err.message
    );
  }
};

  return (
    <div className="full-screen-container">
      <button className="close-button" onClick={onClose}>X Close</button>
<div style={{margin:"15px 0"}}>
  <h3>Sofa League Teams Import</h3>

  <input
    type="number"
    placeholder="League ID"
    value={sofaLeagueId}
    onChange={(e)=>setSofaLeagueId(e.target.value)}
  />

  <input
    type="number"
    placeholder="Country ID"
    value={sofaCountryId}
    onChange={(e)=>setSofaCountryId(e.target.value)}
  />

  <input
    type="file"
    accept=".csv,.json"
    onChange={importSofaTeams}
  />

  <div>
    {importStatus}
  </div>
</div>
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
