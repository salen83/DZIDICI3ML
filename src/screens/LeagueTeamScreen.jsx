import React, { useState, useMemo } from "react";
import { useContext } from "react";
import { MatchesContext } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import "./LeagueTeamScreen.css";

export default function LeagueTeamScreen({ onClose }) {
  const { futureMatches: screen3Rows } = useContext(MatchesContext);
  const { sofaRows } = useSofa();

  const [openScreen3, setOpenScreen3] = useState(null);
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
  // SCREEN3 I SOFA TIMOVI PO LIGAMA
  // =====================
  const screen3Teams = useMemo(() => getTeamsByLeague(screen3Rows), [screen3Rows]);
  const sofaTeams = useMemo(() => getTeamsByLeague(sofaRows), [sofaRows]);

  // =====================
  // LISTA LIGA
  // =====================
  const screen3Leagues = useMemo(() => Object.keys(screen3Teams).sort(), [screen3Teams]);
  const sofaLeagues = useMemo(() => Object.keys(sofaTeams).sort(), [sofaTeams]);

  // =====================
  // RENDER
  // =====================
  return (
    <div className="league-wrapper">
      <button className="back-btn" onClick={onClose}>⬅ Nazad</button>

      <div className="columns">

       {/* SCREEN3 PANEL */}
        <div className="panel">
          <div className="panel-title">Screen3 Lige</div>
           {screen3Leagues.map((liga, i) => (
            <div key={i} className="accordion-item">
              <div
                className="accordion-header"
                onClick={() =>
                 setOpenScreen3(openScreen3 === liga ? null : liga)
                }
              >
                {liga} <span>{openScreen3 === liga ? "▲" : "▼"}</span>
              </div>

              {openScreen3 === liga && (
                <div className="accordion-body">
                  {screen3Teams[liga]?.map((t, idx) => (
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
