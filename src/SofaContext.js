import React, { createContext, useContext, useState, useEffect } from "react";

const SofaContext = createContext();

export const SofaProvider = ({ children }) => {
  const [sofaRows, setSofaRows] = useState(() => {
    const saved = localStorage.getItem("sofaRows");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);

      // Normalizacija imena kolona: Liga -> league, Domacin -> home, Gost -> away
      return parsed.map(r => ({
        league: r.Liga || r.league || "",
        home: r.Domacin || r.home || "",
        away: r.Gost || r.away || "",
        ...r // ostale kolone ostaju iste
      }));
    } catch (e) {
      console.error("Failed to parse sofaRows from localStorage", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("sofaRows", JSON.stringify(sofaRows));
  }, [sofaRows]);

  return (
    <SofaContext.Provider value={{ sofaRows, setSofaRows }}>
      {children}
    </SofaContext.Provider>
  );
};

export const useSofa = () => useContext(SofaContext);
