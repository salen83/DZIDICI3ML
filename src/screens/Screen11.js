import React, { useContext, useMemo } from "react";
import { MatchesContext } from "../MatchesContext";
import { buildPoissonModel, predictMatch } from "../utils/poissonEngine";

export default function Screen11() {
  const { rows, futureMatches } = useContext(MatchesContext);

  const predictions = useMemo(() => {
    if (!rows.length || !futureMatches.length) return [];

    const model = buildPoissonModel(rows);

    return futureMatches.map(m => {
      const p = predictMatch(model, m.liga, m.home, m.away);
      return { ...m, ...p };
    });
  }, [rows, futureMatches]);

  return (
    <div>
      <h3>Poisson predikcija (čisti model)</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Datum</th>
            <th>Vreme</th>
            <th>Liga</th>
            <th>Home</th>
            <th>Away</th>
            <th>λ H</th>
            <th>λ A</th>
            <th>GG %</th>
            <th>NG %</th>
            <th>2+ %</th>
            <th>7+ %</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p,i)=>(
            <tr key={i}>
              <td>{i+1}</td>
              <td>{p.datum}</td>
              <td>{p.vreme}</td>
              <td>{p.liga}</td>
              <td>{p.home}</td>
              <td>{p.away}</td>
              <td>{p.lambdaHome.toFixed(2)}</td>
              <td>{p.lambdaAway.toFixed(2)}</td>
              <td>{p.gg.toFixed(1)}%</td>
              <td>{p.ng.toFixed(1)}%</td>
              <td>{p.over2.toFixed(1)}%</td>
              <td>{p.over7.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
