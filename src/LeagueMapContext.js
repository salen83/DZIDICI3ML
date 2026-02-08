import React, { createContext, useContext, useEffect, useState } from "react";

// Dummy data: ovde ubaci stvarne podatke iz Screen1 i SofaScore
// Primer strukture: liga -> { normalized, screen1, sofa, screen1Teams: [], sofaTeams: [] }
const INITIAL_LEAGUES = {
  "premier_league": {
    normalized: "Premier League",
    screen1: "Premier League",
    sofa: "English Premier League",
    screen1Teams: ["Manchester United", "Liverpool", "Chelsea", "Arsenal"],
    sofaTeams: ["Man Utd", "Liverpool FC", "Chelsea FC", "Arsenal FC"]
  },
  "la_liga": {
    normalized: "La Liga",
    screen1: "Primera Division",
    sofa: "La Liga",
    screen1Teams: ["Real Madrid", "Barcelona", "Atletico Madrid"],
    sofaTeams: ["Real Madrid CF", "FC Barcelona", "Atletico Madrid"]
  }
};

const LeagueMapContext = createContext();

const STORAGE_KEY = "LEAGUE_MAP_V1";

export function LeagueMapProvider({ children }) {
  const [leagueMap, setLeagueMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      // Ako nema localStorage, popuni početnim ligama
      return INITIAL_LEAGUES;
    } catch (e) {
      console.error("Failed to load leagueMap from localStorage", e);
      return INITIAL_LEAGUES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leagueMap));
    } catch (e) {
      console.error("Failed to save leagueMap to localStorage", e);
    }
  }, [leagueMap]);

  return (
    <LeagueMapContext.Provider value={{ leagueMap, setLeagueMap }}>
      {children}
    </LeagueMapContext.Provider>
  );
}

export function useLeagueMap() {
  return useContext(LeagueMapContext);
}
