import React, { createContext, useContext, useEffect, useState } from "react";

const LeagueMapContext = createContext();

const STORAGE_KEY = "LEAGUE_MAP_V1";

export function LeagueMapProvider({ children }) {
  const [leagueMap, setLeagueMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load leagueMap from localStorage", e);
      return {};
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
