import React, { createContext, useContext, useState } from "react";

const LeagueTeamContext = createContext();

export const LeagueTeamProvider = ({ children }) => {
  const [leagueTeamData, setLeagueTeamData] = useState({});

  return (
    <LeagueTeamContext.Provider value={{ leagueTeamData, setLeagueTeamData }}>
      {children}
    </LeagueTeamContext.Provider>
  );
};

export const useLeagueTeam = () => useContext(LeagueTeamContext);
