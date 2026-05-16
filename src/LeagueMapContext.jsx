import React, { createContext, useContext, useState, useCallback } from "react";
import { useEffect } from "react";
import { supabase } from "./supabase";

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
useEffect(() => {
    const loadLeagueMap = async () => {

const { data: aliases } = await supabase
  .from("league_aliases")
  .select("alias, league_id");

const { data: leagues } = await supabase
  .from("leagues")
  .select("id, name");

if (!aliases || !leagues) return;

const leagueById = {};

leagues.forEach(l => {
  leagueById[l.id] = l.name;
});

const map = {};

aliases.forEach(a => {

  const aliasKey = a.alias
    ?.toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!aliasKey) return;

  map[aliasKey] = leagueById[a.league_id];
});

      console.log("✅ LEAGUE MAP LOADED:", map);

      setLeagueMap(map);
    };

    loadLeagueMap();
  }, []);

  const saveToStorage = useCallback((data) => {
    try {
      localStorage.setItem("leagueMap", JSON.stringify(data));
    } catch (e) {
      console.error("leagueMap storage full:", e);
    }
  }, []);


  return (
    <LeagueMapContext.Provider value={{
      leagueMap,
      setLeagueMap,
    }}>
      {children}
    </LeagueMapContext.Provider>
  );
}

export function useLeagueMap() {
  return useContext(LeagueMapContext);
}
