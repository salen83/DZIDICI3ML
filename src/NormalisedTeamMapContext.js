import React, { createContext, useContext, useState, useEffect } from "react";

const NormalisedTeamMapContext = createContext();

export const NormalisedTeamMapProvider = ({ children }) => {

  // JEDINI IZVOR ISTINE – trajno normalizovani timovi
  const [teamMap, setTeamMap] = useState(() => {
    const saved = localStorage.getItem("normalisedTeams");
    return saved ? JSON.parse(saved) : {};
  });

  // Automatsko trajno čuvanje
  useEffect(() => {
    localStorage.setItem("normalisedTeams", JSON.stringify(teamMap));
  }, [teamMap]);

  return (
    <NormalisedTeamMapContext.Provider
      value={{
        teamMap,
        setTeamMap
      }}
    >
      {children}
    </NormalisedTeamMapContext.Provider>
  );
};

export const useNormalisedTeamMap = () =>
  useContext(NormalisedTeamMapContext);
