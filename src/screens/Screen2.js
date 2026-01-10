import React, { useContext, useMemo, useState, useRef } from "react";
import { MatchesContext } from "../MatchesContext";
import "./Screen2.css";

export default function Screen2() {
  const { rows } = useContext(MatchesContext);
  const [openCol, setOpenCol] = useState("");
  const [activeTeam, setActiveTeam] = useState("");

  const [colWidths, setColWidths] = useState({
    rb: 30, team: 90, games: 50, G: 40, GA: 40, GG: 50, NG: 50, twoPlus: 50, sevenPlus: 50, AVG: 60, GG5: 50, NG5: 50, twoPlus5: 60
  });
  const resizingCol = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const startResize = (e, colKey) => {
    resizingCol.current = colKey;
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    startWidth.current = colWidths[colKey];
    e.preventDefault();
  };

  const onResize = (e) => {
    if (!resizingCol.current) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = currentX - startX.current;
    setColWidths(prev => ({
      ...prev,
      [resizingCol.current]: Math.max(0, startWidth.current + delta)
    }));
  };

  const endResize = () => { resizingCol.current = null; };

  // Sortiramo timove po ukupno odigranim utakmicama
  const calculateStats = (rows) => {
    const teams = {};
    const byLeague = {};

    rows.forEach(r => {
      if (!r.home || !r.away) return;
      const [homeGoals, awayGoals] = (r.ft || "0:0").split(":").map(Number);

      if (!teams[r.home]) teams[r.home] = { games: 0, goalsFor: 0, goalsAgainst: 0, GG: 0, NG: 0, twoPlus: 0, sevenPlus: 0, last5: [] };
      if (!teams[r.away]) teams[r.away] = { games: 0, goalsFor: 0, goalsAgainst: 0, GG: 0, NG: 0, twoPlus: 0, sevenPlus: 0, last5: [] };
      if (!byLeague[r.home]) byLeague[r.home] = {};
      if (!byLeague[r.away]) byLeague[r.away] = {};
      if (!byLeague[r.home][r.liga]) byLeague[r.home][r.liga] = { games: 0, goalsFor: 0, goalsAgainst: 0, GG: 0, NG: 0, twoPlus: 0, sevenPlus: 0 };
      if (!byLeague[r.away][r.liga]) byLeague[r.away][r.liga] = { games: 0, goalsFor: 0, goalsAgainst: 0, GG: 0, NG: 0, twoPlus: 0, sevenPlus: 0 };

      [[r.home, homeGoals, awayGoals],[r.away, awayGoals, homeGoals]].forEach(([team, gf, ga]) => {
        teams[team].games +=1;
        teams[team].goalsFor += gf;
        teams[team].goalsAgainst += ga;
        teams[team].GG += (gf>0 && ga>0 ? 1:0);
        teams[team].NG += (gf===0 || ga===0 ?1:0);
        teams[team].twoPlus += ((gf+ga)>=2?1:0);
        teams[team].sevenPlus += ((gf+ga)>=7?1:0);
        teams[team].last5.push({gf,ga});
        if (teams[team].last5.length>5) teams[team].last5.shift();
      });

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

    // sortiramo po ukupno odigranim utakmicama desc
    const sortedTeams = Object.fromEntries(Object.entries(teams).sort((a,b)=>b[1].games - a[1].games));

    return { teams: sortedTeams, byLeague };
  };

  const { teams: teamStats, byLeague } = useMemo(()=>calculateStats(rows||[]), [rows]);

  const toggleColHelp = (col)=>{ setOpenCol(openCol===col?"":col); };
  const handleTeamClick = (team)=>{ setActiveTeam(activeTeam===team?"":team); };

  return (
    <div className="screen2-container" onTouchMove={onResize} onTouchEnd={endResize}>
      <table>
        <thead>
          <tr>
            <th style={{width:colWidths.rb}}>#<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'rb')} onMouseDown={e=>startResize(e,'rb')}>⇔</div></th>
            <th style={{width:colWidths.team}}>Tim<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'team')} onMouseDown={e=>startResize(e,'team')}>⇔</div></th>
            <th style={{width:colWidths.games}}>Ukupno<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'games')} onMouseDown={e=>startResize(e,'games')}>⇔</div></th>
            <th style={{width:colWidths.G}}>G<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'G')} onMouseDown={e=>startResize(e,'G')}>⇔</div></th>
            <th style={{width:colWidths.GA}}>GA<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'GA')} onMouseDown={e=>startResize(e,'GA')}>⇔</div></th>
            <th style={{width:colWidths.GG}}>GG%<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'GG')} onMouseDown={e=>startResize(e,'GG')}>⇔</div></th>
            <th style={{width:colWidths.NG}}>NG%<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'NG')} onMouseDown={e=>startResize(e,'NG')}>⇔</div></th>
            <th style={{width:colWidths.twoPlus}}>2+%<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'twoPlus')} onMouseDown={e=>startResize(e,'twoPlus')}>⇔</div></th>
            <th style={{width:colWidths.sevenPlus}}>7+%<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'sevenPlus')} onMouseDown={e=>startResize(e,'sevenPlus')}>⇔</div></th>
            <th style={{width:colWidths.AVG}}>AVG(5)<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'AVG')} onMouseDown={e=>startResize(e,'AVG')}>⇔</div></th>
            <th style={{width:colWidths.GG5}}>GG(5)<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'GG5')} onMouseDown={e=>startResize(e,'GG5')}>⇔</div></th>
            <th style={{width:colWidths.NG5}}>NG(5)<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'NG5')} onMouseDown={e=>startResize(e,'NG5')}>⇔</div></th>
            <th style={{width:colWidths.twoPlus5}}>2+(5)<div style={{position:'absolute', right:0, top:0, cursor:'col-resize'}} onTouchStart={e=>startResize(e,'twoPlus5')} onMouseDown={e=>startResize(e,'twoPlus5')}>⇔</div></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(teamStats).map(([team, stats], index)=>(
            <React.Fragment key={team}>
              <tr>
                <td>{index+1}</td>
                <td onClick={()=>handleTeamClick(team)}>{team}</td>
                <td>{stats.games}</td>
                <td>{stats.goalsFor}</td>
                <td>{stats.goalsAgainst}</td>
                <td>{stats.games?((stats.GG/stats.games)*100).toFixed(0):0}%</td>
                <td>{stats.games?((stats.NG/stats.games)*100).toFixed(0):0}%</td>
                <td>{stats.games?((stats.twoPlus/stats.games)*100).toFixed(0):0}%</td>
                <td>{stats.games?((stats.sevenPlus/stats.games)*100).toFixed(0):0}%</td>
                <td>{stats.avg5}</td>
                <td>{stats.GG5}</td>
                <td>{stats.NG5}</td>
                <td>{stats.twoPlus5}</td>
              </tr>
              {activeTeam===team && (
                <tr>
                  <td colSpan="13">
                    {Object.entries(byLeague[team]).map(([liga,lstats])=>(
                      <div key={liga} style={{padding:'2px 0'}}>
                        <b>{liga}</b> - G:{lstats.goalsFor}, GA:{lstats.goalsAgainst}, GG%:{(lstats.GG/lstats.games*100).toFixed(0)}, NG%:{(lstats.NG/lstats.games*100).toFixed(0)}
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
