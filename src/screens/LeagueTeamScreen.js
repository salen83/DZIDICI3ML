import React, { useState, useMemo } from "react";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import "./LeagueTeamScreen.css";

export default function LeagueTeamScreen({ onClose }) {
  const { rows: screen1Rows } = useMatches();
  const { sofaRows } = useSofa();

  const [openScreen1, setOpenScreen1] = useState(null);
  const [openSofa, setOpenSofa] = useState(null);

  // =====================
  // FUNKCIJA ZA TIMOVE PO LIGAMA (SVA MOGUĆA POLJA)
  // =====================
  const getTeamsByLeague = (rows) => {
    const map = {};

    if (!rows) return map;

    rows.forEach(r => {
      const liga =
        (r.liga ||
         r.Liga ||
         r.league ||
         r.League ||
         r.competition ||
         r.Competition ||
         "").trim();

      const home =
        (r.domacin ||
         r.Domacin ||
         r.DOMACIN ||
         r.home ||
         r.Home ||
         "").trim();

      const away =
        (r.gost ||
         r.Gost ||
         r.GOST ||
         r.away ||
         r.Away ||
         "").trim();

      if (!liga) return;

      if (!map[liga]) map[liga] = [];

      if (home && !map[liga].includes(home)) {
        map[liga].push(home);
      }

      if (away && !map[liga].includes(away)) {
        map[liga].push(away);
      }
    });

    return map;
  };

  // =====================
  // SCREEN1 I SOFA TIMOVI PO LIGAMA
  // =====================
  const screen1Teams = useMemo(() => getTeamsByLeague(screen1Rows), [screen1Rows]);
  const sofaTeams = useMemo(() => getTeamsByLeague(sofaRows), [sofaRows]);

  // =====================
  // LISTA LIGA
  // =====================
  const screen1Leagues = useMemo(
    () => Object.keys(screen1Teams).sort(),
    [screen1Teams]
  );

  const sofaLeagues = useMemo(
    () => Object.keys(sofaTeams).sort(),
    [sofaTeams]
  );

  // =====================
  // SVI SOFA TIMOVI BEZ FILTRA
  // =====================
  const sofaTeamsAll = useMemo(() => {
    if (!sofaRows) return [];
    return Array.from(
      new Set(
        sofaRows.flatMap(r =>
          [
            r.domacin,
            r.Domacin,
            r.home,
            r.Home,
            r.gost,
            r.Gost,
            r.away,
            r.Away
          ].filter(Boolean)
        )
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [sofaRows]);

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
                onClick={() =>
                  setOpenScreen1(openScreen1 === liga ? null : liga)
                }
              >
                {liga} <span>{openScreen1 === liga ? "▲" : "▼"}</span>
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

        {/* SOFA PANEL PO LIGAMA */}
        <div className="panel">
          <div className="panel-title">Sofa Lige</div>
          {sofaLeagues.map((liga, i) => (
            <div key={i} className="accordion-item">
              <div
                className="accordion-header"
                onClick={() =>
                  setOpenSofa(openSofa === liga ? null : liga)
                }
              >
                {liga} <span>{openSofa === liga ? "▲" : "▼"}</span>
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

        {/* SVI SOFA TIMOVI BEZ FILTRA */}
        <div className="panel">
          <div className="panel-title">Svi Sofa Timovi</div>
          <div className="accordion-body">
            {sofaTeamsAll.map((t, idx) => (
              <div key={idx} className="team">
                {idx + 1}. {t}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
