import React, { useContext } from "react";
import { MatchesContext } from "../MatchesContext";
import TicketPanel from "../components/TicketPanel";

export default function Screen5() {
  const {
    predictionsFinal,
    activeTicket,
    toggleMatchInActiveTicket,
    selectedMatchesByScreen, // ispravljeno
    toggleMatchSelection
  } = useContext(MatchesContext);

  const list = [...predictionsFinal]
    .filter(p => !isNaN(p.final.gg))
    .sort((a, b) => b.final.gg - a.final.gg);

  const isMatchInTicket = (match) => {
    if (!activeTicket) return false;
    return activeTicket.matches.some(
      m =>
        m.home === match.home &&
        m.away === match.away &&
        m.datum === match.datum &&
        m.vreme === match.vreme &&
        m.tip === "GG"
    );
  };

  const isBlocked = (match) => {
    const screensToCheck = ["screen6", "screen7", "screen8"];
    return screensToCheck.some(screen =>
      selectedMatchesByScreen[screen]?.some(
        m => m.home === match.home && m.away === match.away && m.datum === match.datum
      )
    );
  };

  const handleToggleMatch = (match) => {
    if (isBlocked(match)) return; // blokirano zbog drugog screena
    toggleMatchInActiveTicket(match, "GG");
    toggleMatchSelection("screen5", match);
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <table style={{ borderCollapse: "collapse", width: "auto" }}>
        <thead>
          <tr>
            <th>#</th><th>Datum</th><th>Vreme</th><th>Liga</th><th>Domaćin</th><th>Gost</th><th>GG %</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p,i)=>{
            const inTicket = isMatchInTicket(p);
            const blocked = isBlocked(p);
            const bgColor = inTicket ? "#add8e6" : blocked ? "#f8d7da" : p.final.gg>80 ? "#c8facc" : "transparent";

            return (
              <tr key={i} style={{ backgroundColor: bgColor, cursor: blocked ? "not-allowed" : "pointer" }} onClick={()=>handleToggleMatch(p)}>
                <td>{i+1}</td>
                <td>{p.datum}</td>
                <td>{p.vreme}</td>
                <td>{p.liga}</td>
                <td>{p.home}</td>
                <td>{p.away}</td>
                <td>{p.final.gg.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <TicketPanel />
    </div>
  );
}
