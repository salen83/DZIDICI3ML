import React, { useEffect, useMemo, useState } from "react";
import "./FullScreen.css";

import {
  loadSofaCountries,
  loadCountryAliases
} from "../services/countryAliasService";

import { supabase } from "../supabase";
import { fetchAllSupabase } from "../utils/fetchAllSupabase";

import TabelaScreen from "./TabelaScreen";

export default function MapScreen({ onClose }) {
  const [screen1Matches, setScreen1Matches] = useState([]);

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
    try {
      /*
       * 1. UČITAJ SVE screen1_matches
       *
       * Ne koristimo MatchesContext/rows.
       * Map direktno čita screen1_matches iz Supabase.
       */
      const matches = await fetchAllSupabase(
        supabase,
        "screen1_matches",
        "league_id,league",
        {
          filters: [
            {
              type: "not",
              column: "league_id",
              operator: "is",
              value: null
            }
          ]
        }
      );

      setScreen1Matches(matches);

      console.log(
        "[MAP] screen1_matches ukupno:",
        matches.length
      );

      console.log(
        "[MAP] Različitih league_id:",
        new Set(
          matches
            .map(match => match.league_id)
            .filter(Boolean)
        ).size
      );

      /*
       * 2. UČITAJ SVE MAPPING PODATKE
       */
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

      setSofaCountries(countries || []);
      setCountryAliases(countryAliasData || []);

      if (leagueAliasResult.error) {
        console.error(
          "[MAP] load league_aliases:",
          leagueAliasResult.error
        );
      }

      if (sofaLeagueResult.error) {
        console.error(
          "[MAP] load sofa_leagues:",
          sofaLeagueResult.error
        );
      }

      setLeagueAliases(leagueAliasResult.data || []);
      setSofaLeagues(sofaLeagueResult.data || []);
    } catch (error) {
      console.error(
        "[MAP] Greška pri učitavanju podataka:",
        error
      );
    }
  }

  /*
   * Mozzart liga -> Sofa country_id
   */
  const countryAliasMap = useMemo(() => {
    const map = {};

    countryAliases.forEach(alias => {
      if (!alias.league_name) return;

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
   * Sofa league_id -> Mozzart alias
   *
   * Bitno:
   * Map više NE traži ligu preko imena iz rows.
   *
   * screen1_matches.league_id je glavni ključ.
   */
  const leagueMapById = useMemo(() => {
    const map = {};

    leagueAliases.forEach(alias => {
      if (!alias.league_id) return;

      const sofaLeague = sofaLeagueMap[alias.league_id];

      map[alias.league_id] = {
        leagueId: alias.league_id,

        countryId:
          alias.country_id ??
          sofaLeague?.country_id ??
          null,

        mozzartName: alias.alias,

        sofaName: sofaLeague?.name || null
      };
    });

    return map;
  }, [leagueAliases, sofaLeagueMap]);

  /*
   * SVE različite lige koje postoje u screen1_matches
   *
   * Glavni izvor je league_id iz screen1_matches.
   */
  const availableLeagueIds = useMemo(() => {
    return [
      ...new Set(
        screen1Matches
          .map(match => match.league_id)
          .filter(Boolean)
      )
    ];
  }, [screen1Matches]);

  /*
   * screen1_matches league_id
   *        ↓
   * league_aliases
   *        ↓
   * sofa_leagues
   *        ↓
   * country_id
   *
   * Grupisanje liga po državama.
   */
  const leaguesByCountry = useMemo(() => {
    const result = {};

    availableLeagueIds.forEach(leagueId => {
      const mapping = leagueMapById[leagueId];

      /*
       * Ako league_id nema mapping,
       * ne možemo prikazati Mozzart ligu.
       */
      if (!mapping) {
        return;
      }

      /*
       * Ako nema country_id,
       * ne znamo kojoj Sofa državi pripada.
       */
      if (!mapping.countryId) {
        return;
      }

      if (!result[mapping.countryId]) {
        result[mapping.countryId] = [];
      }

      /*
       * Spreči duplikate.
       */
      if (
        !result[mapping.countryId].some(
          league => league.leagueId === mapping.leagueId
        )
      ) {
        result[mapping.countryId].push({
          name: mapping.mozzartName,
          leagueId: mapping.leagueId,
          countryId: mapping.countryId,
          sofaName: mapping.sofaName
        });
      }
    });

    /*
     * Sortiranje liga po nazivu.
     */
    Object.values(result).forEach(leagues => {
      leagues.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    });

    return result;
  }, [availableLeagueIds, leagueMapById]);

  /*
   * Sofa države koje imaju najmanje jednu
   * dostupnu ligu iz screen1_matches.
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
   * Osnovna dijagnostika.
   *
   * Ovo više NE koristi rows.
   */
  useEffect(() => {
    if (!screen1Matches.length) return;

    const distinctLeagueIds = new Set(
      screen1Matches
        .map(match => match.league_id)
        .filter(Boolean)
    );

    const mappedLeagueIds = [
      ...distinctLeagueIds
    ].filter(
      leagueId => leagueMapById[leagueId]
    );

    const displayedLeagueIds = Object.values(
      leaguesByCountry
    )
      .flat()
      .map(league => league.leagueId);

    console.log(
      "========== MAP =========="
    );

    console.log(
      "[MAP] screen1_matches redova:",
      screen1Matches.length
    );

    console.log(
      "[MAP] Različitih league_id:",
      distinctLeagueIds.size
    );

    console.log(
      "[MAP] league_id sa mappingom:",
      mappedLeagueIds.length
    );

    console.log(
      "[MAP] Liga prikazanih na mapi:",
      displayedLeagueIds.length
    );

    console.log(
      "[MAP] Država sa ligama:",
      Object.keys(leaguesByCountry).length
    );

    console.log(
      "=========================="
    );
  }, [
    screen1Matches,
    leagueMapById,
    leaguesByCountry
  ]);

  /*
   * Ako je izabrana liga,
   * otvaramo TabelaScreen.
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
      <button
        className="close-button"
        onClick={onClose}
      >
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
