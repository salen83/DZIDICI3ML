import React, { createContext, useContext, useState, useEffect } from "react";

const NormalisedTeamMapContext = createContext();

export const NormalisedTeamMapProvider = ({ children }) => {

  // PRIVREMENA MAPA (proces normalizacije)
  const [teamMap, setTeamMap] = useState({});

  // TRAJNO NORMALIZOVANI TIMOVI
  const [normalisedTeams, setNormalisedTeams] = useState(() => {
    const saved = localStorage.getItem("normalisedTeams");
    return saved ? JSON.parse(saved) : {};
  });

  // Automatsko čuvanje u localStorage
  useEffect(() => {
    localStorage.setItem("normalisedTeams", JSON.stringify(normalisedTeams));
  }, [normalisedTeams]);

  return (
    <NormalisedTeamMapContext.Provider
      value={{
        teamMap,
        setTeamMap,
        normalisedTeams,
        setNormalisedTeams
      }}
    >
      {children}
    </NormalisedTeamMapContext.Provider>
  );
};

export const useNormalisedTeamMap = () =>
  useContext(NormalisedTeamMapContext);
