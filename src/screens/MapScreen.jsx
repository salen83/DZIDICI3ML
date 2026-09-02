import React, { useContext, useEffect, useMemo, useState } from "react";
import "./FullScreen.css";
import { MatchesContext } from "../MatchesContext";
import {
  loadSofaCountries,
  loadCountryAliases
} from "../services/countryAliasService";
import { supabase } from "../supabase";
import TabelaScreen from "./TabelaScreen";

export default function MapScreen({ onClose }) {
  const { rows } = useContext(MatchesContext);

  const [sofaCountries, setSofaCountries] = useState([]);
  const [countryAliases, setCountryAliases] = useState([]);
  const [leagueAliases, setLeagueAliases] = useState([]);
  const [sofaLeagues, setSofaLeagues] = useState([]);

  const [openCountry, setOpenCountry] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);

  useEffect(() => {
    loadMappingData();
  }, []);

  async function loadMappingData() {
    const [
      countries,
      countryAliasData,
      leagueAliasResult,
      sofaLeagueResult
    ] = await Promise.all([
      loadSofaCountries(),
      loadCountryAliases(),

      supabase
        .from("league_aliases")
        .select("*")
        .eq("source", "mozzart"),

      supabase
        .from("sofa_leagues")
        .select("id,country_id,name")
    ]);

    setSofaCountries(countries);
    setCountryAliases(countryAliasData);

    if (leagueAliasResult.error) {
      console.error(
        "load league_aliases:",
        leagueAliasResult.error
      );
    }

    if (sofaLeagueResult.error) {
      console.error(
        "load sofa_leagues:",
        sofaLeagueResult.error
      );
    }

    setLeagueAliases(leagueAliasResult.data || []);
    setSofaLeagues(sofaLeagueResult.data || []);
  }

  /*
   * Mozzart liga -> Sofa country_id
   */
  const countryAliasMap = useMemo(() => {
    const map = {};

    countryAliases.forEach(alias => {
      map[alias.league_name] = alias.country_id;
    });

    return map;
  }, [countryAliases]);

  /*
   * Sofa league_id -> Sofa liga
   */
  const sofaLeagueMap = useMemo(() => {
    const map = {};

    sofaLeagues.forEach(league => {
      map[league.id] = league;
    });

    return map;
  }, [sofaLeagues]);

  /*
   * Mozzart liga -> Sofa league
   */
  const leagueMap = useMemo(() => {
    const map = {};

    leagueAliases.forEach(alias => {
      const sofaLeague = sofaLeagueMap[alias.league_id];

      map[alias.alias] = {
        leagueId: alias.league_id,
        countryId:
          alias.country_id ??
          countryAliasMap[alias.alias] ??
          sofaLeague?.country_id ??
          null,
        mozzartName: alias.alias,
        sofaName: sofaLeague?.name || null
      };
    });

    return map;
  }, [
    leagueAliases,
    sofaLeagueMap,
    countryAliasMap
  ]);

  /*
   * Pronađi postojeće Mozzart lige iz rows
   * i grupiši ih po Sofa country_id.
   */
  const leaguesByCountry = useMemo(() => {
    const result = {};

    (rows || []).forEach(match => {
      const leagueName = match.liga;

      if (!leagueName) return;

      const mapping = leagueMap[leagueName];

      // Liga nema league_alias mapiranje
      if (!mapping) return;

      // Nemamo Sofa country ID
      if (!mapping.countryId) return;

      if (!result[mapping.countryId]) {
        result[mapping.countryId] = [];
      }

      if (
        !result[mapping.countryId].some(
          league => league.name === leagueName
        )
      ) {
        result[mapping.countryId].push({
          name: leagueName,
          leagueId: mapping.leagueId,
          countryId: mapping.countryId,
          sofaName: mapping.sofaName
        });
      }
    });

    Object.values(result).forEach(leagues => {
      leagues.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    });

    return result;
  }, [rows, leagueMap]);

  /*
   * Samo Sofa države koje imaju trenutno dostupne
   * i mapirane Mozzart lige.
   */
  const countriesToDisplay = useMemo(() => {
    return sofaCountries
      .filter(country =>
        leaguesByCountry[country.id]?.length > 0
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [sofaCountries, leaguesByCountry]);

  /*
   * Ako je izabrana liga, otvaramo TabelaScreen.
   */
  if (selectedLeague) {
    return (
      <TabelaScreen
        leagueId={selectedLeague.leagueId}
        leagueName={selectedLeague.name}
        sofaLeagueName={selectedLeague.sofaName}
        countryId={selectedLeague.countryId}
        onClose={() => setSelectedLeague(null)}
      />
    );
  }

  return (
    <div className="full-screen-container">
      <button className="close-button" onClick={onClose}>
        X Close
      </button>

      <ul>
        {countriesToDisplay.map((country, index) => {
          const leagues =
            leaguesByCountry[country.id];

          return (
            <li
              key={country.id}
              className="country-block"
            >
              <h3
                onClick={() =>
                  setOpenCountry(
                    openCountry === country.id
                      ? null
                      : country.id
                  )
                }
              >
                {index + 1}. {country.name}
              </h3>

              {openCountry === country.id && (
                <ul>
                  {leagues.map(league => (
                    <li
                      key={league.leagueId}
                      onClick={() =>
                        setSelectedLeague(league)
                      }
                      style={{
                        cursor: "pointer",
                        padding: "8px 4px"
                      }}
                    >
                      {league.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
