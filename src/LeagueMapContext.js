import React, { createContext, useContext, useState, useEffect } from "react";

/*
  leagueMap struktura:

  {
    leagueKey: {
      screen1: "Originalno ime lige iz Screen1",
      sofa: "Originalno ime lige iz SofaScore",
      normalized: "Normalizovano ime (za mapiranje)",
      screen1Teams: [],
      sofaTeams: []
    }
  }
*/

const LeagueMapContext = createContext();

export function LeagueMapProvider({ children }) {

  // ✅ UČITAJ TRAJNO SAČUVANE LIGE
   const [leagueMap, setLeagueMap] = useState(() => {
  const saved = localStorage.getItem("leagueMap");
  return saved ? JSON.parse(saved) : {};
});

  // ✅ AUTOMATSKO TRAJNO ČUVANJE
   useEffect(() => {
  localStorage.setItem("leagueMap", JSON.stringify(leagueMap));
}, [leagueMap]);

  // ======== CORE FUNKCIJA ========
  const registerLeague = (source, leagueName, teams = []) => {
    if (!leagueName) return;

    setLeagueMap(prev => {
      const next = { ...prev };
      const key = leagueName;

      if (!next[key]) {
        next[key] = {
          screen1: null,
          sofa: null,
          normalized: null,
          screen1Teams: [],
          sofaTeams: []
        };
      }
      if (!next[key].normalized && leagueName) {
  next[key].normalized = leagueName;
}

      if (source === "screen1" && !next[key].screen1) {
        next[key].screen1 = leagueName;
      }
      if (source === "sofa" && !next[key].sofa) {
        next[key].sofa = leagueName;
      }

      const teamField = source === "screen1" ? "screen1Teams" : "sofaTeams";

      teams.forEach(t => {
        if (t && !next[key][teamField].includes(t)) {
          next[key][teamField].push(t);
        }
      });

      return next;
    });
  };

  // ======== POVEZIVANJE LIGA ========
  const linkLeagues = (screen1Key, sofaKey, normalizedName) => {
    setLeagueMap(prev => {
      const next = { ...prev };
      if (!next[screen1Key] || !next[sofaKey]) return prev;

    next[screen1Key].normalized = normalizedName;
next[sofaKey].normalized = normalizedName;
localStorage.setItem("leagueMap", JSON.stringify(next));

      return next;
    });
  };

  // ======== UKLANJANJE TIMA ========
  const removeTeam = (leagueKey, source, teamName) => {
    setLeagueMap(prev => {
      const next = { ...prev };
      const field = source === "screen1" ? "screen1Teams" : "sofaTeams";

      if (next[leagueKey]) {
        next[leagueKey][field] =
          next[leagueKey][field].filter(t => t !== teamName);
      }

      return next;
    });
  };

  return (
    <LeagueMapContext.Provider
      value={{
        leagueMap,
        setLeagueMap,
        registerLeague,
        linkLeagues,
        removeTeam
      }}
    >
      {children}
    </LeagueMapContext.Provider>
  );
}

export function useLeagueMap() {
  return useContext(LeagueMapContext);
}
