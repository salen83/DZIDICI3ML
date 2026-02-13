import React, { useState, useMemo } from "react";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import { debugSofaRows } from "../debugSofaRows";
import "./LeagueTeamScreen.css";

export default function LeagueTeamScreen({ onClose }) {
  const { rows: screen1Rows } = useMatches();
  const { sofaRows } = useSofa();

  debugSofaRows(sofaRows);

  const [openScreen1, setOpenScreen1] = useState(null);
  const [openSofa, setOpenSofa] = useState(null);

  // =====================
  // LIGE
  // =====================
  const screen1Leagues = useMemo(() =>
    Array.from(
      new Set(screen1Rows.map(r => r.liga || r.Liga).filter(Boolean))
    ).sort(),
    [screen1Rows]
  );

  const sofaLeagues = useMemo(() =>
    Array.from(
      new Set(sofaRows.map(r => r.liga || r.Liga).filter(Boolean))
    ).sort(),
    [sofaRows]
  );

  // =====================
  // TIMOVI PO LIGAMA
  // =====================
  const getTeamsByLeague = (rows) => {
    const map = {};
    rows.forEach(r => {
      const liga = r.liga || r.Liga || "Nepoznato";
      const home = r.home || r.Domacin;
      const away = r.away || r.Gost;

      if (!map[liga]) map[liga] = [];

      if (home && !map[liga].includes(home)) map[liga].push(home);
      if (away && !map[liga].includes(away)) map[liga].push(away);
    });
    return map;
  };

  const screen1Teams = useMemo(
    () => getTeamsByLeague(screen1Rows),
    [screen1Rows]
  );

  const sofaTeams = useMemo(
    () => getTeamsByLeague(sofaRows),
    [sofaRows]
  );

  return (
    <div className="league-wrapper">
      <button className="back-btn" onClick={onClose}>⬅ Nazad</button>

      <div className="columns">

        {/* SCREEN1 PANEL */}
        <div className="panel">
          <div className="panel-title">Screen1 Lige</div>

          {screen1Leagues.map((liga, i) => (
            <div key={i} className="accordion-item">
              <div
                className="accordion-header"
                onClick={() => setOpenScreen1(openScreen1 === liga ? null : liga)}
              >
                {liga}
                <span>{openScreen1 === liga ? "▲" : "▼"}</span>
              </div>

              {openScreen1 === liga && (
                <div className="accordion-body">
                  {screen1Teams[liga]?.map((t, idx) => (
                    <div key={idx} className="team">
                      {idx + 1}. {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* SOFA PANEL */}
        <div className="panel">
          <div className="panel-title">Sofa Lige</div>

          {sofaLeagues.map((liga, i) => (
            <div key={i} className="accordion-item">
              <div
                className="accordion-header"
                onClick={() => setOpenSofa(openSofa === liga ? null : liga)}
              >
                {liga}
                <span>{openSofa === liga ? "▲" : "▼"}</span>
              </div>

              {openSofa === liga && (
                <div className="accordion-body">
                  {sofaTeams[liga]?.map((t, idx) => (
                    <div key={idx} className="team">
                      {idx + 1}. {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
