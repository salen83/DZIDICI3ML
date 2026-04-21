import React, { useContext, useEffect } from "react";
import { MatchesContext } from "../MatchesContext";

// Poisson PMF
function poisson(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}
function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export default function Screen10Poisson() {
  const { rows, poissonStats, setPoissonStats } = useContext(MatchesContext);

  useEffect(() => {
    if (!rows.length) return;

    const teams = {};
    const leagues = {};

    // Init
    rows.forEach(r => {
      if (!r.ft || !r.home || !r.away || !r.liga) return;
      const [hg, ag] = r.ft.split(":").map(Number);
      if (isNaN(hg) || isNaN(ag)) return;

      teams[r.home] ??= { g:0, gf:0, ga:0, homeG:0, homeGF:0, homeGA:0 };
      teams[r.away] ??= { g:0, gf:0, ga:0, awayG:0, awayGF:0, awayGA:0 };

      leagues[r.liga] ??= { g:0, goals:0 };

      teams[r.home].g++; teams[r.away].g++;
      teams[r.home].gf += hg; teams[r.home].ga += ag;
      teams[r.away].gf += ag; teams[r.away].ga += hg;

      teams[r.home].homeG++; teams[r.home].homeGF += hg; teams[r.home].homeGA += ag;
      teams[r.away].awayG++; teams[r.away].awayGF += ag; teams[r.away].awayGA += hg;

      leagues[r.liga].g++;
      leagues[r.liga].goals += hg + ag;
    });

    // League avg goals
    Object.values(leagues).forEach(l => {
      l.avgGoals = l.g ? l.goals / l.g : 2.5;
    });

    // Team lambdas
    Object.values(teams).forEach(t => {
      t.avgFor = t.g ? t.gf / t.g : 1;
      t.avgAgainst = t.g ? t.ga / t.g : 1;
      t.homeAttack = t.homeG ? t.homeGF / t.homeG : t.avgFor;
      t.awayAttack = t.awayG ? t.awayGF / t.awayG : t.avgFor;
    });

    setPoissonStats({ teams, leagues });
  }, [rows]);

  return (
    <div style={{ padding: 10 }}>
      <h2>⚽ Screen10 – Poisson Stats</h2>

      <table border="1" cellPadding="4" style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th>Team</th>
            <th>Matches</th>
            <th>Avg GF</th>
            <th>Avg GA</th>
            <th>Home Attack</th>
            <th>Away Attack</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(poissonStats.teams || {}).map(([team, t]) => (
            <tr key={team}>
              <td>{team}</td>
              <td>{t.g}</td>
              <td>{t.avgFor?.toFixed(2)}</td>
              <td>{t.avgAgainst?.toFixed(2)}</td>
              <td>{t.homeAttack?.toFixed(2)}</td>
              <td>{t.awayAttack?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
