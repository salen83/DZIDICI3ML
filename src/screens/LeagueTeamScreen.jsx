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
  // FUNKCIJA ZA TIMOVE PO LIGAMA
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

      const country =
        (r.Country ||
         r.country ||
         r.Država ||
         r.drzava ||
         "").trim();

      const key = `${liga}|||${country}`;

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

      if (!map[key]) map[key] = [];
      if (home && !map[key].includes(home)) map[key].push(home);
      if (away && !map[key].includes(away)) map[key].push(away);
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
  const screen1Leagues = useMemo(() => Object.keys(screen1Teams).sort(), [screen1Teams]);
  const sofaLeagues = useMemo(() => Object.keys(sofaTeams).sort(), [sofaTeams]);

  // =====================
  // RENDER
  // =====================
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
                onClick={() => setOpenSofa(openSofa === liga ? null : liga)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    {(() => {
                      const [name, country] = liga.split("|||");
                      return (
                        <>
                          <div style={{ fontWeight: "bold" }}>{name}</div>
                          <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                            {country}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <span>{openSofa === liga ? "▲" : "▼"}</span>
                </div>
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
