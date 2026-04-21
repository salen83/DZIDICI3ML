import React, { useContext, useMemo, useState } from "react";
import { MatchesContext } from "../MatchesContext";
import { ensureTeam } from "./screen2/teamCountryMap";
import TeamCountryMap from "./screen2/teamCountryMap/TeamCountryMap";
import "./Screen2.css";

export default function Screen2() {
  const { rows } = useContext(MatchesContext);
  const [activeTeam, setActiveTeam] = useState("");
  const [showTeamMap, setShowTeamMap] = useState(false);

  const calculateStats = (rows) => {
    const teams = {};
    const byLeague = {};

    rows.forEach(r => {
      if (!r.home || !r.away) return;
      const [homeGoals, awayGoals] = (r.ft || "0:0").split(":").map(Number);

      [[r.home, homeGoals, awayGoals],[r.away, awayGoals, homeGoals]].forEach(([team, gf, ga]) => {
        if (!teams[team]) teams[team] = { games:0, goalsFor:0, goalsAgainst:0, GG:0, NG:0, twoPlus:0, sevenPlus:0, last5:[] };
        teams[team].games +=1;
        teams[team].goalsFor += gf;
        teams[team].goalsAgainst += ga;
        teams[team].GG += (gf>0 && ga>0 ? 1:0);
        teams[team].NG += (gf===0 || ga===0 ?1:0);
        teams[team].twoPlus += ((gf+ga)>=2?1:0);
        teams[team].sevenPlus += ((gf+ga)>=7?1:0);
        teams[team].last5.push({gf,ga});
        if (teams[team].last5.length>5) teams[team].last5.shift();

        const guessedCountry = r.liga?.split(" ")[0] || "";
        ensureTeam(team, guessedCountry, "");
      });

      if (!byLeague[r.home]) byLeague[r.home]={};
      if (!byLeague[r.away]) byLeague[r.away]={};
      if (!byLeague[r.home][r.liga]) byLeague[r.home][r.liga] = { games:0, goalsFor:0, goalsAgainst:0, GG:0, NG:0, twoPlus:0, sevenPlus:0 };
      if (!byLeague[r.away][r.liga]) byLeague[r.away][r.liga] = { games:0, goalsFor:0, goalsAgainst:0, GG:0, NG:0, twoPlus:0, sevenPlus:0 };

      byLeague[r.home][r.liga].games +=1;
      byLeague[r.home][r.liga].goalsFor += homeGoals;
      byLeague[r.home][r.liga].goalsAgainst += awayGoals;
      byLeague[r.home][r.liga].GG += (homeGoals>0 && awayGoals>0?1:0);
      byLeague[r.home][r.liga].NG += (homeGoals===0 || awayGoals===0?1:0);
      byLeague[r.home][r.liga].twoPlus += ((homeGoals+awayGoals)>=2?1:0);
      byLeague[r.home][r.liga].sevenPlus += ((homeGoals+awayGoals)>=7?1:0);

      byLeague[r.away][r.liga].games +=1;
      byLeague[r.away][r.liga].goalsFor += awayGoals;
      byLeague[r.away][r.liga].goalsAgainst += homeGoals;
      byLeague[r.away][r.liga].GG += (homeGoals>0 && awayGoals>0?1:0);
      byLeague[r.away][r.liga].NG += (homeGoals===0 || awayGoals===0?1:0);
      byLeague[r.away][r.liga].twoPlus += ((homeGoals+awayGoals)>=2?1:0);
      byLeague[r.away][r.liga].sevenPlus += ((homeGoals+awayGoals)>=7?1:0);
    });

    Object.keys(teams).forEach(team=>{
      const last5 = teams[team].last5.slice(-5);
      teams[team].GG5 = last5.filter(m=>m.gf>0 && m.ga>0).length;
      teams[team].NG5 = last5.filter(m=>m.gf===0 || m.ga===0).length;
      teams[team].twoPlus5 = last5.filter(m=>m.gf+m.ga>=2).length;
      teams[team].avg5 = last5.length?(last5.reduce((sum,m)=>sum+m.gf+m.ga,0)/last5.length).toFixed(2):0;
    });

    const sortedTeams = Object.fromEntries(Object.entries(teams).sort((a,b)=>b[1].games - a[1].games));
    return { teams: sortedTeams, byLeague };
  };

  const { teams: teamStats, byLeague } = useMemo(()=>calculateStats(rows||[]), [rows]);

  const handleTeamClick = (team)=>{ setActiveTeam(activeTeam===team?"":team); };

  return (
    <div className="screen2-container">
      <button onClick={()=>setShowTeamMap(true)} style={{marginBottom:'10px'}}>Otvori mapu tim → država</button>

      {showTeamMap && <TeamCountryMap onClose={()=>setShowTeamMap(false)} />}

      <table>
        <tbody>
          {Object.entries(teamStats).map(([team, stats], index)=>(
            <React.Fragment key={team}>
              <tr>
                <td>{index+1}</td>
                <td onClick={()=>handleTeamClick(team)}>{team}</td>
                <td>{stats.games}</td>
                <td>{stats.goalsFor}</td>
                <td>{stats.goalsAgainst}</td>
              </tr>
              {activeTeam===team && (
                <tr>
                  <td colSpan="5">
                    {Object.entries(byLeague[team]).map(([liga,lstats])=>(
                      <div key={liga}>
                        <b>{liga}</b> - G:{lstats.goalsFor}, GA:{lstats.goalsAgainst}
                      </div>
                    ))}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
