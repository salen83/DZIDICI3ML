import React, { createContext, useContext, useState } from "react";

const TeamMapContext = createContext();

export function TeamMapProvider({ children }) {
  const [teamMap, setTeamMap] = useState({}); // ovde čuvamo uparene timove

  const addTeamPair = (screen1Name, sofaName) => {
    const key = `${screen1Name}||${sofaName}`;
    setTeamMap(prev => ({ ...prev, [key]: { type: "team", name1: screen1Name, name2: sofaName } }));
  };

  const removeTeamPair = (screen1Name, sofaName) => {
    const key = `${screen1Name}||${sofaName}`;
    setTeamMap(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  return (
    <TeamMapContext.Provider value={{ teamMap, setTeamMap, addTeamPair, removeTeamPair }}>
      {children}
    </TeamMapContext.Provider>
  );
}

export const useTeamMap = () => useContext(TeamMapContext);
