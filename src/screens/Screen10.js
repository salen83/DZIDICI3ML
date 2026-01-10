import React, { useMemo, useContext } from "react";
import { MatchesContext } from "../MatchesContext";
import "./Screen2.css";

// Poisson formula
const poissonProb = (lambda, k) => (Math.pow(lambda,k) * Math.exp(-lambda)) / factorial(k);
const factorial = n => n===0 ? 1 : Array.from({length:n},(_,i)=>i+1).reduce((a,b)=>a*b,1);

export default function Screen10() {
  const { rows } = useContext(MatchesContext);

  const poissonData = useMemo(() => {
    if (!rows?.length) return [];

    // Izračunaj λ po timu
    const teams = {};
    rows.forEach(r => {
      if (!r.ft || !r.home || !r.away) return;
      const [hg, ag] = r.ft.split(":").map(Number);
      if (isNaN(hg) || isNaN(ag)) return;

      // Inicijalizacija
      if (!teams[r.home]) teams[r.home] = { homeGoals:0, homeGames:0, awayGoals:0, awayGames:0 };
      if (!teams[r.away]) teams[r.away] = { homeGoals:0, homeGames:0, awayGoals:0, awayGames:0 };

      teams[r.home].homeGoals += hg;
      teams[r.home].homeGames++;
      teams[r.away].awayGoals += ag;
      teams[r.away].awayGames++;
      
      teams[r.away].homeGoals += ag;
      teams[r.away].homeGames++;
      teams[r.home].awayGoals += hg;
      teams[r.home].awayGames++;
    });

    // λ i verovatnoće
    return Object.entries(teams).map(([team, stats]) => {
      const lambdaHome = stats.homeGames ? stats.homeGoals / stats.homeGames : 0;
      const lambdaAway = stats.awayGames ? stats.awayGoals / stats.awayGames : 0;
      const probHome = Array.from({length:8},(_,k)=>poissonProb(lambdaHome,k));
      const probAway = Array.from({length:8},(_,k)=>poissonProb(lambdaAway,k));
      return { team, lambdaHome, lambdaAway, probHome, probAway };
    });
  }, [rows]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Tim</th>
            <th>λ Home</th>
            <th>λ Away</th>
            {Array.from({length:8},(_,k)=><th key={"h"+k}>{k}H</th>)}
            {Array.from({length:8},(_,k)=><th key={"a"+k}>{k}A</th>)}
          </tr>
        </thead>
        <tbody>
          {poissonData.map((p,i)=>(
            <tr key={p.team}>
              <td>{i+1}</td>
              <td>{p.team}</td>
              <td>{p.lambdaHome.toFixed(2)}</td>
              <td>{p.lambdaAway.toFixed(2)}</td>
              {p.probHome.map((v,k)=><td key={"h"+k}>{(v*100).toFixed(1)}%</td>)}
              {p.probAway.map((v,k)=><td key={"a"+k}>{(v*100).toFixed(1)}%</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
