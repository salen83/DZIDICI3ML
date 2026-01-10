import React, { useContext, useMemo } from "react";
import { MatchesContext } from "../MatchesContext";

export default function Screen2Liga() {
  const { rows } = useContext(MatchesContext);

  const leagueStats = useMemo(() => {
    const stats = {};

    rows.forEach(row => {
      const liga = row.liga;
      const ft = row.ft || '';
      if (!liga || !ft.includes(':')) return;

      const [hg, ag] = ft.split(":").map(n => parseInt(n, 10));
      if (isNaN(hg) || isNaN(ag)) return;

      if (!stats[liga]) {
        stats[liga] = {
          liga,
          games: 0,
          gg: 0,
          ng: 0,
          over2: 0,
          over7: 0,
          goals: 0
        };
      }

      const s = stats[liga];
      s.games += 1;
      s.goals += hg + ag;
      if (hg > 0 && ag > 0) s.gg += 1;
      if (hg === 0 || ag === 0) s.ng += 1;
      if (hg + ag >= 2) s.over2 += 1;
      if (hg + ag >= 7) s.over7 += 1;
    });

    return Object.values(stats)
      .map(l => ({
        ...l,
        ggPct: Math.round((l.gg / l.games) * 100),
        ngPct: Math.round((l.ng / l.games) * 100),
        over2Pct: Math.round((l.over2 / l.games) * 100),
        over7Pct: Math.round((l.over7 / l.games) * 100),
        avgGoals: (l.goals / l.games).toFixed(2)
      }))
      .sort((a, b) => b.games - a.games); // sortiranje po broju odigranih mečeva
  }, [rows]);

  return (
    <div className="container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Liga</th>
            <th>Mečeva</th>
            <th>GG %</th>
            <th>NG %</th>
            <th>2+ %</th>
            <th>7+ %</th>
            <th>Prosek golova</th>
          </tr>
        </thead>
        <tbody>
          {leagueStats.map((l, i) => (
            <tr key={l.liga}>
              <td>{i + 1}</td>
              <td>{l.liga}</td>
              <td>{l.games}</td>
              <td>{l.ggPct}%</td>
              <td>{l.ngPct}%</td>
              <td>{l.over2Pct}%</td>
              <td>{l.over7Pct}%</td>
              <td>{l.avgGoals}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
