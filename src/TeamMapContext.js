import React, { createContext, useContext, useState } from "react";

const TeamMapContext = createContext();

export const TeamMapProvider = ({ children }) => {
  const [teamMap, setTeamMap] = useState({});

  return (
    <TeamMapContext.Provider value={{ teamMap, setTeamMap }}>
      {children}
    </TeamMapContext.Provider>
  );
};

export const useTeamMap = () => useContext(TeamMapContext);
