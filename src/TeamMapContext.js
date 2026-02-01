import React, { createContext, useContext, useState } from "react";

const TeamMapContext = createContext();

export function TeamMapProvider({ children }) {
  const [teamMap, setTeamMap] = useState({});

  // Dodaje timove i lige iz SofaScreen kao "sofa-candidate"
  const addSofaCandidates = (teams = [], leagues = []) => {
    setTeamMap(prev => {
      const newMap = { ...prev };

      teams.forEach(team => {
        const key = `sofa-team||${team}`;
        if (!newMap[key]) {
          newMap[key] = { type: "team", sofa: team, source: "sofa-candidate" };
        }
      });

      leagues.forEach(league => {
        const key = `sofa-league||${league}`;
        if (!newMap[key]) {
          newMap[key] = { type: "league", leagueSofa: league, source: "sofa-candidate" };
        }
      });

      return newMap;
    });
  };

  return (
    <TeamMapContext.Provider value={{ teamMap, setTeamMap, addSofaCandidates }}>
      {children}
    </TeamMapContext.Provider>
  );
}

export const useTeamMap = () => useContext(TeamMapContext);
