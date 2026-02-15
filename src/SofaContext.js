import React, { createContext, useContext, useState, useEffect } from "react";

const SofaContext = createContext();

const defaultSofaRows = [
  { Liga: "Premier League", Domacin: "Chelsea", Gost: "Arsenal" },
  { Liga: "Premier League", Domacin: "Liverpool", Gost: "Man City" },
  { Liga: "La Liga", Domacin: "Barcelona", Gost: "Real Madrid" },
  { Liga: "Serie A", Domacin: "Juventus", Gost: "Inter" }
];

export const SofaProvider = ({ children }) => {
  const [sofaRows, setSofaRows] = useState(() => {
    try {
      const stored = localStorage.getItem("sofaRows");
      // ako localStorage ne sadrži ništa, koristi defaultSofaRows
      return stored ? JSON.parse(stored) : defaultSofaRows;
    } catch {
      return defaultSofaRows;
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

export const useSofa = () => {
  const context = useContext(SofaContext);
  if (!context) throw new Error("useSofa must be used inside SofaProvider");
  return context;
};
