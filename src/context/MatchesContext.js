import React, { createContext, useState, useMemo, useCallback } from "react";

export const MatchesContext = createContext();

export function MatchesProvider({ children }) {
  const [matches, setMatches] = useState([]);
  const [futureMatches, setFutureMatches] = useState([]);

  const updateMatches = useCallback((data) => {
    setMatches(data);
  }, []);

  const updateFutureMatches = useCallback((data) => {
    setFutureMatches(data);
  }, []);

  const value = useMemo(() => ({
    matches,
    futureMatches,
    updateMatches,
    updateFutureMatches,
  }), [matches, futureMatches, updateMatches, updateFutureMatches]);

  return (
    <MatchesContext.Provider value={value}>
      {children}
    </MatchesContext.Provider>
  );
}
