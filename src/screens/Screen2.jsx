import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { fetchAllSupabase } from "../utils/fetchAllSupabase";
import "./Screen2.css";

/* =========================================================
   HELPERS
========================================================= */

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const pct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const safeDiv = (a, b) => {
  const denominator = Number(b);
  if (!denominator) return 0;
  return Number(a || 0) / denominator;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const percent = (value) => `${round(pct(value), 1)}%`;

const dateValue = (value) => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

const chunkArray = (array, size = 500) => {
  const result = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
};

const getMatchKey = (match) =>
  match?.sofa_id
    ? `sofa-${match.sofa_id}`
    : `screen1-${match?.id}`;

const parseFT = (ft) => {
  if (!ft) return null;

  if (typeof ft === "object") {
    const home =
      ft.home ??
      ft.homeScore ??
      ft.home_score ??
      ft.homeGoals ??
      ft.home_goals;

    const away =
      ft.away ??
      ft.awayScore ??
      ft.away_score ??
      ft.awayGoals ??
      ft.away_goals;

    if (
      home !== undefined &&
      away !== undefined &&
      Number.isFinite(Number(home)) &&
      Number.isFinite(Number(away))
    ) {
      return {
        home: Number(home),
        away: Number(away),
      };
    }
  }

  if (typeof ft === "string") {
    const match = ft.match(/(\d+)\s*[-:]\s*(\d+)/);

    if (match) {
      return {
        home: Number(match[1]),
        away: Number(match[2]),
      };
    }
  }

  return null;
};

const getResultForTeam = (gf, ga) => {
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
};

const resultPoints = (result) => {
  if (result === "W") return 3;
  if (result === "D") return 1;
  return 0;
};

/* =========================================================
   STANDINGS
========================================================= */

const normalizeStanding = (row) => {
  if (!row) return null;

  const played = num(row.played);
  const wins = num(row.wins);
  const draws = num(row.draws);
  const losses = num(row.losses);

  const goalsFor = num(row.goals_for);
  const goalsAgainst = num(row.goals_against);

  const points = num(row.points);

  return {
    id: row.id,
    leagueId: row.league_id,
    seasonId: row.season_id,

    leagueName: row.league_name || "",
    groupName: row.group_name || "",

    position:
      row.position !== null && row.position !== undefined
        ? num(row.position)
        : null,

    teamId: row.team_id,

    teamName: row.team || row.short_name || "",

    played,
    wins,
    draws,
    losses,

    goalsFor,
    goalsAgainst,

    goalDifference:
      row.goal_difference !== null &&
      row.goal_difference !== undefined
        ? num(row.goal_difference)
        : goalsFor - goalsAgainst,

    points,

    ppg: safeDiv(points, played),
    gfPerGame: safeDiv(goalsFor, played),
    gaPerGame: safeDiv(goalsAgainst, played),
    gdPerGame: safeDiv(goalsFor - goalsAgainst, played),

    winRate: safeDiv(wins * 100, played),
    drawRate: safeDiv(draws * 100, played),
    lossRate: safeDiv(losses * 100, played),

    standingsDate: row.standings_date || null,
    createdAt: row.created_at || null,
    importedAt: row.imported_at || null,
  };
};

/* =========================================================
   FORM
========================================================= */

const calculateWindow = (games) => {
  const list = games || [];
  const played = list.length;

  let wins = 0;
  let draws = 0;
  let losses = 0;

  let goalsFor = 0;
  let goalsAgainst = 0;

  let gg = 0;
  let ng = 0;

  let over2 = 0;
  let over3 = 0;
  let over4 = 0;
  let over7 = 0;

  let cleanSheets = 0;
  let failedToScore = 0;

  for (const game of list) {
    const gf = num(game.gf);
    const ga = num(game.ga);

    if (gf > ga) wins += 1;
    else if (gf === ga) draws += 1;
    else losses += 1;

    goalsFor += gf;
    goalsAgainst += ga;

    if (gf > 0 && ga > 0) gg += 1;
    else ng += 1;

    const total = gf + ga;

    if (total >= 2) over2 += 1;
    if (total >= 3) over3 += 1;
    if (total >= 4) over4 += 1;
    if (total >= 7) over7 += 1;

    if (ga === 0) cleanSheets += 1;
    if (gf === 0) failedToScore += 1;
  }

  const points = wins * 3 + draws;

  return {
    played,

    wins,
    draws,
    losses,

    points,
    ppg: safeDiv(points, played),

    goalsFor,
    goalsAgainst,

    goalDifference: goalsFor - goalsAgainst,

    gfPerGame: safeDiv(goalsFor, played),
    gaPerGame: safeDiv(goalsAgainst, played),
    gdPerGame: safeDiv(goalsFor - goalsAgainst, played),

    winRate: safeDiv(wins * 100, played),
    drawRate: safeDiv(draws * 100, played),
    lossRate: safeDiv(losses * 100, played),

    gg,
    ng,

    ggRate: safeDiv(gg * 100, played),
    ngRate: safeDiv(ng * 100, played),

    over2,
    over3,
    over4,
    over7,

    over2Rate: safeDiv(over2 * 100, played),
    over3Rate: safeDiv(over3 * 100, played),
    over4Rate: safeDiv(over4 * 100, played),
    over7Rate: safeDiv(over7 * 100, played),

    cleanSheets,
    failedToScore,

    cleanSheetRate: safeDiv(cleanSheets * 100, played),
    failedToScoreRate: safeDiv(failedToScore * 100, played),
  };
};

/* =========================================================
   SCORE COMPONENTS
========================================================= */

const calculateTableStrength = (standing, leagueStandings) => {
  if (!standing) return 0;

  const rows = (leagueStandings || []).filter(
    (x) =>
      x &&
      x.played > 0 &&
      x.seasonId === standing.seasonId
  );

  if (!rows.length) return 0;

  const maxPPG = Math.max(...rows.map((x) => x.ppg), 0);
  const maxGD = Math.max(
    ...rows.map((x) => x.gdPerGame),
    0
  );

  const positionScores = rows
    .filter((x) => x.position)
    .map((x) => x.position);

  const maxPosition =
    positionScores.length > 0
      ? Math.max(...positionScores)
      : rows.length;

  const ppgScore =
    maxPPG > 0 ? (standing.ppg / maxPPG) * 60 : 0;

  const gdScore =
    maxGD > 0
      ? Math.max(0, standing.gdPerGame / maxGD) * 20
      : 0;

  const positionScore =
    maxPosition > 1 && standing.position
      ? ((maxPosition - standing.position + 1) /
          maxPosition) *
        20
      : 0;

  return pct(ppgScore + gdScore + positionScore);
};

const calculateFormStrength = (form) => {
  if (!form?.played) return 0;

  const ppgScore = Math.min(100, (form.ppg / 3) * 100);

  const gdScore = Math.max(
    0,
    Math.min(100, 50 + form.gdPerGame * 25)
  );

  const winScore = form.winRate;

  return pct(
    ppgScore * 0.5 +
      gdScore * 0.2 +
      winScore * 0.3
  );
};

const calculateAttackStrength = (
  standing,
  recentForm
) => {
  const seasonGF = standing?.gfPerGame || 0;
  const recentGF = recentForm?.gfPerGame || 0;

  if (!standing && !recentForm) return 0;

  const seasonScore = Math.min(
    100,
    seasonGF * 35
  );

  const recentScore = Math.min(
    100,
    recentGF * 35
  );

  const ggScore =
    recentForm?.played > 0
      ? recentForm.ggRate
      : 50;

  if (standing && recentForm?.played) {
    return pct(
      seasonScore * 0.45 +
        recentScore * 0.35 +
        ggScore * 0.2
    );
  }

  if (standing) return pct(seasonScore);

  return pct(
    recentScore * 0.7 +
      ggScore * 0.3
  );
};

const calculateDefenseStrength = (
  standing,
  recentForm
) => {
  const seasonGA = standing?.gaPerGame;
  const recentGA = recentForm?.gaPerGame;

  if (
    seasonGA === undefined &&
    recentGA === undefined
  ) {
    return 0;
  }

  const seasonScore =
    seasonGA !== undefined
      ? Math.max(0, Math.min(100, 100 - seasonGA * 35))
      : 0;

  const recentScore =
    recentGA !== undefined
      ? Math.max(0, Math.min(100, 100 - recentGA * 35))
      : 0;

  const csScore =
    recentForm?.played > 0
      ? recentForm.cleanSheetRate
      : 50;

  if (
    standing &&
    recentForm &&
    recentForm.played
  ) {
    return pct(
      seasonScore * 0.45 +
        recentScore * 0.35 +
        csScore * 0.2
    );
  }

  if (standing) return pct(seasonScore);

  return pct(
    recentScore * 0.7 +
      csScore * 0.3
  );
};

const calculateGoalStrength = (form) => {
  if (!form?.played) return 0;

  return pct(
    form.over2Rate * 0.3 +
      form.over3Rate * 0.2 +
      form.ggRate * 0.25 +
      form.gfPerGame * 15 +
      Math.max(0, 50 - form.gaPerGame * 10) *
        0.25
  );
};

const calculateVenueStrength = (
  home,
  away,
  isHome
) => {
  const split = isHome ? home : away;

  if (!split?.played) return 0;

  return pct(
    Math.min(100, (split.ppg / 3) * 100) *
      0.6 +
      split.winRate * 0.25 +
      Math.max(
        0,
        Math.min(100, 50 + split.gdPerGame * 25)
      ) *
        0.15
  );
};

const calculateConfidence = ({
  standing,
  last10,
  venue,
}) => {
  let score = 0;

  if (standing) {
    score += Math.min(35, standing.played * 1.75);
  }

  if (last10?.played) {
    score += Math.min(40, last10.played * 4);
  }

  if (venue?.played) {
    score += Math.min(25, venue.played * 2.5);
  }

  return pct(score);
};

const calculateFinalScore = ({
  tableStrength,
  formStrength,
  attackStrength,
  defenseStrength,
  goalStrength,
  venueStrength,
  confidence,
}) => {
  const available = [];

  const add = (value, weight) => {
    if (Number(value) > 0) {
      available.push({
        value: pct(value),
        weight,
      });
    }
  };

  add(tableStrength, 0.30);
  add(formStrength, 0.25);
  add(attackStrength, 0.15);
  add(defenseStrength, 0.15);
  add(goalStrength, 0.10);
  add(venueStrength, 0.05);

  if (!available.length) return 0;

  const weightSum = available.reduce(
    (sum, x) => sum + x.weight,
    0
  );

  const raw = available.reduce(
    (sum, x) => sum + x.value * x.weight,
    0
  ) / weightSum;

  /*
    Confidence ne treba da uništi rezultat.
    Samo blago koriguje score kada je uzorak mali.
  */
  const confidenceMultiplier =
    0.75 + confidence / 400;

  return pct(raw * confidenceMultiplier);
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Screen2() {
  const [matches, setMatches] = useState([]);
  const [teamAliases, setTeamAliases] = useState([]);
  const [sofaTeams, setSofaTeams] = useState([]);
  const [standings, setStandings] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [leagueAliases, setLeagueAliases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTeamId, setSelectedTeamId] =
    useState(null);

  const [expandedTeamId, setExpandedTeamId] =
    useState(null);

  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] =
    useState("all");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const screen1Matches =
          await fetchAllSupabase(
            supabase,
            "screen1_matches",
            "*",
            {
              orderBy: "match_date",
              ascending: false,
            }
          );

        if (cancelled) return;

        console.log(
          "[SCREEN2] screen1_matches:",
          screen1Matches.length
        );

        setMatches(screen1Matches);

        const teamIds = [
          ...new Set(
            screen1Matches
              .flatMap((m) => [
                m.home_team_id,
                m.away_team_id,
              ])
              .filter(Boolean)
              .map(Number)
          ),
        ];

        const matchLeagueIds = [
          ...new Set(
            screen1Matches
              .map((m) => m.league_id)
              .filter(Boolean)
              .map(Number)
          ),
        ];

        /* -----------------------------------------------
           ALIASES
        ------------------------------------------------ */

        const aliasRows = [];

        for (const ids of chunkArray(teamIds, 500)) {
          const rows =
            await fetchAllSupabase(
              supabase,
              "team_aliases",
              "id,team_id,alias,league_id,country_id",
              {
                filters: [
                  {
                    type: "in",
                    column: "team_id",
                    values: ids,
                  },
                ],
              }
            );

          aliasRows.push(...rows);
        }

        if (cancelled) return;

        setTeamAliases(aliasRows);

        /* -----------------------------------------------
           SOFA TEAMS
        ------------------------------------------------ */

        const sofaRows = [];

        for (const ids of chunkArray(teamIds, 500)) {
          const rows =
            await fetchAllSupabase(
              supabase,
              "sofa_teams",
              "id,name,league_id,country_id",
              {
                filters: [
                  {
                    type: "in",
                    column: "id",
                    values: ids,
                  },
                ],
              }
            );

          sofaRows.push(...rows);
        }

        if (cancelled) return;

        setSofaTeams(sofaRows);

        /* -----------------------------------------------
           STANDINGS

           Bitno:
           učitavamo standings i za:
           - lige iz utakmica
           - matične lige sofa_teams
        ------------------------------------------------ */

        const canonicalLeagueIds = sofaRows
          .map((team) => team.league_id)
          .filter(Boolean)
          .map(Number);

        const standingsLeagueIds = [
          ...new Set([
            ...matchLeagueIds,
            ...canonicalLeagueIds,
          ]),
        ];

        console.log(
          "[SCREEN2] standings league IDs:",
          standingsLeagueIds.length
        );

        const standingRows = [];

        for (const ids of chunkArray(
          standingsLeagueIds,
          500
        )) {
          const rows =
            await fetchAllSupabase(
              supabase,
              "sofa_standings",
              "*",
              {
                filters: [
                  {
                    type: "in",
                    column: "league_id",
                    values: ids,
                  },
                ],
              }
            );

          standingRows.push(...rows);
        }

        if (cancelled) return;

        setStandings(standingRows);

        /* -----------------------------------------------
           LEAGUES
        ------------------------------------------------ */

        const leagueRows = [];

        for (const ids of chunkArray(
          standingsLeagueIds,
          500
        )) {
          const rows =
            await fetchAllSupabase(
              supabase,
              "sofa_leagues",
              "id,country_id,name",
              {
                filters: [
                  {
                    type: "in",
                    column: "id",
                    values: ids,
                  },
                ],
              }
            );

          leagueRows.push(...rows);
        }

        if (cancelled) return;

        setLeagues(leagueRows);

        /* -----------------------------------------------
           LEAGUE ALIASES

           Samo relevantne lige.
        ------------------------------------------------ */

        const leagueAliasRows = [];

        for (const ids of chunkArray(
          standingsLeagueIds,
          500
        )) {
          const rows =
            await fetchAllSupabase(
              supabase,
              "league_aliases",
              "id,league_id,alias,source,country,type,region,gender,confidence,country_id",
              {
                filters: [
                  {
                    type: "in",
                    column: "league_id",
                    values: ids,
                  },
                ],
              }
            );

          leagueAliasRows.push(...rows);
        }

        if (!cancelled) {
          setLeagueAliases(leagueAliasRows);
        }
      } catch (err) {
        console.error(
          "[SCREEN2] Load error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Greška pri učitavanju Screen2 podataka."
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

  /* =======================================================
     INDEXES
  ======================================================= */

  const aliasesByTeam = useMemo(() => {
    const map = {};

    for (const alias of teamAliases) {
      const teamId = Number(alias.team_id);

      if (!map[teamId]) {
        map[teamId] = [];
      }

      map[teamId].push(alias);
    }

    return map;
  }, [teamAliases]);

  const sofaTeamById = useMemo(() => {
    const map = {};

    for (const team of sofaTeams) {
      map[Number(team.id)] = team;
    }

    return map;
  }, [sofaTeams]);

  const leagueById = useMemo(() => {
    const map = {};

    for (const league of leagues) {
      map[Number(league.id)] = league;
    }

    return map;
  }, [leagues]);

  const leagueAliasById = useMemo(() => {
    const map = {};

    for (const alias of leagueAliases) {
      const leagueId = Number(alias.league_id);

      if (!map[leagueId]) {
        map[leagueId] = [];
      }

      map[leagueId].push(alias);
    }

    return map;
  }, [leagueAliases]);

  /* =======================================================
     PRIMARY / HOME LEAGUE

     Prioritet:
     1. sofa_teams.league_id
     2. latest standings league
     3. match frequency
  ======================================================= */

  const latestStandingForTeam = useMemo(() => {
    const map = {};

    for (const raw of standings) {
      const row = normalizeStanding(raw);

      if (!row?.teamId) continue;

      const key = String(row.teamId);

      if (
        !map[key] ||
        dateValue(row.standingsDate) >
          dateValue(map[key].standingsDate)
      ) {
        map[key] = row;
      }
    }

    return map;
  }, [standings]);

  const matchLeagueFrequency = useMemo(() => {
    const map = {};

    for (const match of matches) {
      const homeId = Number(match.home_team_id);
      const awayId = Number(match.away_team_id);
      const leagueId = Number(match.league_id);

      if (!leagueId) continue;

      for (const teamId of [
        homeId,
        awayId,
      ]) {
        if (!teamId) continue;

        if (!map[teamId]) {
          map[teamId] = {};
        }

        map[teamId][leagueId] =
          (map[teamId][leagueId] || 0) + 1;
      }
    }

    return map;
  }, [matches]);

  const primaryLeagueByTeam = useMemo(() => {
    const result = {};

    const allTeamIds = [
      ...new Set(
        matches
          .flatMap((m) => [
            m.home_team_id,
            m.away_team_id,
          ])
          .filter(Boolean)
          .map(Number)
      ),
    ];

    for (const teamId of allTeamIds) {
      const sofaLeague =
        sofaTeamById[teamId]?.league_id;

      if (sofaLeague) {
        result[teamId] = Number(sofaLeague);
        continue;
      }

      const latest =
        latestStandingForTeam[String(teamId)];

      if (latest?.leagueId) {
        result[teamId] = Number(
          latest.leagueId
        );
        continue;
      }

      const frequency =
        matchLeagueFrequency[teamId] || {};

      const best = Object.entries(frequency).sort(
        (a, b) => b[1] - a[1]
      )[0];

      if (best) {
        result[teamId] = Number(best[0]);
      }
    }

    return result;
  }, [
    matches,
    sofaTeamById,
    latestStandingForTeam,
    matchLeagueFrequency,
  ]);

  /* =======================================================
     TEAM NAME
  ======================================================= */

  const getMainTeamName = (teamId) => {
    const id = Number(teamId);

    const mainLeague =
      primaryLeagueByTeam[id];

    const aliases =
      aliasesByTeam[id] || [];

    const preferredAlias =
      aliases.find(
        (a) =>
          Number(a.league_id) ===
          Number(mainLeague)
      );

    if (preferredAlias?.alias) {
      return preferredAlias.alias;
    }

    if (aliases[0]?.alias) {
      return aliases[0].alias;
    }

    if (sofaTeamById[id]?.name) {
      return sofaTeamById[id].name;
    }

    const match = matches.find(
      (m) =>
        Number(m.home_team_id) === id ||
        Number(m.away_team_id) === id
    );

    return (
      match?.home ||
      match?.away ||
      `Team ${id}`
    );
  };

  const countryByTeam = (teamId) => {
    const id = Number(teamId);

    const leagueId =
      primaryLeagueByTeam[id];

    const aliases =
      aliasesByTeam[id] || [];

    const preferred =
      aliases.find(
        (a) =>
          Number(a.league_id) ===
          Number(leagueId)
      );

    if (preferred?.country_id) {
      return preferred.country_id;
    }

    if (aliases[0]?.country_id) {
      return aliases[0].country_id;
    }

    return sofaTeamById[id]?.country_id || null;
  };

  /* =======================================================
     LEAGUE NAME
  ======================================================= */

  const getLeagueName = (leagueId) => {
    const id = Number(leagueId);

    const sofaLeague = leagueById[id];

    if (sofaLeague?.name) {
      return sofaLeague.name;
    }

    const standing = standings.find(
      (row) =>
        Number(row.league_id) === id
    );

    if (standing?.league_name) {
      return standing.league_name;
    }

    const aliases =
      leagueAliasById[id] || [];

    const preferred =
      aliases.find(
        (a) =>
          String(a.source || "")
            .toLowerCase() === "mozzart"
      );

    return (
      preferred?.alias ||
      aliases[0]?.alias ||
      `Liga ${id}`
    );
  };

  /* =======================================================
     TEAM MATCH STATS
  ======================================================= */

  const teamStats = useMemo(() => {
    const map = {};

    const uniqueMatches = [];
    const seen = new Set();

    for (const match of matches) {
      const key = getMatchKey(match);

      if (seen.has(key)) continue;

      seen.add(key);

      const homeId = Number(
        match.home_team_id
      );
      const awayId = Number(
        match.away_team_id
      );

      const score = parseFT(match.ft);

      if (!homeId || !awayId || !score) {
        continue;
      }

      uniqueMatches.push({
        ...match,
        homeId,
        awayId,
        homeScore: score.home,
        awayScore: score.away,
        matchKey: key,
      });
    }

    uniqueMatches.sort(
      (a, b) =>
        dateValue(a.match_date) -
        dateValue(b.match_date)
    );

    for (const match of uniqueMatches) {
      const {
        homeId,
        awayId,
        homeScore,
        awayScore,
      } = match;

      if (!map[homeId]) {
        map[homeId] = {
          games: [],
          byLeague: {},
          homeGames: [],
          awayGames: [],
        };
      }

      if (!map[awayId]) {
        map[awayId] = {
          games: [],
          byLeague: {},
          homeGames: [],
          awayGames: [],
        };
      }

      const homeResult = getResultForTeam(
        homeScore,
        awayScore
      );

      const awayResult = getResultForTeam(
        awayScore,
        homeScore
      );

      map[homeId].games.push({
        id: match.id,
        date: match.match_date,
        time: match.match_time,
        leagueId: match.league_id,
        opponentId: awayId,
        opponent: getMainTeamName(awayId),
        venue: "H",
        gf: homeScore,
        ga: awayScore,
        result: homeResult,
        points: resultPoints(homeResult),
      });

      map[awayId].games.push({
        id: match.id,
        date: match.match_date,
        time: match.match_time,
        leagueId: match.league_id,
        opponentId: homeId,
        opponent: getMainTeamName(homeId),
        venue: "A",
        gf: awayScore,
        ga: homeScore,
        result: awayResult,
        points: resultPoints(awayResult),
      });

      map[homeId].homeGames.push(
        map[homeId].games[
          map[homeId].games.length - 1
        ]
      );

      map[awayId].awayGames.push(
        map[awayId].games[
          map[awayId].games.length - 1
        ]
      );

      const leagueId = Number(
        match.league_id
      );

      if (leagueId) {
        if (!map[homeId].byLeague[leagueId]) {
          map[homeId].byLeague[leagueId] = [];
        }

        if (!map[awayId].byLeague[leagueId]) {
          map[awayId].byLeague[leagueId] = [];
        }

        map[homeId].byLeague[leagueId].push(
          map[homeId].games[
            map[homeId].games.length - 1
          ]
        );

        map[awayId].byLeague[leagueId].push(
          map[awayId].games[
            map[awayId].games.length - 1
          ]
        );
      }
    }

    return map;
  }, [matches, primaryLeagueByTeam]);

  /* =======================================================
     FINAL TEAM DATA
  ======================================================= */

  const finalTeams = useMemo(() => {
    const teamIds = [
      ...new Set(
        matches
          .flatMap((m) => [
            m.home_team_id,
            m.away_team_id,
          ])
          .filter(Boolean)
          .map(Number)
      ),
    ];

    return teamIds
      .map((teamId) => {
        const rawStats =
          teamStats[teamId] || {
            games: [],
            byLeague: {},
            homeGames: [],
            awayGames: [],
          };

        const games =
          rawStats.games || [];

        const chronological = [...games].sort(
          (a, b) =>
            dateValue(a.date) -
            dateValue(b.date)
        );

        const latestFirst = [
          ...chronological,
        ].reverse();

        const last3Games =
          latestFirst.slice(0, 3);

        const last5Games =
          latestFirst.slice(0, 5);

        const last10Games =
          latestFirst.slice(0, 10);

        const form3 =
          calculateWindow(last3Games);

        const form5 =
          calculateWindow(last5Games);

        const form10 =
          calculateWindow(last10Games);

        const homeStats =
          calculateWindow(
            rawStats.homeGames
          );

        const awayStats =
          calculateWindow(
            rawStats.awayGames
          );

        const mainLeagueId =
          primaryLeagueByTeam[teamId] ||
          sofaTeamById[teamId]?.league_id ||
          null;

        /*
          Najnovija tabela za baš matičnu ligu.
        */
        const teamStandings = standings
          .map(normalizeStanding)
          .filter(
            (s) =>
              Number(s.teamId) ===
                Number(teamId) &&
              Number(s.leagueId) ===
                Number(mainLeagueId)
          )
          .sort(
            (a, b) =>
              dateValue(b.standingsDate) -
              dateValue(a.standingsDate)
          );

        const standing =
          teamStandings[0] || null;

        /*
          Ako nema matične tabele, uzimamo
          najnoviju tabelu koju imamo za tim.
        */
        const fallbackStanding =
          standing ||
          latestStandingForTeam[
            String(teamId)
          ] ||
          null;

        const leagueRows = standings
          .map(normalizeStanding)
          .filter(
            (s) =>
              Number(s.leagueId) ===
                Number(
                  fallbackStanding?.leagueId
                ) &&
              Number(s.seasonId) ===
                Number(
                  fallbackStanding?.seasonId
                )
          );

        const tableStrength =
          calculateTableStrength(
            fallbackStanding,
            leagueRows
          );

        const formStrength =
          calculateFormStrength(form10);

        const attackStrength =
          calculateAttackStrength(
            fallbackStanding,
            form10
          );

        const defenseStrength =
          calculateDefenseStrength(
            fallbackStanding,
            form10
          );

        const goalStrength =
          calculateGoalStrength(form10);

        const isHomeVenue =
          homeStats.played >= awayStats.played;

        const venueStrength =
          calculateVenueStrength(
            homeStats,
            awayStats,
            isHomeVenue
          );

        const confidence =
          calculateConfidence({
            standing: fallbackStanding,
            last10: form10,
            venue: isHomeVenue
              ? homeStats
              : awayStats,
          });

        const finalScore =
          calculateFinalScore({
            tableStrength,
            formStrength,
            attackStrength,
            defenseStrength,
            goalStrength,
            venueStrength,
            confidence,
          });

        return {
          id: teamId,

          name: getMainTeamName(teamId),

          teamId,

          mainLeagueId:
            fallbackStanding?.leagueId ||
            mainLeagueId ||
            null,

          mainLeagueName:
            fallbackStanding?.leagueName ||
            getLeagueName(
              fallbackStanding?.leagueId ||
                mainLeagueId
            ),

          mainGroupName:
            fallbackStanding?.groupName ||
            "",

          countryId:
            countryByTeam(teamId),

          aliases:
            aliasesByTeam[teamId] || [],

          stats: {
            games: games.length,

            form3,
            form5,
            form10,

            home: homeStats,
            away: awayStats,

            last5: last5Games,
            last10: last10Games,

            byLeague:
              rawStats.byLeague,
          },

          standing: fallbackStanding,

          prediction: {
            tableStrength,
            formStrength,
            attackStrength,
            defenseStrength,
            goalStrength,
            venueStrength,
            confidence,
            finalScore,
          },
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "sr-Latn"
        )
      );
  }, [
    matches,
    teamStats,
    standings,
    primaryLeagueByTeam,
    sofaTeamById,
    latestStandingForTeam,
    aliasesByTeam,
    leagueById,
    leagueAliasById,
  ]);

  /* =======================================================
     LEAGUE FILTER
  ======================================================= */

  const leagueOptions = useMemo(() => {
    const map = new Map();

    for (const team of finalTeams) {
      if (!team.mainLeagueId) continue;

      map.set(
        Number(team.mainLeagueId),
        team.mainLeagueName ||
          getLeagueName(team.mainLeagueId)
      );
    }

    return [...map.entries()].sort((a, b) =>
      String(a[1]).localeCompare(
        String(b[1]),
        "sr-Latn"
      )
    );
  }, [finalTeams]);

  /* =======================================================
     FILTERED TEAMS
  ======================================================= */

  const filteredTeams = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return finalTeams.filter((team) => {
      const matchesSearch =
        !query ||
        team.name
          .toLowerCase()
          .includes(query) ||
        String(team.teamId).includes(query) ||
        String(
          team.mainLeagueId || ""
        ).includes(query);

      const matchesLeague =
        leagueFilter === "all" ||
        Number(team.mainLeagueId) ===
          Number(leagueFilter);

      return (
        matchesSearch &&
        matchesLeague
      );
    });
  }, [
    finalTeams,
    search,
    leagueFilter,
  ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const teams = finalTeams.length;

    const withStandings =
      finalTeams.filter(
        (x) => x.standing
      ).length;

    const matchesWithIds =
      matches.filter(
        (m) =>
          m.home_team_id &&
          m.away_team_id
      ).length;

    const matchesWithoutIds =
      matches.length -
      matchesWithIds;

    return {
      matches: matches.length,
      teams,
      aliases: teamAliases.length,
      standings: standings.length,
      withStandings,
      matchesWithoutIds,
    };
  }, [
    finalTeams,
    matches,
    teamAliases,
    standings,
  ]);

  /* =======================================================
     RENDER HELPERS
  ======================================================= */

  const renderForm = (games) => {
    if (!games?.length) {
      return (
        <span className="s2-muted">
          —
        </span>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          gap: 3,
          alignItems: "center",
        }}
      >
        {games.map((game, index) => (
          <span
            key={`${game.id}-${index}`}
            title={`${game.opponent} ${game.gf}:${game.ga}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              border: "1px solid rgba(0,0,0,.15)",
            }}
          >
            {game.result}
          </span>
        ))}
      </div>
    );
  };

  const renderScore = (value) => {
    if (!value) {
      return (
        <span className="s2-muted">
          —
        </span>
      );
    }

    return Math.round(value);
  };

  const toggleTeam = (teamId) => {
    setExpandedTeamId(
      expandedTeamId === teamId
        ? null
        : teamId
    );
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="screen2">
        <div className="screen2-loading">
          Učitavanje statistike...
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="screen2">
        <div className="screen2-error">
          <strong>Greška:</strong>{" "}
          {error}
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="screen2">
      <div className="screen2-header">
        <div>
          <h1>
            Statistika timova
          </h1>

          <div
            style={{
              fontSize: 13,
              opacity: 0.75,
              marginTop: 4,
            }}
          >
            Tabela + forma + napad +
            odbrana + Home/Away +
            prediktivni profil
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span className="s2-stat">
            Mečevi:{" "}
            <strong>
              {summary.matches}
            </strong>
          </span>

          <span className="s2-stat">
            Timovi:{" "}
            <strong>
              {summary.teams}
            </strong>
          </span>

          <span className="s2-stat">
            Alias:{" "}
            <strong>
              {summary.aliases}
            </strong>
          </span>

          <span className="s2-stat">
            Standings:{" "}
            <strong>
              {summary.standings}
            </strong>
          </span>

          <span className="s2-stat">
            Timovi sa tabelom:{" "}
            <strong>
              {summary.withStandings}
            </strong>
          </span>
        </div>
      </div>

      {/* FILTERS */}

      <div
        className="screen2-filters"
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 15,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Pretraži tim, Team ID ili League ID..."
          style={{
            minWidth: 300,
          }}
        />

        <select
          value={leagueFilter}
          onChange={(e) =>
            setLeagueFilter(e.target.value)
          }
        >
          <option value="all">
            Sve matične lige
          </option>

          {leagueOptions.map(
            ([id, name]) => (
              <option
                key={id}
                value={id}
              >
                {name} — {id}
              </option>
            )
          )}
        </select>
      </div>

      {/* MAIN TABLE */}

      <div
        className="screen2-table-wrap"
        style={{
          overflowX: "auto",
        }}
      >
        <table className="screen2-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tim</th>

              <th>Team ID</th>

              <th>
                Matična liga
              </th>

              <th>
                League ID
              </th>

              <th>
                Country ID
              </th>

              {/* MATCH SAMPLE */}

              <th>G</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>

              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>PTS</th>
              <th>PPG</th>

              <th>GG %</th>
              <th>NG %</th>
              <th>2+ %</th>
              <th>3+ %</th>
              <th>4+ %</th>
              <th>7+ %</th>

              <th>CS %</th>
              <th>FTS %</th>

              {/* TABLE */}

              <th>Tbl #</th>
              <th>Tbl G</th>
              <th>Tbl W</th>
              <th>Tbl D</th>
              <th>Tbl L</th>
              <th>Tbl GF</th>
              <th>Tbl GA</th>
              <th>Tbl GD</th>
              <th>Tbl PTS</th>
              <th>Tbl PPG</th>

              {/* PREDICTION */}

              <th>Table</th>
              <th>Form</th>
              <th>Attack</th>
              <th>Defense</th>
              <th>Goals</th>
              <th>Venue</th>
              <th>Confidence</th>
              <th>FINAL</th>

              <th>Last 5</th>

              <th>Detalji</th>
            </tr>
          </thead>

          <tbody>
            {filteredTeams.map(
              (team, index) => {
                const stats =
                  team.stats;

                const form =
                  stats.form10;

                const standing =
                  team.standing;

                const prediction =
                  team.prediction;

                const expanded =
                  expandedTeamId ===
                  team.teamId;

                return (
                  <React.Fragment
                    key={team.teamId}
                  >
                    <tr>
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTeamId(
                              team.teamId
                            )
                          }
                          style={{
                            border: 0,
                            background:
                              "transparent",
                            padding: 0,
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {team.name}
                        </button>
                      </td>

                      <td>
                        {team.teamId}
                      </td>

                      <td
                        title={
                          team.mainGroupName
                        }
                      >
                        {team.mainLeagueName ||
                          "—"}
                      </td>

                      <td>
                        {team.mainLeagueId ||
                          "—"}
                      </td>

                      <td>
                        {team.countryId ||
                          "—"}
                      </td>

                      {/* MATCH SAMPLE */}

                      <td>
                        {form.played}
                      </td>

                      <td>
                        {form.wins}
                      </td>

                      <td>
                        {form.draws}
                      </td>

                      <td>
                        {form.losses}
                      </td>

                      <td>
                        {form.goalsFor}
                      </td>

                      <td>
                        {form.goalsAgainst}
                      </td>

                      <td>
                        {form.goalDifference}
                      </td>

                      <td>
                        {form.points}
                      </td>

                      <td>
                        {round(
                          form.ppg
                        )}
                      </td>

                      <td>
                        {percent(
                          form.ggRate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.ngRate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.over2Rate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.over3Rate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.over4Rate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.over7Rate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.cleanSheetRate
                        )}
                      </td>

                      <td>
                        {percent(
                          form.failedToScoreRate
                        )}
                      </td>

                      {/* TABLE */}

                      <td>
                        {standing?.position ??
                          "—"}
                      </td>

                      <td>
                        {standing?.played ??
                          "—"}
                      </td>

                      <td>
                        {standing?.wins ??
                          "—"}
                      </td>

                      <td>
                        {standing?.draws ??
                          "—"}
                      </td>

                      <td>
                        {standing?.losses ??
                          "—"}
                      </td>

                      <td>
                        {standing?.goalsFor ??
                          "—"}
                      </td>

                      <td>
                        {standing?.goalsAgainst ??
                          "—"}
                      </td>

                      <td>
                        {standing
                          ? standing.goalDifference
                          : "—"}
                      </td>

                      <td>
                        {standing?.points ??
                          "—"}
                      </td>

                      <td>
                        {standing
                          ? round(
                              standing.ppg
                            )
                          : "—"}
                      </td>

                      {/* PREDICTION */}

                      <td>
                        {renderScore(
                          prediction.tableStrength
                        )}
                      </td>

                      <td>
                        {renderScore(
                          prediction.formStrength
                        )}
                      </td>

                      <td>
                        {renderScore(
                          prediction.attackStrength
                        )}
                      </td>

                      <td>
                        {renderScore(
                          prediction.defenseStrength
                        )}
                      </td>

                      <td>
                        {renderScore(
                          prediction.goalStrength
                        )}
                      </td>

                      <td>
                        {renderScore(
                          prediction.venueStrength
                        )}
                      </td>

                      <td>
                        {renderScore(
                          prediction.confidence
                        )}
                      </td>

                      <td
                        style={{
                          fontWeight: 800,
                        }}
                      >
                        {renderScore(
                          prediction.finalScore
                        )}
                      </td>

                      <td>
                        {renderForm(
                          stats.last5
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            toggleTeam(
                              team.teamId
                            )
                          }
                        >
                          {expanded
                            ? "▲"
                            : "▼"}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED */}

                    {expanded && (
                      <tr>
                        <td
                          colSpan={46}
                          style={{
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              padding: 18,
                              display:
                                "grid",
                              gap: 18,
                            }}
                          >
                            {/* PROFILE */}

                            <div>
                              <h3>
                                {team.name} —
                                Prediction
                                Profile
                              </h3>

                              <div
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit,minmax(140px,1fr))",
                                  gap: 10,
                                }}
                              >
                                {[
                                  [
                                    "Tabela",
                                    prediction.tableStrength,
                                  ],
                                  [
                                    "Forma",
                                    prediction.formStrength,
                                  ],
                                  [
                                    "Napad",
                                    prediction.attackStrength,
                                  ],
                                  [
                                    "Odbrana",
                                    prediction.defenseStrength,
                                  ],
                                  [
                                    "Golovi",
                                    prediction.goalStrength,
                                  ],
                                  [
                                    "Venue",
                                    prediction.venueStrength,
                                  ],
                                  [
                                    "Pouzdanost",
                                    prediction.confidence,
                                  ],
                                  [
                                    "FINAL",
                                    prediction.finalScore,
                                  ],
                                ].map(
                                  ([
                                    label,
                                    value,
                                  ]) => (
                                    <div
                                      key={
                                        label
                                      }
                                      style={{
                                        border:
                                          "1px solid rgba(0,0,0,.12)",
                                        borderRadius:
                                          8,
                                        padding: 10,
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 11,
                                          opacity:
                                            0.65,
                                        }}
                                      >
                                        {
                                          label
                                        }
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 22,
                                          fontWeight:
                                            800,
                                          marginTop: 4,
                                        }}
                                      >
                                        {renderScore(
                                          value
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {/* STANDINGS */}

                            <div>
                              <h3>
                                Sezonska
                                tabela
                              </h3>

                              {standing ? (
                                <div
                                  style={{
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit,minmax(120px,1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <div>
                                    <strong>
                                      Liga
                                    </strong>
                                    <br />
                                    {
                                      standing.leagueName
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      Grupa
                                    </strong>
                                    <br />
                                    {
                                      standing.groupName ||
                                        "—"
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      Season ID
                                    </strong>
                                    <br />
                                    {
                                      standing.seasonId
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      Pozicija
                                    </strong>
                                    <br />
                                    {
                                      standing.position
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      Odigrano
                                    </strong>
                                    <br />
                                    {
                                      standing.played
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      W/D/L
                                    </strong>
                                    <br />
                                    {standing.wins}/
                                    {standing.draws}/
                                    {standing.losses}
                                  </div>

                                  <div>
                                    <strong>
                                      GF/GA
                                    </strong>
                                    <br />
                                    {
                                      standing.goalsFor
                                    }
                                    /
                                    {
                                      standing.goalsAgainst
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      GD
                                    </strong>
                                    <br />
                                    {
                                      standing.goalDifference
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      PTS
                                    </strong>
                                    <br />
                                    {
                                      standing.points
                                    }
                                  </div>

                                  <div>
                                    <strong>
                                      PPG
                                    </strong>
                                    <br />
                                    {round(
                                      standing.ppg
                                    )}
                                  </div>

                                  <div>
                                    <strong>
                                      GF/G
                                    </strong>
                                    <br />
                                    {round(
                                      standing.gfPerGame
                                    )}
                                  </div>

                                  <div>
                                    <strong>
                                      GA/G
                                    </strong>
                                    <br />
                                    {round(
                                      standing.gaPerGame
                                    )}
                                  </div>

                                  <div>
                                    <strong>
                                      Datum
                                    </strong>
                                    <br />
                                    {
                                      standing.standingsDate ||
                                        "—"
                                    }
                                  </div>
                                </div>
                              ) : (
                                <div className="s2-muted">
                                  Za ovaj tim
                                  nema
                                  dostupne
                                  odgovarajuće
                                  tabele.
                                </div>
                              )}
                            </div>

                            {/* FORM */}

                            <div>
                              <h3>
                                Forma — poslednjih
                                3 / 5 / 10
                              </h3>

                              <div
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit,minmax(180px,1fr))",
                                  gap: 10,
                                }}
                              >
                                {[
                                  [
                                    "Last 3",
                                    stats.form3,
                                  ],
                                  [
                                    "Last 5",
                                    stats.form5,
                                  ],
                                  [
                                    "Last 10",
                                    stats.form10,
                                  ],
                                ].map(
                                  ([
                                    label,
                                    value,
                                  ]) => (
                                    <div
                                      key={
                                        label
                                      }
                                      style={{
                                        border:
                                          "1px solid rgba(0,0,0,.12)",
                                        borderRadius:
                                          8,
                                        padding: 12,
                                      }}
                                    >
                                      <strong>
                                        {label}
                                      </strong>

                                      <div
                                        style={{
                                          marginTop: 8,
                                          lineHeight:
                                            1.7,
                                        }}
                                      >
                                        G:{" "}
                                        {
                                          value.played
                                        }
                                        <br />
                                        W/D/L:{" "}
                                        {
                                          value.wins
                                        }
                                        /
                                        {
                                          value.draws
                                        }
                                        /
                                        {
                                          value.losses
                                        }
                                        <br />
                                        GF/GA:{" "}
                                        {
                                          value.goalsFor
                                        }
                                        /
                                        {
                                          value.goalsAgainst
                                        }
                                        <br />
                                        PPG:{" "}
                                        {round(
                                          value.ppg
                                        )}
                                        <br />
                                        GG:{" "}
                                        {percent(
                                          value.ggRate
                                        )}
                                        <br />
                                        2+:{" "}
                                        {percent(
                                          value.over2Rate
                                        )}
                                        <br />
                                        3+:{" "}
                                        {percent(
                                          value.over3Rate
                                        )}
                                        <br />
                                        CS:{" "}
                                        {percent(
                                          value.cleanSheetRate
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {/* HOME / AWAY */}

                            <div>
                              <h3>
                                Home / Away
                              </h3>

                              <div
                                style={{
                                  display:
                                    "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit,minmax(220px,1fr))",
                                  gap: 10,
                                }}
                              >
                                {[
                                  [
                                    "HOME",
                                    stats.home,
                                  ],
                                  [
                                    "AWAY",
                                    stats.away,
                                  ],
                                ].map(
                                  ([
                                    label,
                                    value,
                                  ]) => (
                                    <div
                                      key={
                                        label
                                      }
                                      style={{
                                        border:
                                          "1px solid rgba(0,0,0,.12)",
                                        borderRadius:
                                          8,
                                        padding: 12,
                                      }}
                                    >
                                      <strong>
                                        {label}
                                      </strong>

                                      <div
                                        style={{
                                          marginTop: 8,
                                          lineHeight:
                                            1.7,
                                        }}
                                      >
                                        G:{" "}
                                        {
                                          value.played
                                        }
                                        <br />
                                        W/D/L:{" "}
                                        {
                                          value.wins
                                        }
                                        /
                                        {
                                          value.draws
                                        }
                                        /
                                        {
                                          value.losses
                                        }
                                        <br />
                                        GF/G:{" "}
                                        {round(
                                          value.gfPerGame
                                        )}
                                        <br />
                                        GA/G:{" "}
                                        {round(
                                          value.gaPerGame
                                        )}
                                        <br />
                                        PPG:{" "}
                                        {round(
                                          value.ppg
                                        )}
                                        <br />
                                        GG:{" "}
                                        {percent(
                                          value.ggRate
                                        )}
                                        <br />
                                        2+:{" "}
                                        {percent(
                                          value.over2Rate
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            {/* LAST 10 */}

                            <div>
                              <h3>
                                Poslednjih 10
                                utakmica
                              </h3>

                              <div
                                style={{
                                  overflowX:
                                    "auto",
                                }}
                              >
                                <table className="screen2-table">
                                  <thead>
                                    <tr>
                                      <th>
                                        Datum
                                      </th>
                                      <th>
                                        Liga
                                      </th>
                                      <th>
                                        Venue
                                      </th>
                                      <th>
                                        Protivnik
                                      </th>
                                      <th>
                                        Rezultat
                                      </th>
                                      <th>
                                        Ishod
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {stats.last10.map(
                                      (
                                        game,
                                        i
                                      ) => (
                                        <tr
                                          key={`${game.id}-${i}`}
                                        >
                                          <td>
                                            {
                                              game.date
                                            }
                                          </td>

                                          <td>
                                            {
                                              getLeagueName(
                                                game.leagueId
                                              )
                                            }
                                          </td>

                                          <td>
                                            {
                                              game.venue
                                            }
                                          </td>

                                          <td>
                                            {
                                              game.opponent
                                            }
                                          </td>

                                          <td>
                                            {
                                              game.gf
                                            }
                                            :
                                            {
                                              game.ga
                                            }
                                          </td>

                                          <td>
                                            {
                                              game.result
                                            }
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* BY LEAGUE */}

                            <div>
                              <h3>
                                Statistika po
                                takmičenju
                              </h3>

                              <div
                                style={{
                                  overflowX:
                                    "auto",
                                }}
                              >
                                <table className="screen2-table">
                                  <thead>
                                    <tr>
                                      <th>
                                        Liga
                                      </th>
                                      <th>
                                        League ID
                                      </th>
                                      <th>
                                        G
                                      </th>
                                      <th>
                                        W
                                      </th>
                                      <th>
                                        D
                                      </th>
                                      <th>
                                        L
                                      </th>
                                      <th>
                                        GF
                                      </th>
                                      <th>
                                        GA
                                      </th>
                                      <th>
                                        PTS
                                      </th>
                                      <th>
                                        PPG
                                      </th>
                                      <th>
                                        GG %
                                      </th>
                                      <th>
                                        2+ %
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {Object.entries(
                                      stats.byLeague
                                    ).map(
                                      ([
                                        leagueId,
                                        games,
                                      ]) => {
                                        const value =
                                          calculateWindow(
                                            games
                                          );

                                        return (
                                          <tr
                                            key={
                                              leagueId
                                            }
                                          >
                                            <td>
                                              {getLeagueName(
                                                leagueId
                                              )}
                                            </td>

                                            <td>
                                              {
                                                leagueId
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.played
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.wins
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.draws
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.losses
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.goalsFor
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.goalsAgainst
                                              }
                                            </td>

                                            <td>
                                              {
                                                value.points
                                              }
                                            </td>

                                            <td>
                                              {round(
                                                value.ppg
                                              )}
                                            </td>

                                            <td>
                                              {percent(
                                                value.ggRate
                                              )}
                                            </td>

                                            <td>
                                              {percent(
                                                value.over2Rate
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      }
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      {/* ALIAS POPUP */}

      {selectedTeamId && (
        <div
          onClick={() =>
            setSelectedTeamId(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.45)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "min(700px, 100%)",
              maxHeight: "80vh",
              overflowY: "auto",
              background:
                "var(--background, #fff)",
              borderRadius: 12,
              padding: 20,
              boxShadow:
                "0 20px 60px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: 10,
                marginBottom: 15,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  {getMainTeamName(
                    selectedTeamId
                  )}
                </h2>

                <div
                  style={{
                    opacity: 0.7,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  Team ID:{" "}
                  {selectedTeamId}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTeamId(null)
                }
              >
                ✕
              </button>
            </div>

            <h3>
              Mozzart / Team aliases
            </h3>

            {(aliasesByTeam[
              selectedTeamId
            ] || []).length === 0 ? (
              <div className="s2-muted">
                Nema sačuvanih aliasa.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {(
                  aliasesByTeam[
                    selectedTeamId
                  ] || []
                ).map((alias) => (
                  <div
                    key={alias.id}
                    style={{
                      border:
                        "1px solid rgba(0,0,0,.12)",
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {alias.alias}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        marginTop: 4,
                      }}
                    >
                      League ID:{" "}
                      {alias.league_id ??
                        "—"}
                      {" • "}
                      Country ID:{" "}
                      {alias.country_id ??
                        "—"}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        marginTop: 3,
                      }}
                    >
                      Liga:{" "}
                      {getLeagueName(
                        alias.league_id
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedTeamId(null)
                }
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
