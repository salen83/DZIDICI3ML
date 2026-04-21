import React, { createContext, useContext, useState, useEffect } from "react";

const SofaContext = createContext();

// DEFAULT (fallback samo prvi load)
const defaultSofaRows = [
  { rb: 1, liga: "Premier League", home: "Chelsea", away: "Arsenal" },
  { rb: 2, liga: "Premier League", home: "Liverpool", away: "Man City" },
  { rb: 3, liga: "La Liga", home: "Barcelona", away: "Real Madrid" },
  { rb: 4, liga: "Serie A", home: "Juventus", away: "Inter" }
];

// NORMALIZACIJA (bez crash-a)
const normalizeRow = (r) => ({
  rb: r.rb ?? 0,
  liga: r.liga ?? r.Liga ?? "",
  home: r.home ?? r.Domacin ?? "",
  away: r.away ?? r.Gost ?? "",
  ...r
});

export const SofaProvider = ({ children }) => {
  const [sofaRows, setSofaRows] = useState(defaultSofaRows);

  // SAMO INIT LOG (bez storage, bez loopova)
  useEffect(() => {
    console.log("[SofaContext] initialized, rows:", sofaRows.length);
  }, []);

  return (
    <SofaContext.Provider value={{ sofaRows, setSofaRows, normalizeRow }}>
      {children}
    </SofaContext.Provider>
  );
};

export const useSofa = () => {
  const context = useContext(SofaContext);
  if (!context) throw new Error("useSofa must be used inside SofaProvider");
  return context;
};
