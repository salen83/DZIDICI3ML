import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

const NormalisedTeamMapContext = createContext();

export const NormalisedTeamMapProvider = ({ children }) => {
  const [teamMap, setTeamMap] = useState([]);

  // =====================
  // LOAD FROM SUPABASE
  // =====================
  useEffect(() => {
    const load = async () => {
      const { data: aliases } = await supabase
        .from("team_aliases")
        .select("alias, team_id");

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name");

      const teamById = {};
      (teams || []).forEach(t => {
        teamById[t.id] = t.name;
      });

      const map = (aliases || []).map(a => ({
        screen1: teamById[a.team_id],
        sofa: a.alias,
        team_id: a.team_id
      }));

      setTeamMap(map);
    };

    load();
  }, []);

  return (
    <NormalisedTeamMapContext.Provider value={{ teamMap, setTeamMap }}>
      {children}
    </NormalisedTeamMapContext.Provider>
  );
};

export const useNormalisedTeamMap = () =>
  useContext(NormalisedTeamMapContext);
