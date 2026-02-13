import React, { createContext, useContext, useState, useEffect } from "react";
import { useLeagueTeam } from "./LeagueTeamContext";

const SofaContext = createContext();

const initialSofaRows = [
  { Liga: "Premier League", Domacin: "Chelsea", Gost: "Arsenal" },
  { Liga: "Premier League", Domacin: "Liverpool", Gost: "Man City" },
  { Liga: "La Liga", Domacin: "Barcelona", Gost: "Real Madrid" },
  { Liga: "Serie A", Domacin: "Juventus", Gost: "Inter" }
];

export const SofaProvider = ({ children }) => {
  const { setLeagueTeamData } = useLeagueTeam();

  // ✅ Lazy init isto kao MatchesContext
  const [sofaRows, setSofaRows] = useState(() => {
    try {
      const stored = localStorage.getItem("sofaRows");
      return stored ? JSON.parse(stored) : initialSofaRows;
    } catch {
      return initialSofaRows;
    }
  });

  // ✅ Persist u localStorage
  useEffect(() => {
    localStorage.setItem("sofaRows", JSON.stringify(sofaRows));
  }, [sofaRows]);

  // ✅ Sync sa LeagueTeamContext
  useEffect(() => {
    if (!sofaRows || !sofaRows.length) return;

    setLeagueTeamData(prev => {
      const updated = { ...prev };

      sofaRows.forEach(r => {
        const liga = r.Liga?.trim();
        const domacin = r.Domacin?.trim();
        const gost = r.Gost?.trim();

        if (!liga) return;

        if (!updated[liga]) {
          updated[liga] = {
            screen1: "",
            sofa: liga,
            screen1Teams: [],
            sofaTeams: []
          };
        }

        [domacin, gost].forEach(team => {
          if (team && !updated[liga].sofaTeams.includes(team)) {
            updated[liga].sofaTeams.push(team);
          }
        });
      });

      return updated;
    });
  }, [sofaRows, setLeagueTeamData]);

  return (
    <SofaContext.Provider value={{ sofaRows, setSofaRows }}>
      {children}
    </SofaContext.Provider>
  );
};

export const useSofa = () => {
  const context = useContext(SofaContext);
  if (!context) {
    throw new Error("useSofa must be used inside SofaProvider");
  }
  return context;
};
