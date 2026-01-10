import React, { createContext, useState, useEffect } from "react";
import { buildPoissonModel, predictMatch } from "./utils/poissonEngine";
import { calculateTicketInfluence } from "./ticketInfluence";

export const MatchesContext = createContext();

export function MatchesProvider({ children }) {

  const [rows, setRows] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rows")) || []; }
    catch { return []; }
  });

  const [futureMatches, setFutureMatches] = useState([]);
  const [tickets, setTickets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tickets")) || { otvoreni: [], dobitni: [], gubitni: [] }; }
    catch { return { otvoreni: [], dobitni: [], gubitni: [] }; }
  });
  const [activeTicket, setActiveTicket] = useState(() => {
    try { return JSON.parse(localStorage.getItem("activeTicket")) || null; }
    catch { return null; }
  });

  const [selectedMatchesByScreen, setSelectedMatchesByScreen] = useState({
    screen5: [],
    screen6: [],
    screen7: [],
    screen8: []
  });

  const [predictionsHybrid, setPredictionsHybrid] = useState([]);
  const [predictionsPoisson, setPredictionsPoisson] = useState([]);
  const [predictionsFinal, setPredictionsFinal] = useState([]);
  const [teamPoissonStats, setTeamPoissonStats] = useState([]);

  // --- Toggle meča u aktivnom tiketu ---
  const toggleMatchInActiveTicket = (match, tip, screen=null) => {
    setActiveTicket(prev => {
      const baseMatch = { datum: match.datum, vreme: match.vreme, liga: match.liga, home: match.home, away: match.away, tip, rezultat:"", status:"pending" };
      if(!prev){
        const now = new Date();
        const name = `Tiket ${now.toISOString().replace("T"," ").slice(0,19)}`;
        return { id: Date.now(), name, matches: [baseMatch] };
      }
      const exists = prev.matches.find(m => m.home===baseMatch.home && m.away===baseMatch.away && m.datum===baseMatch.datum && m.vreme===baseMatch.vreme && m.tip===baseMatch.tip);
      if(exists) return { ...prev, matches: prev.matches.filter(m=>m!==exists) };
      return { ...prev, matches: [...prev.matches, baseMatch] };
    });

    if(screen){
      setSelectedMatchesByScreen(prev=>{
        const existing = prev[screen] || [];
        const exists = existing.find(m=>m.home===match.home && m.away===match.away && m.datum===match.datum && m.vreme===match.vreme);
        const updated = exists ? existing.filter(m=>!(m.home===match.home && m.away===match.away && m.datum===match.datum && m.vreme===match.vreme)) : [...existing, match];
        return {...prev, [screen]: updated};
      });
    }
  };

  // --- Toggle selekcije mečeva po screenu ---
  const toggleMatchSelection = (screen, match) => {
    setSelectedMatchesByScreen(prev=>{
      const existing = prev[screen] || [];
      const exists = existing.find(m=>m.home===match.home && m.away===match.away && m.datum===match.datum && m.vreme===match.vreme);
      const updated = exists ? existing.filter(m=>!(m.home===match.home && m.away===match.away && m.datum===match.datum && m.vreme===match.vreme)) : [...existing, match];
      return {...prev, [screen]: updated};
    });
  };

  const saveActiveTicket = () => {
    if(!activeTicket || !activeTicket.matches.length) return;
    setTickets(prev=>({ ...prev, otvoreni: [...prev.otvoreni, activeTicket] }));
    setActiveTicket(null);
  };

  useEffect(() => { localStorage.setItem("rows", JSON.stringify(rows)); }, [rows]);
  useEffect(() => { localStorage.setItem("tickets", JSON.stringify(tickets)); }, [tickets]);
  useEffect(() => { localStorage.setItem("activeTicket", JSON.stringify(activeTicket)); }, [activeTicket]);

  // --- Team stats za Poisson ---
  useEffect(()=>{
    if(!rows.length){ setTeamPoissonStats([]); return; }

    const teams = {};
    rows.forEach(r=>{
      if(!r.ft || !r.home || !r.away) return;
      const [hg, ag] = r.ft.split(":").map(Number);
      if(isNaN(hg) || isNaN(ag)) return;

      if(!teams[r.home]) teams[r.home] = { homeGoals:0, homeGames:0, awayGoals:0, awayGames:0 };
      if(!teams[r.away]) teams[r.away] = { homeGoals:0, homeGames:0, awayGoals:0, awayGames:0 };

      teams[r.home].homeGoals += hg;
      teams[r.home].homeGames++;
      teams[r.away].awayGoals += ag;
      teams[r.away].awayGames++;

      teams[r.away].homeGoals += ag;
      teams[r.away].homeGames++;
      teams[r.home].awayGoals += hg;
      teams[r.home].awayGames++;
    });

    const data = Object.entries(teams).map(([team, stats])=>{
      const lambdaHome = stats.homeGames ? stats.homeGoals / stats.homeGames : 0;
      const lambdaAway = stats.awayGames ? stats.awayGoals / stats.awayGames : 0;
      return { team, lambdaHome, lambdaAway };
    });

    setTeamPoissonStats(data);
  }, [rows]);

  // --- Predikcije Poisson ---
  useEffect(()=>{
    if(!rows.length || !futureMatches.length){
      setPredictionsPoisson([]);
      return;
    }
    const model = buildPoissonModel(rows);
    const poissonPreds = futureMatches.map(m=>{
      const p = predictMatch(model, m.liga, m.home, m.away);
      return { ...m, ...p };
    });
    setPredictionsPoisson(poissonPreds);
  }, [rows, futureMatches]);

  // --- Predikcije Hybrid ---
  useEffect(() => {
    if (!rows.length || !futureMatches.length) {
      setPredictionsHybrid([]);
      return;
    }

    const pct = (a,b,f=50)=> (!b||isNaN(a)||isNaN(b)?f:(a/b)*100);
    const teamStats = {};
    const leagueStats = {};
    const h2hMap = {};

    rows.forEach(r => {
      if(!r.ft || !r.home || !r.away) return;
      const [hg, ag] = r.ft.split(":").map(Number);
      if(isNaN(hg) || isNaN(ag)) return;

      if(!teamStats[r.home]) teamStats[r.home] = { games:0, gg:0, ng:0, over2:0, over7:0, goalsFor:0, goalsAgainst:0 };
      if(!teamStats[r.away]) teamStats[r.away] = { games:0, gg:0, ng:0, over2:0, over7:0, goalsFor:0, goalsAgainst:0 };

      teamStats[r.home].games++; teamStats[r.home].goalsFor+=hg; teamStats[r.home].goalsAgainst+=ag;
      teamStats[r.away].games++; teamStats[r.away].goalsFor+=ag; teamStats[r.away].goalsAgainst+=hg;

      if(hg>0 && ag>0){ teamStats[r.home].gg++; teamStats[r.away].gg++; } 
      else { teamStats[r.home].ng++; teamStats[r.away].ng++; }
      if(hg+ag>=2){ teamStats[r.home].over2++; teamStats[r.away].over2++; }
      if(hg+ag>=7){ teamStats[r.home].over7++; teamStats[r.away].over7++; }

      if(!leagueStats[r.liga]) leagueStats[r.liga] = { games:0, gg:0, ng:0, over2:0, over7:0, goals:0 };
      leagueStats[r.liga].games++; leagueStats[r.liga].goals += hg+ag;
      if(hg>0 && ag>0) leagueStats[r.liga].gg++; else leagueStats[r.liga].ng++;
      if(hg+ag>=2) leagueStats[r.liga].over2++; if(hg+ag>=7) leagueStats[r.liga].over7++;

      if(!h2hMap[r.home]) h2hMap[r.home]={};
      if(!h2hMap[r.away]) h2hMap[r.away]={};
      if(!h2hMap[r.home][r.away]) h2hMap[r.home][r.away]=[];
      if(!h2hMap[r.away][r.home]) h2hMap[r.away][r.home]=[];
      h2hMap[r.home][r.away].push({ hg, ag });
      h2hMap[r.away][r.home].push({ hg: ag, ag: hg });
    });

    const ticketMap = calculateTicketInfluence(tickets);

    const hybridPreds = futureMatches.map(m=>{
      const home = teamStats[m.home]||{};
      const away = teamStats[m.away]||{};
      const league = leagueStats[m.liga]||{};
      const h2h = h2hMap[m.home]?.[m.away];
      const h2hGG = h2h ? pct(h2h.filter(x=>x.hg>0 && x.ag>0).length, h2h.length,50) : 50;

      const wForm=0.5, wLeague=0.3, wH2H=0.2;
      const tiGG = 0, tiNG=0, tiOver2=0, tiOver7=0; // ticket influence se ne uklapa ovde

      return {
        ...m,
        gg: Math.round(wForm*(pct(home.gg,home.games,50)+pct(away.gg,away.games,50))/2 + wLeague*pct(league.gg,league.games,50) + wH2H*h2hGG + tiGG),
        ng: Math.round(wForm*(pct(home.ng,home.games,50)+pct(away.ng,away.games,50))/2 + wLeague*pct(league.ng,league.games,50) + wH2H*(100-h2hGG) + tiNG),
        over2: Math.round(wForm*(pct(home.over2,home.games,60)+pct(away.over2,away.games,60))/2 + wLeague*pct(league.over2,league.games,60) + wH2H*50 + tiOver2),
        over7: Math.round(wForm*(pct(home.over7,home.games,5)+pct(away.over7,away.games,5))/2 + wLeague*pct(league.over7,league.games,5) + wH2H*5 + tiOver7)
      };
    });

    setPredictionsHybrid(hybridPreds);

  }, [rows, futureMatches, tickets]);

  // --- Predikcije Final ---
  useEffect(()=>{
    if(!predictionsPoisson.length || !predictionsHybrid.length) {
      setPredictionsFinal([]);
      return;
    }

    const tips = ["gg","ng","over2","over7"];
    const ticketMap = calculateTicketInfluence(tickets);

    const finalPreds = futureMatches.map(m=>{
      const poisson = predictionsPoisson.find(p => p.home===m.home && p.away===m.away) || {};
      const hybrid = predictionsHybrid.find(p => p.home===m.home && p.away===m.away) || {};
      const tMapHome = ticketMap[m.home] || {};
      const tMapAway = ticketMap[m.away] || {};
      const final = {};

      tips.forEach(tip=>{
        const poissonVal = poisson[tip] ?? 50;
        const hybridVal = hybrid[tip] ?? 50;
        const ticketVal = (tMapHome[tip]||0) + (tMapAway[tip]||0);

        final[tip] = Math.min(100, Math.max(0, 0.65*poissonVal + 0.35*hybridVal + ticketVal));
      });

      return { ...m, poisson, hybrid, ticketInfluence: {...tMapHome, ...tMapAway}, final };
    });

    setPredictionsFinal(finalPreds);

  }, [predictionsPoisson, predictionsHybrid, futureMatches, tickets]);

  return (
    <MatchesContext.Provider value={{
      rows, setRows,
      futureMatches, setFutureMatches,
      tickets, setTickets,
      activeTicket, setActiveTicket,
      toggleMatchInActiveTicket,
      toggleMatchSelection,
      saveActiveTicket,
      selectedMatchesByScreen,
      predictionsHybrid,
      predictionsPoisson,
      predictionsFinal,
      teamPoissonStats
    }}>
      {children}
    </MatchesContext.Provider>
  );
}
