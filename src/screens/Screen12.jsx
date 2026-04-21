import React, { useContext, useMemo } from "react";
import { MatchesContext } from "../MatchesContext";
import "./Screen2.css";

export default function Screen12() {
  const { futureMatches, tickets, predictionsPoisson, predictionsHybrid } = useContext(MatchesContext);

  // Ticket influence
  const ticketMap = useMemo(() => {
    const map = {};
    const allTickets = [...tickets.dobitni,...tickets.gubitni].sort((a,b)=>new Date(a.date)-new Date(b.date));
    allTickets.forEach(t=>{
      const isWin = t.status==="win"?1:-1;
      t.matches.forEach(m=>{
        if(!map[m.home]) map[m.home]={};
        if(!map[m.away]) map[m.away]={};
        if(!map[m.home][m.tip]) map[m.home][m.tip]=0;
        if(!map[m.away][m.tip]) map[m.away][m.tip]=0;
        map[m.home][m.tip] += 3*isWin;
        map[m.away][m.tip] += 3*isWin;
        if(map[m.home][m.tip]>15) map[m.home][m.tip]=15;
        if(map[m.home][m.tip]<-15) map[m.home][m.tip]=-15;
        if(map[m.away][m.tip]>15) map[m.away][m.tip]=15;
        if(map[m.away][m.tip]<-15) map[m.away][m.tip]=-15;
      });
    });
    return map;
  }, [tickets]);

  // Kombinacija finalne verovatnoće: 65% Poisson (iz Screen11) + 35% hybrid + ticket
  const finalPreds = useMemo(() => {
    return futureMatches.map(m=>{
      const poisson = predictionsPoisson?.find(p => p.home===m.home && p.away===m.away) || {};
      const hybrid = predictionsHybrid?.find(p => p.home===m.home && p.away===m.away) || {};
      const tMapHome = ticketMap[m.home]||{};
      const tMapAway = ticketMap[m.away]||{};
      const tips = ["gg","ng","over2","over7"];
      const final = {};
      tips.forEach(tip=>{
        const poissonVal = poisson[tip] ?? 50;   
        const hybridVal = hybrid[tip] ?? 50;     
        const ticketVal = (tMapHome[tip]||0) + (tMapAway[tip]||0);
        final[tip] = Math.min(100, Math.max(0, 0.65*poissonVal + 0.35*hybridVal + ticketVal));
      });
      return { ...m, poisson, hybrid, ticketInfluence: {...tMapHome, ...tMapAway}, final };
    });
  }, [futureMatches, predictionsPoisson, predictionsHybrid, ticketMap]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Timovi</th>
            <th>Poisson GG</th><th>Hybrid GG</th><th>Ticket GG</th><th>Final GG</th>
            <th>Poisson NG</th><th>Hybrid NG</th><th>Ticket NG</th><th>Final NG</th>
            <th>Poisson 2+</th><th>Hybrid 2+</th><th>Ticket 2+</th><th>Final 2+</th>
            <th>Poisson 7+</th><th>Hybrid 7+</th><th>Ticket 7+</th><th>Final 7+</th>
          </tr>
        </thead>
        <tbody>
          {finalPreds.map((m,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              <td>{m.home} : {m.away}</td>
              <td>{(m.poisson.gg ?? 0).toFixed(1)}%</td>
              <td>{(m.hybrid.gg ?? 0).toFixed(1)}%</td>
              <td>{((m.ticketInfluence.gg||0)).toFixed(1)}%</td>
              <td>{m.final.gg.toFixed(1)}%</td>
              <td>{(m.poisson.ng ?? 0).toFixed(1)}%</td>
              <td>{(m.hybrid.ng ?? 0).toFixed(1)}%</td>
              <td>{((m.ticketInfluence.ng||0)).toFixed(1)}%</td>
              <td>{m.final.ng.toFixed(1)}%</td>
              <td>{(m.poisson.over2 ?? 0).toFixed(1)}%</td>
              <td>{(m.hybrid.over2 ?? 0).toFixed(1)}%</td>
              <td>{((m.ticketInfluence["2+"]||0)).toFixed(1)}%</td>
              <td>{m.final.over2.toFixed(1)}%</td>
              <td>{(m.poisson.over7 ?? 0).toFixed(1)}%</td>
              <td>{(m.hybrid.over7 ?? 0).toFixed(1)}%</td>
              <td>{((m.ticketInfluence["7+"]||0)).toFixed(1)}%</td>
              <td>{m.final.over7.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
