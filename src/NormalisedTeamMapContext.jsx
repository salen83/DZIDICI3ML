import React, { createContext, useContext, useState } from "react";

const NormalisedTeamMapContext = createContext();

export const NormalisedTeamMapProvider = ({ children }) => {

  // JEDINI IZVOR ISTINE – trajno normalizovani timovi
  const [teamMap, setTeamMap] = useState(() => {
    const saved = localStorage.getItem("normalisedTeams");
    return saved ? JSON.parse(saved) : {};
  });

  // useEffect uklonjen – prelazimo na Supabase kasnije

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
