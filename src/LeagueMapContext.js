import React, { createContext, useContext, useState } from "react";

/*
  leagueMap struktura:

  {
    leagueKey: {
      screen1: "Originalno ime lige iz Screen1",
      sofa: "Originalno ime lige iz SofaScore",
      normalized: "Normalizovano ime (za mapiranje)",
      screen1Teams: [],
      sofaTeams: []
    }
  }
*/

const LeagueMapContext = createContext();

export function LeagueMapProvider({ children }) {
  const [leagueMap, setLeagueMap] = useState({});

  // ======== CORE FUNKCIJA ========
  // source: "screen1" | "sofa"
  // leagueName: originalno ime lige
  // teams: niz timova koji se pojavljuju u toj ligi
  const registerLeague = (source, leagueName, teams = []) => {
    if (!leagueName) return;

    setLeagueMap(prev => {
      const next = { ...prev };

      // ključ za LeagueTeamScreen: koristi samo originalno ime lige
      const key = leagueName;

      if (!next[key]) {
        next[key] = {
          screen1: null,
          sofa: null,
          normalized: null,
          screen1Teams: [],
          sofaTeams: []
        };
      }

      // postavi originalno ime lige za source
      if (source === "screen1" && !next[key].screen1) {
        next[key].screen1 = leagueName;
      }
      if (source === "sofa" && !next[key].sofa) {
        next[key].sofa = leagueName;
      }

      const teamField = source === "screen1" ? "screen1Teams" : "sofaTeams";
      teams.forEach(t => {
        if (t && !next[key][teamField].includes(t)) {
          next[key][teamField].push(t);
        }
      });

      return next;
    });
  };

  // ======== MAP SCREEN POMOC ========
  // povezivanje screen1 i sofa liga pod jednim normalizovanim imenom
  const linkLeagues = (screen1Key, sofaKey, normalizedName) => {
    setLeagueMap(prev => {
      const next = { ...prev };
      if (!next[screen1Key] || !next[sofaKey]) return prev;
      next[screen1Key].normalized = normalizedName;
      next[sofaKey].normalized = normalizedName;
      return next;
    });
  };

  // ======== UKLANJANJE TIMA ========
  // source: "screen1" | "sofa"
  const removeTeam = (leagueKey, source, teamName) => {
    setLeagueMap(prev => {
      const next = { ...prev };
      const field = source === "screen1" ? "screen1Teams" : "sofaTeams";
      if (next[leagueKey]) {
        next[leagueKey][field] = next[leagueKey][field].filter(t => t !== teamName);
      }
      return next;
    });
  };

  return (
    <LeagueMapContext.Provider
      value={{
        leagueMap,
        setLeagueMap,
        registerLeague,
        linkLeagues,
        removeTeam
      }}
    >
      {children}
    </LeagueMapContext.Provider>
  );
}

export function useLeagueMap() {
  return useContext(LeagueMapContext);
}
