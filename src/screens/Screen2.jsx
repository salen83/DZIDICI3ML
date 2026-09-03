import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { fetchAllSupabase } from "../utils/fetchAllSupabase";
import "./Screen2.css";

/*
  SCREEN 2 - TEAM STATISTICS

  VAŽNO:
  - Statistika se racuna preko team_id, NE preko imena.
  - screen1_matches je glavni izvor utakmica.
  - team_aliases cuva sve Mozzart nazive.
  - sofa_teams je fallback za league_id / country_id / naziv.
  - sofa_standings daje podatke iz tabela.
  - Svi Supabase upiti koriste pagination preko fetchAllSupabase().
*/

// ---------------------------------------------------------
// POMOCNE FUNKCIJE
// ---------------------------------------------------------

const parseScore = (ft) => {
  if (!ft) return null;

  const value = String(ft)
    .trim()
    .replace(/\s+/g, "");

  const match = value.match(/^(\d+)[-:](\d+)$/);

  if (!match) return null;

  return {
    homeGoals: Number(match[1]),
    awayGoals: Number(match[2]),
  };
};

const chunkArray = (array, size = 500) => {
  const result = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
};

const getMatchDateTime = (match) => {
  const date = match.match_date || "";
  const time = match.match_time || "00:00";

  return `${date} ${time}`;
};

const formatPercent = (value, total) => {
  if (!total) return "0%";

  return `${((value / total) * 100).toFixed(1)}%`;
};

const getFormLetter = (gf, ga) => {
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
};

// ---------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------

export default function Screen2() {
  const [matches, setMatches] = useState([]);
  const [teamAliases, setTeamAliases] = useState([]);
  const [sofaTeams, setSofaTeams] = useState([]);
  const [standings, setStandings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");

  // -------------------------------------------------------
  // UCITAVANJE PODATAKA
  // -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("[SCREEN2] Ucitavam screen1_matches...");

        /*
          1. UCITAJ SVE SCREEN1 MECEVE

          Nema limita od 1000 jer helper radi pagination.
        */
        const allScreen1Matches = await fetchAllSupabase(
          supabase,
          "screen1_matches",
          "*",
          {
            orderBy: "match_date",
            ascending: false,
          }
        );

        console.log(
          "[SCREEN2] screen1_matches ukupno:",
          allScreen1Matches.length
        );

        if (cancelled) return;

        setMatches(allScreen1Matches);

        // ---------------------------------------------------
        // IZVADI SVE TEAM ID-JEVE
        // ---------------------------------------------------

        const teamIdSet = new Set();

        allScreen1Matches.forEach((match) => {
          if (match.home_team_id != null) {
            teamIdSet.add(Number(match.home_team_id));
          }

          if (match.away_team_id != null) {
            teamIdSet.add(Number(match.away_team_id));
          }
        });

        const teamIds = [...teamIdSet];

        console.log(
          "[SCREEN2] Pronadjeno team_id:",
          teamIds.length
        );

        // ---------------------------------------------------
        // IZVADI SVE LEAGUE ID-JEVE
        // ---------------------------------------------------

        const leagueIdSet = new Set();

        allScreen1Matches.forEach((match) => {
          if (match.league_id != null) {
            leagueIdSet.add(Number(match.league_id));
          }
        });

        const leagueIds = [...leagueIdSet];

        console.log(
          "[SCREEN2] Pronadjeno league_id:",
          leagueIds.length
        );

        // ---------------------------------------------------
        // 2. TEAM ALIASES
        // ---------------------------------------------------

        const aliasesResult = [];

        /*
          .in() takodje moze imati ogranicenja,
          zato team_id delimo u pakete od 500.
        */
        const teamChunks = chunkArray(teamIds, 500);

        for (const chunk of teamChunks) {
          if (!chunk.length) continue;

          const data = await fetchAllSupabase(
            supabase,
            "team_aliases",
            "id, team_id, alias, league_id, country_id",
            {
              filters: [
                {
                  type: "in",
                  column: "team_id",
                  values: chunk,
                },
              ],
              orderBy: "id",
              ascending: true,
            }
          );

          aliasesResult.push(...data);
        }

        console.log(
          "[SCREEN2] team_aliases ukupno:",
          aliasesResult.length
        );

        if (cancelled) return;

        setTeamAliases(aliasesResult);

        // ---------------------------------------------------
        // 3. SOFA TEAMS
        // ---------------------------------------------------

        const sofaTeamsResult = [];

        for (const chunk of teamChunks) {
          if (!chunk.length) continue;

          const data = await fetchAllSupabase(
            supabase,
            "sofa_teams",
            "id, name, league_id, country_id",
            {
              filters: [
                {
                  type: "in",
                  column: "id",
                  values: chunk,
                },
              ],
              orderBy: "id",
              ascending: true,
            }
          );

          sofaTeamsResult.push(...data);
        }

        console.log(
          "[SCREEN2] sofa_teams ukupno:",
          sofaTeamsResult.length
        );

        if (cancelled) return;

        setSofaTeams(sofaTeamsResult);

        // ---------------------------------------------------
        // 4. SOFA STANDINGS
        // ---------------------------------------------------

        const standingsResult = [];

        const leagueChunks = chunkArray(leagueIds, 500);

        for (const chunk of leagueChunks) {
          if (!chunk.length) continue;

          const data = await fetchAllSupabase(
            supabase,
            "sofa_standings",
            "*",
            {
              filters: [
                {
                  type: "in",
                  column: "league_id",
                  values: chunk,
                },
              ],
            }
          );

          standingsResult.push(...data);
        }

        console.log(
          "[SCREEN2] sofa_standings ukupno:",
          standingsResult.length
        );

        if (cancelled) return;

        setStandings(standingsResult);

        console.log("[SCREEN2] SVI PODACI UCITANI");
      } catch (err) {
        console.error("[SCREEN2] Greska:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Doslo je do greske prilikom ucitavanja podataka."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------
  // ALIASI PO TEAM ID
  // -------------------------------------------------------

  const aliasesByTeam = useMemo(() => {
    const map = {};

    teamAliases.forEach((row) => {
      const teamId = Number(row.team_id);

      if (!teamId) return;

      if (!map[teamId]) {
        map[teamId] = [];
      }

      map[teamId].push(row);
    });

    return map;
  }, [teamAliases]);

  // -------------------------------------------------------
  // SOFA TEAM PO ID
  // -------------------------------------------------------

  const sofaTeamById = useMemo(() => {
    const map = {};

    sofaTeams.forEach((team) => {
      if (team.id == null) return;

      map[Number(team.id)] = team;
    });

    return map;
  }, [sofaTeams]);

  // -------------------------------------------------------
  // PRONADJI GLAVNI LEAGUE ZA TIM
  // -------------------------------------------------------

  const primaryLeagueByTeam = useMemo(() => {
    const map = {};

    matches.forEach((match) => {
      const homeId = Number(match.home_team_id);
      const awayId = Number(match.away_team_id);
      const leagueId = Number(match.league_id);

      if (!leagueId) return;

      [homeId, awayId].forEach((teamId) => {
        if (!teamId) return;

        if (!map[teamId]) {
          map[teamId] = {};
        }

        map[teamId][leagueId] =
          (map[teamId][leagueId] || 0) + 1;
      });
    });

    const result = {};

    Object.entries(map).forEach(([teamId, leagues]) => {
      const sorted = Object.entries(leagues).sort(
        (a, b) => b[1] - a[1]
      );

      if (sorted.length) {
        result[Number(teamId)] = Number(sorted[0][0]);
      }
    });

    return result;
  }, [matches]);

  // -------------------------------------------------------
  // GLAVNI MOZART NAZIV
  // -------------------------------------------------------

  const getMainTeamName = (teamId) => {
    const id = Number(teamId);

    const aliases = aliasesByTeam[id] || [];

    const primaryLeague = primaryLeagueByTeam[id];

    /*
      Prvo probamo Mozzart alias koji pripada
      glavnoj ligi tog tima.
    */
    const leagueAlias = aliases.find(
      (a) => Number(a.league_id) === Number(primaryLeague)
    );

    if (leagueAlias?.alias) {
      return leagueAlias.alias;
    }

    /*
      Ako nema aliasa za glavnu ligu,
      uzimamo prvi Mozzart alias.
    */
    if (aliases.length > 0 && aliases[0].alias) {
      return aliases[0].alias;
    }

    /*
      Fallback na Sofa naziv.
    */
    if (sofaTeamById[id]?.name) {
      return sofaTeamById[id].name;
    }

    /*
      Poslednji fallback - ime iz screen1_matches.
    */
    const match = matches.find(
      (m) =>
        Number(m.home_team_id) === id ||
        Number(m.away_team_id) === id
    );

    if (match) {
      if (Number(match.home_team_id) === id) {
        return match.home || `Team ${id}`;
      }

      return match.away || `Team ${id}`;
    }

    return `Team ${id}`;
  };

  // -------------------------------------------------------
  // COUNTRY ID
  // -------------------------------------------------------

  const countryByTeam = useMemo(() => {
    const result = {};

    /*
      Prioritet:
      1. alias koji pripada glavnoj ligi
      2. bilo koji alias
      3. sofa_teams
    */

    Object.keys(aliasesByTeam).forEach((teamId) => {
      const id = Number(teamId);
      const aliases = aliasesByTeam[id] || [];
      const primaryLeague = primaryLeagueByTeam[id];

      const preferred = aliases.find(
        (a) =>
          Number(a.league_id) === Number(primaryLeague) &&
          a.country_id != null
      );

      const anyAlias = aliases.find(
        (a) => a.country_id != null
      );

      if (preferred?.country_id != null) {
        result[id] = Number(preferred.country_id);
      } else if (anyAlias?.country_id != null) {
        result[id] = Number(anyAlias.country_id);
      }
    });

    sofaTeams.forEach((team) => {
      const id = Number(team.id);

      if (
        result[id] == null &&
        team.country_id != null
      ) {
        result[id] = Number(team.country_id);
      }
    });

    return result;
  }, [
    aliasesByTeam,
    sofaTeams,
    primaryLeagueByTeam,
  ]);

  // -------------------------------------------------------
  // TEAM STATISTIKA
  // -------------------------------------------------------

  const teamStats = useMemo(() => {
    const teams = {};

    /*
      Deduplikacija utakmica.
      Ako postoji sofa_id, koristimo njega.
      Time izbegavamo da ista utakmica bude brojana 2x.
    */
    const uniqueMatches = [];
    const seenMatches = new Set();

    matches.forEach((match) => {
      const uniqueId =
        match.sofa_id != null
          ? `sofa-${match.sofa_id}`
          : `screen1-${match.id}`;

      if (seenMatches.has(uniqueId)) {
        return;
      }

      seenMatches.add(uniqueId);
      uniqueMatches.push(match);
    });

    /*
      Sortiramo od najstarijih ka najnovijim.
      Tako last5 stvarno predstavlja poslednjih 5 utakmica.
    */
    uniqueMatches.sort((a, b) => {
      return (
        new Date(getMatchDateTime(a)) -
        new Date(getMatchDateTime(b))
      );
    });

    uniqueMatches.forEach((match) => {
      const score = parseScore(match.ft);

      if (!score) return;

      const homeId = Number(match.home_team_id);
      const awayId = Number(match.away_team_id);
      const leagueId = Number(match.league_id);

      /*
        Bez ID-jeva NE racunamo statistiku.
        Ovo je vazno jer zelimo striktno ID-based statistiku.
      */
      if (!homeId || !awayId) {
        return;
      }

      const processTeam = (
        teamId,
        gf,
        ga,
        venue
      ) => {
        if (!teams[teamId]) {
          teams[teamId] = {
            teamId,
            games: 0,

            wins: 0,
            draws: 0,
            losses: 0,

            goalsFor: 0,
            goalsAgainst: 0,

            points: 0,

            gg: 0,
            ng: 0,
            twoPlus: 0,
            sevenPlus: 0,

            cleanSheets: 0,
            failedToScore: 0,

            homeGames: 0,
            homeWins: 0,
            homeDraws: 0,
            homeLosses: 0,

            awayGames: 0,
            awayWins: 0,
            awayDraws: 0,
            awayLosses: 0,

            last5: [],

            byLeague: {},
          };
        }

        const team = teams[teamId];

        team.games += 1;

        team.goalsFor += gf;
        team.goalsAgainst += ga;

        if (gf > ga) {
          team.wins += 1;
          team.points += 3;
        } else if (gf === ga) {
          team.draws += 1;
          team.points += 1;
        } else {
          team.losses += 1;
        }

        if (gf > 0 && ga > 0) {
          team.gg += 1;
        } else {
          team.ng += 1;
        }

        if (gf + ga >= 2) {
          team.twoPlus += 1;
        }

        if (gf + ga >= 7) {
          team.sevenPlus += 1;
        }

        if (ga === 0) {
          team.cleanSheets += 1;
        }

        if (gf === 0) {
          team.failedToScore += 1;
        }

        if (venue === "home") {
          team.homeGames += 1;

          if (gf > ga) {
            team.homeWins += 1;
          } else if (gf === ga) {
            team.homeDraws += 1;
          } else {
            team.homeLosses += 1;
          }
        }

        if (venue === "away") {
          team.awayGames += 1;

          if (gf > ga) {
            team.awayWins += 1;
          } else if (gf === ga) {
            team.awayDraws += 1;
          } else {
            team.awayLosses += 1;
          }
        }

        /*
          Last 5
        */
        team.last5.push({
          gf,
          ga,
          leagueId,
          date: match.match_date || "",
          opponent:
            venue === "home"
              ? match.away
              : match.home,
          venue,
        });

        if (team.last5.length > 5) {
          team.last5.shift();
        }

        /*
          Statistika po ligi
        */
        if (leagueId) {
          if (!team.byLeague[leagueId]) {
            team.byLeague[leagueId] = {
              leagueId,
              games: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              points: 0,
              gg: 0,
              ng: 0,
              twoPlus: 0,
              sevenPlus: 0,
            };
          }

          const league = team.byLeague[leagueId];

          league.games += 1;
          league.goalsFor += gf;
          league.goalsAgainst += ga;

          if (gf > ga) {
            league.wins += 1;
            league.points += 3;
          } else if (gf === ga) {
            league.draws += 1;
            league.points += 1;
          } else {
            league.losses += 1;
          }

          if (gf > 0 && ga > 0) {
            league.gg += 1;
          } else {
            league.ng += 1;
          }

          if (gf + ga >= 2) {
            league.twoPlus += 1;
          }

          if (gf + ga >= 7) {
            league.sevenPlus += 1;
          }
        }
      };

      processTeam(
        homeId,
        score.homeGoals,
        score.awayGoals,
        "home"
      );

      processTeam(
        awayId,
        score.awayGoals,
        score.homeGoals,
        "away"
      );
    });

    /*
      Izracunaj izvedene metrike.
    */
    Object.values(teams).forEach((team) => {
      const last5 = team.last5;

      team.goalDifference =
        team.goalsFor - team.goalsAgainst;

      team.avgGoals =
        team.games > 0
          ? (
              (team.goalsFor + team.goalsAgainst) /
              team.games
            ).toFixed(2)
          : "0.00";

      team.ggPercent = formatPercent(
        team.gg,
        team.games
      );

      team.ngPercent = formatPercent(
        team.ng,
        team.games
      );

      team.twoPlusPercent = formatPercent(
        team.twoPlus,
        team.games
      );

      team.sevenPlusPercent = formatPercent(
        team.sevenPlus,
        team.games
      );

      team.cleanSheetPercent = formatPercent(
        team.cleanSheets,
        team.games
      );

      team.scoredPercent = formatPercent(
        team.games - team.failedToScore,
        team.games
      );

      /*
        Last 5
      */
      team.last5Wins = last5.filter(
        (m) => m.gf > m.ga
      ).length;

      team.last5Draws = last5.filter(
        (m) => m.gf === m.ga
      ).length;

      team.last5Losses = last5.filter(
        (m) => m.gf < m.ga
      ).length;

      team.last5GG = last5.filter(
        (m) => m.gf > 0 && m.ga > 0
      ).length;

      team.last5TwoPlus = last5.filter(
        (m) => m.gf + m.ga >= 2
      ).length;

      team.last5SevenPlus = last5.filter(
        (m) => m.gf + m.ga >= 7
      ).length;

      team.last5AvgGoals =
        last5.length > 0
          ? (
              last5.reduce(
                (sum, m) => sum + m.gf + m.ga,
                0
              ) / last5.length
            ).toFixed(2)
          : "0.00";

      team.form = last5
        .map((m) => getFormLetter(m.gf, m.ga))
        .join("");
    });

    return Object.values(teams);
  }, [matches]);

  // -------------------------------------------------------
  // STANDINGS - NAJNOVIJI RED PO TEAM + LEAGUE
  // -------------------------------------------------------

  const latestStandings = useMemo(() => {
    const map = {};

    const sorted = [...standings].sort((a, b) => {
      const dateA = new Date(
        a.standings_date || a.updated_at || 0
      );

      const dateB = new Date(
        b.standings_date || b.updated_at || 0
      );

      return dateB - dateA;
    });

    sorted.forEach((row) => {
      const teamId = Number(row.team_id);
      const leagueId = Number(row.league_id);

      if (!teamId || !leagueId) return;

      const key = `${leagueId}-${teamId}`;

      if (!map[key]) {
        map[key] = row;
      }
    });

    return map;
  }, [standings]);

  // -------------------------------------------------------
  // KOMBINUJ STATISTIKU + METADATA
  // -------------------------------------------------------

  const finalTeams = useMemo(() => {
    return teamStats.map((team) => {
      const teamId = Number(team.teamId);

      const mainLeagueId =
        primaryLeagueByTeam[teamId] ||
        sofaTeamById[teamId]?.league_id ||
        null;

      const countryId =
        countryByTeam[teamId] ||
        sofaTeamById[teamId]?.country_id ||
        null;

      const aliases = aliasesByTeam[teamId] || [];

      /*
        Za standings uzimamo glavnu ligu.
      */
      const standing =
        mainLeagueId != null
          ? latestStandings[
              `${Number(mainLeagueId)}-${teamId}`
            ]
          : null;

      return {
        ...team,

        teamId,

        name: getMainTeamName(teamId),

        leagueId:
          mainLeagueId != null
            ? Number(mainLeagueId)
            : "",

        countryId:
          countryId != null
            ? Number(countryId)
            : "",

        aliases,

        standing,
      };
    });
  }, [
    teamStats,
    primaryLeagueByTeam,
    countryByTeam,
    aliasesByTeam,
    sofaTeamById,
    latestStandings,
  ]);

  // -------------------------------------------------------
  // LISTA LIGA ZA FILTER
  // -------------------------------------------------------

  const leagueOptions = useMemo(() => {
    const ids = new Set();

    finalTeams.forEach((team) => {
      if (team.leagueId) {
        ids.add(Number(team.leagueId));
      }
    });

    return [...ids].sort((a, b) => a - b);
  }, [finalTeams]);

  // -------------------------------------------------------
  // FILTER
  // -------------------------------------------------------

  const filteredTeams = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return finalTeams
      .filter((team) => {
        if (!searchValue) return true;

        const nameMatch = team.name
          ?.toLowerCase()
          .includes(searchValue);

        const idMatch = String(team.teamId)
          .includes(searchValue);

        return nameMatch || idMatch;
      })
      .filter((team) => {
        if (leagueFilter === "all") {
          return true;
        }

        return (
          Number(team.leagueId) ===
          Number(leagueFilter)
        );
      })
      .sort((a, b) => {
        /*
          Prvo po broju utakmica,
          pa po poenima.
        */
        if (b.games !== a.games) {
          return b.games - a.games;
        }

        return b.points - a.points;
      });
  }, [
    finalTeams,
    search,
    leagueFilter,
  ]);

  // -------------------------------------------------------
  // STATISTIKA ZA UI
  // -------------------------------------------------------

  const matchesWithoutIds = useMemo(() => {
    return matches.filter(
      (m) =>
        !m.home_team_id ||
        !m.away_team_id
    ).length;
  }, [matches]);

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------

  if (loading) {
    return (
      <div className="screen2-container">
        <h2>Statistika timova</h2>

        <div style={{ padding: 20 }}>
          Ucitavam sve podatke...
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // ERROR
  // -------------------------------------------------------

  if (error) {
    return (
      <div className="screen2-container">
        <h2>Statistika timova</h2>

        <div
          style={{
            padding: 20,
            color: "red",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <div
      className="screen2-container"
      style={{
        padding: 10,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h2>Statistika timova</h2>

      {/* ----------------------------------------------- */}
      {/* INFO */}
      {/* ----------------------------------------------- */}

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 15,
          fontSize: 13,
        }}
      >
        <span>
          Meceva: <b>{matches.length}</b>
        </span>

        <span>
          Timova: <b>{finalTeams.length}</b>
        </span>

        <span>
          Alias-a: <b>{teamAliases.length}</b>
        </span>

        <span>
          Standings: <b>{standings.length}</b>
        </span>

        {matchesWithoutIds > 0 && (
          <span style={{ color: "#b45309" }}>
            Bez ID-jeva:{" "}
            <b>{matchesWithoutIds}</b>
          </span>
        )}
      </div>

      {/* ----------------------------------------------- */}
      {/* FILTERI */}
      {/* ----------------------------------------------- */}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 15,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Pretrazi tim..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            padding: "8px 10px",
            minWidth: 220,
          }}
        />

        <select
          value={leagueFilter}
          onChange={(e) =>
            setLeagueFilter(e.target.value)
          }
          style={{
            padding: "8px 10px",
          }}
        >
          <option value="all">
            Sve lige
          </option>

          {leagueOptions.map((leagueId) => (
            <option
              key={leagueId}
              value={leagueId}
            >
              League ID: {leagueId}
            </option>
          ))}
        </select>
      </div>

      {/* ----------------------------------------------- */}
      {/* TABELA */}
      {/* ----------------------------------------------- */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 1450,
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th>#</th>
              <th>Tim</th>
              <th>Team ID</th>
              <th>League ID</th>
              <th>Country ID</th>

              <th>G</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>

              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>PTS</th>

              <th>GG %</th>
              <th>NG %</th>
              <th>2+ %</th>
              <th>7+ %</th>

              <th>CS %</th>
              <th>SC %</th>

              <th>AVG</th>

              <th>Last 5</th>

              <th>Tbl Pos</th>
              <th>Tbl Pts</th>

              <th>Detalji</th>
            </tr>
          </thead>

          <tbody>
            {filteredTeams.map(
              (team, index) => {
                const isExpanded =
                  expandedTeamId ===
                  team.teamId;

                const standing =
                  team.standing;

                return (
                  <React.Fragment
                    key={team.teamId}
                  >
                    <tr
                      style={{
                        borderBottom:
                          "1px solid #ddd",
                      }}
                    >
                      <td>
                        {index + 1}
                      </td>

                      {/* -------------------------------- */}
                      {/* IME - OTVARA ALIAS POPUP */}
                      {/* -------------------------------- */}

                      <td
                        onClick={() =>
                          setSelectedTeamId(
                            team.teamId
                          )
                        }
                        style={{
                          fontWeight: 700,
                          cursor: "pointer",
                          textDecoration:
                            "underline",
                          whiteSpace:
                            "nowrap",
                        }}
                        title="Klikni za sve Mozzart nazive"
                      >
                        {team.name}
                      </td>

                      <td>
                        {team.teamId}
                      </td>

                      <td>
                        {team.leagueId || "-"}
                      </td>

                      <td>
                        {team.countryId || "-"}
                      </td>

                      <td>{team.games}</td>
                      <td>{team.wins}</td>
                      <td>{team.draws}</td>
                      <td>{team.losses}</td>

                      <td>{team.goalsFor}</td>
                      <td>
                        {team.goalsAgainst}
                      </td>

                      <td>
                        {team.goalDifference}
                      </td>

                      <td>{team.points}</td>

                      <td>
                        {team.ggPercent}
                      </td>

                      <td>
                        {team.ngPercent}
                      </td>

                      <td>
                        {team.twoPlusPercent}
                      </td>

                      <td>
                        {team.sevenPlusPercent}
                      </td>

                      <td>
                        {team.cleanSheetPercent}
                      </td>

                      <td>
                        {team.scoredPercent}
                      </td>

                      <td>
                        {team.avgGoals}
                      </td>

                      <td
                        style={{
                          fontWeight: 700,
                          letterSpacing: 2,
                        }}
                      >
                        {team.form || "-"}
                      </td>

                      <td>
                        {standing?.position ??
                          standing?.rank ??
                          "-"}
                      </td>

                      <td>
                        {standing?.points ??
                          standing?.pts ??
                          "-"}
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            setExpandedTeamId(
                              isExpanded
                                ? null
                                : team.teamId
                            )
                          }
                        >
                          {isExpanded
                            ? "▲"
                            : "▼"}
                        </button>
                      </td>
                    </tr>

                    {/* -------------------------------- */}
                    {/* DETALJI PO LIGAMA */}
                    {/* -------------------------------- */}

                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={24}
                          style={{
                            padding: 15,
                            background:
                              "#f5f5f5",
                          }}
                        >
                          <div
                            style={{
                              marginBottom: 10,
                              fontWeight: 700,
                            }}
                          >
                            {team.name} —
                            statistika po ligama
                          </div>

                          {Object.values(
                            team.byLeague
                          )
                            .sort(
                              (a, b) =>
                                b.games -
                                a.games
                            )
                            .map(
                              (league) => (
                                <div
                                  key={
                                    league.leagueId
                                  }
                                  style={{
                                    marginBottom: 8,
                                    padding: 8,
                                    background:
                                      "white",
                                    border:
                                      "1px solid #ddd",
                                  }}
                                >
                                  <b>
                                    League ID:{" "}
                                    {
                                      league.leagueId
                                    }
                                  </b>

                                  {" | "}

                                  G:{" "}
                                  {
                                    league.games
                                  }

                                  {" | "}

                                  W:{" "}
                                  {
                                    league.wins
                                  }

                                  {" | "}

                                  D:{" "}
                                  {
                                    league.draws
                                  }

                                  {" | "}

                                  L:{" "}
                                  {
                                    league.losses
                                  }

                                  {" | "}

                                  GF:{" "}
                                  {
                                    league.goalsFor
                                  }

                                  {" | "}

                                  GA:{" "}
                                  {
                                    league.goalsAgainst
                                  }

                                  {" | "}

                                  PTS:{" "}
                                  {
                                    league.points
                                  }

                                  {" | "}

                                  GG:{" "}
                                  {formatPercent(
                                    league.gg,
                                    league.games
                                  )}

                                  {" | "}

                                  2+:{" "}
                                  {formatPercent(
                                    league.twoPlus,
                                    league.games
                                  )}
                                </div>
                              )
                            )}

                          {/* HOME / AWAY */}
                          <div
                            style={{
                              marginTop: 15,
                              display: "flex",
                              gap: 30,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <b>HOME</b>
                              <br />
                              G:{" "}
                              {team.homeGames}
                              <br />
                              W:{" "}
                              {team.homeWins}
                              <br />
                              D:{" "}
                              {team.homeDraws}
                              <br />
                              L:{" "}
                              {team.homeLosses}
                            </div>

                            <div>
                              <b>AWAY</b>
                              <br />
                              G:{" "}
                              {team.awayGames}
                              <br />
                              W:{" "}
                              {team.awayWins}
                              <br />
                              D:{" "}
                              {team.awayDraws}
                              <br />
                              L:{" "}
                              {team.awayLosses}
                            </div>

                            <div>
                              <b>LAST 5</b>
                              <br />
                              GG:{" "}
                              {team.last5GG}
                              /5
                              <br />
                              2+:{" "}
                              {
                                team.last5TwoPlus
                              }
                              /5
                              <br />
                              7+:{" "}
                              {
                                team.last5SevenPlus
                              }
                              /5
                              <br />
                              AVG:{" "}
                              {
                                team.last5AvgGoals
                              }
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }
            )}

            {filteredTeams.length === 0 && (
              <tr>
                <td
                  colSpan={24}
                  style={{
                    textAlign: "center",
                    padding: 30,
                  }}
                >
                  Nema timova za prikaz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ----------------------------------------------- */}
      {/* ALIAS POPUP */}
      {/* ----------------------------------------------- */}

      {selectedTeamId != null && (
        <div
          onClick={() =>
            setSelectedTeamId(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              background: "white",
              borderRadius: 8,
              padding: 20,
              width: "min(650px, 100%)",
              maxHeight: "80vh",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            {(() => {
              const teamId =
                Number(selectedTeamId);

              const team = finalTeams.find(
                (t) =>
                  Number(t.teamId) ===
                  teamId
              );

              const aliases =
                aliasesByTeam[teamId] || [];

              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      marginBottom: 15,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                        }}
                      >
                        {team?.name ||
                          getMainTeamName(
                            teamId
                          )}
                      </h3>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                        }}
                      >
                        Team ID:{" "}
                        <b>{teamId}</b>
                        {" | "}
                        League ID:{" "}
                        <b>
                          {team?.leagueId ||
                            "-"}
                        </b>
                        {" | "}
                        Country ID:{" "}
                        <b>
                          {team?.countryId ||
                            "-"}
                        </b>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedTeamId(
                          null
                        )
                      }
                      style={{
                        fontSize: 18,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <hr />

                  <h4>
                    Svi Mozzart nazivi (
                    {aliases.length})
                  </h4>

                  {aliases.length === 0 ? (
                    <div
                      style={{
                        padding: 15,
                        background:
                          "#f5f5f5",
                      }}
                    >
                      Nema sacuvanog
                      Mozzart aliasa.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse",
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              textAlign:
                                "left",
                              padding: 7,
                            }}
                          >
                            Alias
                          </th>

                          <th
                            style={{
                              textAlign:
                                "left",
                              padding: 7,
                            }}
                          >
                            League ID
                          </th>

                          <th
                            style={{
                              textAlign:
                                "left",
                              padding: 7,
                            }}
                          >
                            Country ID
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {aliases.map(
                          (alias, index) => (
                            <tr
                              key={
                                alias.id ??
                                `${alias.team_id}-${index}`
                              }
                              style={{
                                borderTop:
                                  "1px solid #ddd",
                              }}
                            >
                              <td
                                style={{
                                  padding: 7,
                                  fontWeight: 600,
                                }}
                              >
                                {alias.alias}
                              </td>

                              <td
                                style={{
                                  padding: 7,
                                }}
                              >
                                {alias.league_id ??
                                  "-"}
                              </td>

                              <td
                                style={{
                                  padding: 7,
                                }}
                              >
                                {alias.country_id ??
                                  "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
