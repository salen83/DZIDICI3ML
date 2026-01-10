import React, { useContext, useMemo, useState } from "react";
import { MatchesContext } from "../MatchesContext";
import { calculateTicketInfluence } from "../ticketInfluence"; // uvoz funkcije

/* helper: siguran procenat */
const pct = (a, b, fallback = 50) => {
  if (!b || isNaN(a) || isNaN(b)) return fallback;
  return (a / b) * 100;
};

export default function Screen4() {
  const { rows, futureMatches, tickets } = useContext(MatchesContext); // dodajemo tickets
  const [selectedH2H, setSelectedH2H] = useState(null);

  // ===============================
  // STATISTIKA TIMOVA
  // ===============================
  const teamStats = useMemo(() => {
    const stats = {};
    rows.forEach(r => {
      if (!r.ft || !r.home || !r.away || !r.ft.includes(":")) return;
      const [hg, ag] = r.ft.split(":").map(n => parseInt(n, 10));
      if (isNaN(hg) || isNaN(ag)) return;

      const init = () => ({ games:0, gg:0, ng:0, over2:0, over7:0, goalsFor:0, goalsAgainst:0 });
      if (!stats[r.home]) stats[r.home] = init();
      if (!stats[r.away]) stats[r.away] = init();

      stats[r.home].games++; stats[r.away].games++;
      stats[r.home].goalsFor += hg; stats[r.home].goalsAgainst += ag;
      stats[r.away].goalsFor += ag; stats[r.away].goalsAgainst += hg;

      if (hg>0 && ag>0) { stats[r.home].gg++; stats[r.away].gg++; }
      else { stats[r.home].ng++; stats[r.away].ng++; }
      if (hg+ag>=2) { stats[r.home].over2++; stats[r.away].over2++; }
      if (hg+ag>=7) { stats[r.home].over7++; stats[r.away].over7++; }
    });
    return stats;
  }, [rows]);

  // ===============================
  // STATISTIKA LIGA
  // ===============================
  const leagueStats = useMemo(() => {
    const stats = {};
    rows.forEach(r => {
      if (!r.ft || !r.liga || !r.ft.includes(":")) return;
      const [hg, ag] = r.ft.split(":").map(n => parseInt(n, 10));
      if (isNaN(hg) || isNaN(ag)) return;

      if (!stats[r.liga]) stats[r.liga] = { games:0, gg:0, ng:0, over2:0, over7:0, goals:0 };
      const s = stats[r.liga];
      s.games++; s.goals += hg + ag;
      if (hg>0 && ag>0) s.gg++; else s.ng++;
      if (hg+ag>=2) s.over2++; if (hg+ag>=7) s.over7++;
    });
    return stats;
  }, [rows]);

  // ===============================
  // H2H MAPA
  // ===============================
  const h2hMap = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!r.ft || !r.home || !r.away || !r.ft.includes(":")) return;
      const [hg, ag] = r.ft.split(":").map(Number);
      if (isNaN(hg) || isNaN(ag)) return;

      if (!map[r.home]) map[r.home] = {};
      if (!map[r.away]) map[r.away] = {};
      if (!map[r.home][r.away]) map[r.home][r.away] = [];
      if (!map[r.away][r.home]) map[r.away][r.home] = [];

      map[r.home][r.away].push({ hg, ag });
      map[r.away][r.home].push({ hg: ag, ag: hg });
    });
    return map;
  }, [rows]);

  // ===============================
  // KALKULACIJA UTICAJA TIKETA
  // ===============================
  const ticketMap = useMemo(() => {
    if (!tickets) return {};
    return calculateTicketInfluence(tickets); // vraća { tim: { tip: uticaj } }
  }, [tickets]);

  // ===============================
  // PREDIKCIJA
  // ===============================
  const predict = (m) => {
    const home = teamStats[m.home] || {};
    const away = teamStats[m.away] || {};
    const league = leagueStats[m.liga] || {};

    const formGG = (pct(home.gg, home.games,50)+pct(away.gg,away.games,50))/2;
    const formNG = (pct(home.ng, home.games,50)+pct(away.ng,away.games,50))/2;
    const formOver2 = (pct(home.over2, home.games,60)+pct(away.over2,away.games,60))/2;
    const formOver7 = (pct(home.over7, home.games,5)+pct(away.over7,away.games,5))/2;

    const leagueGG = pct(league.gg, league.games,50);
    const leagueNG = pct(league.ng, league.games,50);
    const leagueOver2 = pct(league.over2, league.games,60);
    const leagueOver7 = pct(league.over7, league.games,5);

    const h2h = h2hMap[m.home]?.[m.away];
    const h2hGG = h2h ? pct(h2h.filter(x=>x.hg>0 && x.ag>0).length, h2h.length,50) : 50;

    const wForm=0.5, wLeague=0.3, wH2H=0.2;

    // === dodaj uticaj tiketa ===
    const tiGG = (ticketMap[m.home]?.gg || 0) + (ticketMap[m.away]?.gg || 0);
    const tiNG = (ticketMap[m.home]?.ng || 0) + (ticketMap[m.away]?.ng || 0);
    const tiOver2 = (ticketMap[m.home]?.over2 || 0) + (ticketMap[m.away]?.over2 || 0);
    const tiOver7 = (ticketMap[m.home]?.over7 || 0) + (ticketMap[m.away]?.over7 || 0);

    const ggPct = Math.round(wForm*formGG + wLeague*leagueGG + wH2H*h2hGG + tiGG);
    const ngPct = Math.round(wForm*formNG + wLeague*leagueNG + wH2H*(100-h2hGG) + tiNG);
    const over2Pct = Math.round(wForm*formOver2 + wLeague*leagueOver2 + wH2H*50 + tiOver2);
    const over7Pct = Math.round(wForm*formOver7 + wLeague*leagueOver7 + wH2H*5 + tiOver7);

    return {
      gg: ggPct,
      ng: ngPct,
      over2: over2Pct,
      over7: over7Pct,
      avgHome: pct(home.goalsFor, home.games,1),
      avgAway: pct(away.goalsFor, away.games,1),
      h2hGG: Math.round(h2hGG)
    };
  };

  const predictions = futureMatches.map(m=>({...m, ...predict(m)}));

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Datum</th>
            <th>Vreme</th>
            <th>Liga</th>
            <th>Home</th>
            <th>Away</th>
            <th>GG %</th>
            <th>NG %</th>
            <th>2+ %</th>
            <th>7+ %</th>
            <th>AVG H</th>
            <th>AVG A</th>
            <th>H2H GG</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              <td>{p.datum}</td>
              <td>{p.vreme}</td>
              <td>{p.liga}</td>
              <td style={{cursor:"pointer",color:"blue"}} onClick={()=>setSelectedH2H({home:p.home,away:p.away,data:h2hMap[p.home]?.[p.away]})}>{p.home}</td>
              <td style={{cursor:"pointer",color:"blue"}} onClick={()=>setSelectedH2H({home:p.home,away:p.away,data:h2hMap[p.home]?.[p.away]})}>{p.away}</td>
              <td>{p.gg}%</td>
              <td>{p.ng}%</td>
              <td>{p.over2}%</td>
              <td>{p.over7}%</td>
              <td>{p.avgHome.toFixed(2)}</td>
              <td>{p.avgAway.toFixed(2)}</td>
              <td>{p.h2hGG}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedH2H && selectedH2H.data && (
        <div onClick={()=>setSelectedH2H(null)} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0,0,0,0.5)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:1000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",padding:"20px",borderRadius:"8px",maxHeight:"80%",overflowY:"auto"}}>
            <h3>H2H: {selectedH2H.home} vs {selectedH2H.away}</h3>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Home</th>
                  <th>Away</th>
                  <th>HG</th>
                  <th>AG</th>
                </tr>
              </thead>
              <tbody>
                {selectedH2H.data.map((r,i)=>(
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{selectedH2H.home}</td>
                    <td>{selectedH2H.away}</td>
                    <td>{r.hg}</td>
                    <td>{r.ag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={()=>setSelectedH2H(null)} style={{marginTop:"10px"}}>Zatvori</button>
          </div>
        </div>
      )}
    </div>
  );
}
