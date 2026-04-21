import React, { createContext, useContext, useState, useCallback } from "react";

const LeagueMapContext = createContext();

/*
  ⚠️ PRINCIP:
  - NO AUTO localStorage writes
  - ONLY manual save if needed
  - NO MUTATION
*/

export function LeagueMapProvider({ children }) {

  // load once only
  const [leagueMap, setLeagueMap] = useState(() => {
    try {
      const saved = localStorage.getItem("leagueMap");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 🚫 REMOVED useEffect auto-save (FIX #1)

  const saveToStorage = useCallback((data) => {
    try {
      localStorage.setItem("leagueMap", JSON.stringify(data));
    } catch (e) {
      console.error("leagueMap storage full:", e);
    }
  }, []);

  const registerLeague = useCallback((source, leagueName, teams = []) => {
    if (!leagueName) return;

    setLeagueMap(prev => {
      const next = structuredClone(prev); // 🔥 NO mutation safety

      if (!next[leagueName]) {
        next[leagueName] = {
          screen1: null,
          sofa: null,
          normalized: leagueName,
          screen1Teams: [],
          sofaTeams: []
        };
      }

      if (source === "screen1") {
        next[leagueName].screen1 = leagueName;
        next[leagueName].screen1Teams = [
          ...new Set([...(next[leagueName].screen1Teams || []), ...teams])
        ];
      }

      if (source === "sofa") {
        next[leagueName].sofa = leagueName;
        next[leagueName].sofaTeams = [
          ...new Set([...(next[leagueName].sofaTeams || []), ...teams])
        ];
      }

      return next;
    });
  }, []);

  const linkLeagues = useCallback((screen1Key, sofaKey, normalizedName) => {
    setLeagueMap(prev => {
      const next = structuredClone(prev);

      if (!next[screen1Key] || !next[sofaKey]) return prev;

      next[screen1Key].normalized = normalizedName;
      next[sofaKey].normalized = normalizedName;

      return next;
    });
  }, []);

  const removeTeam = useCallback((leagueKey, source, teamName) => {
    setLeagueMap(prev => {
      const next = structuredClone(prev);
      const field = source === "screen1" ? "screen1Teams" : "sofaTeams";

      if (next[leagueKey]) {
        next[leagueKey][field] =
          next[leagueKey][field].filter(t => t !== teamName);
      }

      return next;
    });
  }, []);

  // manual save only (OPTIONAL)
  const persistLeagueMap = useCallback(() => {
    saveToStorage(leagueMap);
  }, [leagueMap, saveToStorage]);

  return (
    <LeagueMapContext.Provider value={{
      leagueMap,
      setLeagueMap,
      registerLeague,
      linkLeagues,
      removeTeam,
      persistLeagueMap
    }}>
      {children}
    </LeagueMapContext.Provider>
  );
}

export function useLeagueMap() {
  return useContext(LeagueMapContext);
}
