import React, { createContext, useContext, useState, useCallback } from "react";

const LeagueTeamContext = createContext();

export const LeagueTeamProvider = ({ children }) => {
  const [leagueTeamData, setLeagueTeamData] = useState({});

  // 🔥 SAFE UPDATE (sprečava redundant re-render loop)
  const updateLeagueTeamData = useCallback((newData) => {
    setLeagueTeamData((prev) => {
      // simple shallow compare (basic guard)
      const prevKeys = Object.keys(prev || {});
      const newKeys = Object.keys(newData || {});

      if (prevKeys.length === newKeys.length) {
        let same = true;
        for (let k of prevKeys) {
          if (prev[k]?.sofaTeams?.length !== newData[k]?.sofaTeams?.length) {
            same = false;
            break;
          }
        }
        if (same) return prev; // 🚫 NO UPDATE → NO LOOP
      }

      return newData;
    });
  }, []);

  return (
    <LeagueTeamContext.Provider value={{ leagueTeamData, setLeagueTeamData: updateLeagueTeamData }}>
      {children}
    </LeagueTeamContext.Provider>
  );
};

export const useLeagueTeam = () => useContext(LeagueTeamContext);
