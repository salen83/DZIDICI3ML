import React, { createContext, useContext, useEffect, useState } from "react";

const TeamMapContext = createContext();

const STORAGE_KEY = "TEAM_MAP_V1";

export function TeamMapProvider({ children }) {
  const [teamMap, setTeamMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load teamMap from localStorage", e);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teamMap));
    } catch (e) {
      console.error("Failed to save teamMap to localStorage", e);
    }
  }, [teamMap]);

  return (
    <TeamMapContext.Provider value={{ teamMap, setTeamMap }}>
      {children}
    </TeamMapContext.Provider>
  );
}

export function useTeamMap() {
  return useContext(TeamMapContext);
}
