import React, { createContext, useContext, useState } from "react";

const LeagueMapContext = createContext();

export function LeagueMapProvider({ children }) {
  const [leagueMap, setLeagueMap] = useState({}); // ovde čuvamo uparene lige

  const addLeaguePair = (screen1Name, sofaName) => {
    const key = `league||${screen1Name}||${sofaName}`;
    setLeagueMap(prev => ({ ...prev, [key]: { type: "league", name1: screen1Name, name2: sofaName } }));
  };

  const removeLeaguePair = (screen1Name, sofaName) => {
    const key = `league||${screen1Name}||${sofaName}`;
    setLeagueMap(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  return (
    <LeagueMapContext.Provider value={{ leagueMap, setLeagueMap, addLeaguePair, removeLeaguePair }}>
      {children}
    </LeagueMapContext.Provider>
  );
}

export const useLeagueMap = () => useContext(LeagueMapContext);
