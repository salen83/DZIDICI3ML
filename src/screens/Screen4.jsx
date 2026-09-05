import React, { useContext, useEffect, useMemo, useState } from "react";
import { MatchesContext } from "../MatchesContext";
import { supabase } from "../supabase";
import { fetchAllSupabase } from "../utils/fetchAllSupabase";

/* =========================================================
   SCREEN 4
   STATISTICAL PREDICTION ENGINE

   Model:
   - ID based team matching
   - historical match deduplication
   - league goal baselines
   - home/away attack & defence
   - recency weighted form
   - Bayesian-style shrinkage
   - standings strength
   - normalized H2H
   - Poisson score matrix
   - conservative probability
   - market implied probability
   - EV
   - SAFE / VALUE / NO BET
   - SAFE / BALANCED / VALUE tickets
========================================================= */

/* =========================================================
   GENERAL HELPERS
========================================================= */

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const pct = (value, digits = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${(n * 100).toFixed(digits)}%`;
};

const pct0 = (value) => pct(value, 0);

const odd = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 1) return null;
  return n;
};

const factorial = (n) => {
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
};

const poissonPmf = (k, lambda) => {
  const l = clamp(lambda, 0.01, 8);
  return Math.exp(-l) * Math.pow(l, k) / factorial(k);
};

const safeDate = (value) => {
  if (!value) return null;

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d;

  return null;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const parseScore = (value) => {
  if (!value) return null;

  const text = String(value).trim();

  const match = text.match(/(\d+)\s*[-:]\s*(\d+)/);

  if (!match) return null;

  return {
    home: Number(match[1]),
    away: Number(match[2]),
  };
};

const resultForHome = (homeGoals, awayGoals) => {
  if (homeGoals > awayGoals) return "W";
  if (homeGoals < awayGoals) return "L";
  return "D";
};

const resultForTeam = (teamId, homeId, awayId, homeGoals, awayGoals) => {
  const id = String(teamId);

  if (id === String(homeId)) {
    return resultForHome(homeGoals, awayGoals);
  }

  if (id === String(awayId)) {
    return resultForHome(awayGoals, homeGoals);
  }

  return null;
};

const average = (values) => {
  const arr = values.filter((x) => Number.isFinite(Number(x)));

  if (!arr.length) return 0;

  return arr.reduce((sum, x) => sum + Number(x), 0) / arr.length;
};

const weightedAverage = (values) => {
  if (!values.length) return 0;

  let weighted = 0;
  let totalWeight = 0;

  values.forEach((item) => {
    const value = num(item.value);
    const weight = num(item.weight);

    weighted += value * weight;
    totalWeight += weight;
  });

  return totalWeight ? weighted / totalWeight : 0;
};

const shrink = (rate, sampleSize, prior, priorWeight = 8) => {
  const n = Math.max(0, Number(sampleSize) || 0);

  return (
    (n * num(rate) + priorWeight * num(prior)) /
    (n + priorWeight)
  );
};

const exponentialWeight = (age) => {
  return Math.exp(-0.085 * Math.max(0, age));
};

const formatDate = (value) => {
  const d = safeDate(value);

  if (!d) return "-";

  return d.toLocaleDateString("sr-Latn", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatNumber = (value, digits = 2) => {
  const n = Number(value);

  if (!Number.isFinite(n)) return "-";

  return n.toFixed(digits);
};

const marketLabel = (market) => {
  const labels = {
    home: "1",
    draw: "X",
    away: "2",
    gg: "GG",
    ng: "NG",
    over15: "O1.5",
    over25: "O2.5",
    over35: "O3.5",
    under25: "U2.5",
  };

  return labels[market] || market;
};

const marketGroup = (market) => {
  if (["home", "draw", "away"].includes(market)) return "1X2";

  if (["gg", "ng"].includes(market)) return "GG";

  if (
    ["over15", "over25", "over35", "under25"].includes(market)
  ) {
    return "GOALS";
  }

  return market;
};

/* =========================================================
   ODDS HELPERS
========================================================= */

const getOdd = (match, market) => {
  if (!match) return null;

  const sources = {
    home: [
      "home_odds",
      "homeOdd",
      "odd1",
      "odds1",
      "kvota1",
      "odd_1",
      "m1",
      "1",
    ],

    draw: [
      "draw_odds",
      "drawOdd",
      "oddX",
      "oddsX",
      "kvotaX",
      "odd_x",
      "mx",
      "X",
    ],

    away: [
      "away_odds",
      "awayOdd",
      "odd2",
      "odds2",
      "kvota2",
      "kvota_2",
      "odd_2",
      "m2",
      "2",
    ],

    gg: [
      "gg_odds",
      "ggOdd",
      "oddGG",
      "oddsGG",
      "kvotaGG",
      "odd_gg",
      "gg",
    ],

    ng: [
      "ng_odds",
      "ngOdd",
      "oddNG",
      "oddsNG",
      "kvotaNG",
      "odd_ng",
      "ng",
    ],

    over15: [
      "over15_odds",
      "over_15_odds",
      "oddOver15",
      "oddsOver15",
      "kvotaOver15",
      "odd_over15",
      "over15",
      "over1.5",
    ],

    over25: [
      "over25_odds",
      "over_25_odds",
      "oddOver25",
      "oddsOver25",
      "kvotaOver25",
      "odd_over25",
      "over25",
      "over2.5",
    ],

    over35: [
      "over35_odds",
      "over_35_odds",
      "oddOver35",
      "oddsOver35",
      "kvotaOver35",
      "odd_over35",
      "over35",
      "over3.5",
    ],

    under25: [
      "under25_odds",
      "under_25_odds",
      "oddUnder25",
      "oddsUnder25",
      "kvotaUnder25",
      "odd_under25",
      "under25",
      "under2.5",
    ],
  };

  const keys = sources[market] || [];

  for (const key of keys) {
    if (match[key] !== undefined && match[key] !== null) {
      const value = odd(match[key]);

      if (value) return value;
    }
  }

  const nested =
    match.odds ||
    match.odds_data ||
    match.mozzart_odds ||
    match.mozzartOdds;

  if (nested && typeof nested === "object") {
    for (const key of keys) {
      const value = odd(nested[key]);

      if (value) return value;
    }
  }

  return null;
};

/* =========================================================
   MARKET PROBABILITY
========================================================= */

const devig = (oddsArray) => {
  const valid = oddsArray.map(odd);

  if (valid.some((x) => !x)) return null;

  const raw = valid.map((x) => 1 / x);
  const total = raw.reduce((sum, x) => sum + x, 0);

  if (!total) return null;

  return raw.map((x) => x / total);
};

const calculateMarketProbabilities = (match) => {
  const result = {};

  const o1 = getOdd(match, "home");
  const ox = getOdd(match, "draw");
  const o2 = getOdd(match, "away");

  const oneXTwo = devig([o1, ox, o2]);

  if (oneXTwo) {
    result.home = oneXTwo[0];
    result.draw = oneXTwo[1];
    result.away = oneXTwo[2];
  }

  const gg = getOdd(match, "gg");
  const ng = getOdd(match, "ng");

  const ggNg = devig([gg, ng]);

  if (ggNg) {
    result.gg = ggNg[0];
    result.ng = ggNg[1];
  } else {
    if (gg) result.gg = 1 / gg;
    if (ng) result.ng = 1 / ng;
  }

  const over25 = getOdd(match, "over25");
  const under25 = getOdd(match, "under25");

  const ou25 = devig([over25, under25]);

  if (ou25) {
    result.over25 = ou25[0];
    result.under25 = ou25[1];
  } else {
    if (over25) result.over25 = 1 / over25;
    if (under25) result.under25 = 1 / under25;
  }

  return result;
};

/* =========================================================
   SCORE MATRIX
========================================================= */

const buildPoissonMatrix = (
  lambdaHome,
  lambdaAway,
  maxGoals = 8
) => {
  const matrix = [];

  let total = 0;

  for (let home = 0; home <= maxGoals; home += 1) {
    const row = [];

    for (let away = 0; away <= maxGoals; away += 1) {
      const probability =
        poissonPmf(home, lambdaHome) *
        poissonPmf(away, lambdaAway);

      row.push(probability);
      total += probability;
    }

    matrix.push(row);
  }

  if (total > 0) {
    for (let h = 0; h <= maxGoals; h += 1) {
      for (let a = 0; a <= maxGoals; a += 1) {
        matrix[h][a] /= total;
      }
    }
  }

  return matrix;
};

const probabilitiesFromMatrix = (matrix) => {
  let home = 0;
  let draw = 0;
  let away = 0;
  let gg = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;

  for (let h = 0; h < matrix.length; h += 1) {
    for (let a = 0; a < matrix[h].length; a += 1) {
      const p = matrix[h][a];

      if (h > a) home += p;
      if (h === a) draw += p;
      if (h < a) away += p;

      if (h > 0 && a > 0) gg += p;
      if (h + a >= 2) over15 += p;
      if (h + a >= 3) over25 += p;
      if (h + a >= 4) over35 += p;
    }
  }

  return {
    home,
    draw,
    away,
    gg,
    ng: 1 - gg,
    over15,
    over25,
    under25: 1 - over25,
    over35,
    under35: 1 - over35,
  };
};

const getMostLikelyScores = (matrix, limit = 5) => {
  const rows = [];

  for (let h = 0; h < matrix.length; h += 1) {
    for (let a = 0; a < matrix[h].length; a += 1) {
      rows.push({
        home: h,
        away: a,
        probability: matrix[h][a],
      });
    }
  }

  return rows
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);
};

/* =========================================================
   DIXON-COLES STYLE LOW SCORE ADJUSTMENT
========================================================= */

const dixonColesTau = (home, away, lambdaHome, lambdaAway) => {
  const rho = -0.08;

  if (home === 0 && away === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }

  if (home === 0 && away === 1) {
    return 1 + lambdaHome * rho;
  }

  if (home === 1 && away === 0) {
    return 1 + lambdaAway * rho;
  }

  if (home === 1 && away === 1) {
    return 1 - rho;
  }

  return 1;
};

const buildDixonColesMatrix = (
  lambdaHome,
  lambdaAway,
  maxGoals = 8
) => {
  const matrix = [];

  let total = 0;

  for (let home = 0; home <= maxGoals; home += 1) {
    const row = [];

    for (let away = 0; away <= maxGoals; away += 1) {
      const base =
        poissonPmf(home, lambdaHome) *
        poissonPmf(away, lambdaAway);

      const adjusted =
        base *
        Math.max(
          0.01,
          dixonColesTau(
            home,
            away,
            lambdaHome,
            lambdaAway
          )
        );

      row.push(adjusted);
      total += adjusted;
    }

    matrix.push(row);
  }

  if (total > 0) {
    for (let h = 0; h <= maxGoals; h += 1) {
      for (let a = 0; a <= maxGoals; a += 1) {
        matrix[h][a] /= total;
      }
    }
  }

  return matrix;
};

/* =========================================================
   TEAM ID / NAME RESOLUTION
========================================================= */

const getTeamIdFromObject = (obj, side) => {
  if (!obj) return null;

  const keys =
    side === "home"
      ? [
          "home_team_id",
          "homeTeamId",
          "home_id",
          "homeId",
        ]
      : [
          "away_team_id",
          "awayTeamId",
          "away_id",
          "awayId",
        ];

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return String(obj[key]);
    }
  }

  return null;
};

const getTeamNameFromObject = (obj, side) => {
  if (!obj) return "";

  const keys =
    side === "home"
      ? ["home", "home_team", "homeTeam", "raw_home"]
      : ["away", "away_team", "awayTeam", "raw_away"];

  for (const key of keys) {
    if (obj[key]) return String(obj[key]);
  }

  return "";
};

const getLeagueId = (match) => {
  if (!match) return null;

  const value =
    match.league_id ??
    match.leagueId ??
    match.sofa_league_id ??
    match.sofaLeagueId;

  return value === undefined ||
    value === null ||
    value === ""
    ? null
    : String(value);
};

const getMatchDateValue = (match) => {
  return (
    match?.match_date ||
    match?.matchDate ||
    match?.date ||
    match?.start_time ||
    match?.startTime ||
    match?.datetime ||
    match?.created_at ||
    null
  );
};

/* =========================================================
   HISTORICAL NORMALIZATION
========================================================= */

const normalizeHistoricalMatch = (row) => {
  if (!row) return null;

  const score = parseScore(
    row.ft ||
      row.full_time ||
      row.fullTime ||
      row.result ||
      row.score
  );

  if (!score) return null;

  const homeId =
    row.home_team_id ??
    row.homeTeamId ??
    row.home_id ??
    null;

  const awayId =
    row.away_team_id ??
    row.awayTeamId ??
    row.away_id ??
    null;

  if (homeId === null || awayId === null) {
    return null;
  }

  const date = safeDate(getMatchDateValue(row));

  if (!date) return null;

  return {
    id: row.id ? String(row.id) : null,

    sofaId:
      row.sofa_id !== undefined && row.sofa_id !== null
        ? String(row.sofa_id)
        : null,

    source: row.source || "screen1",

    date,

    dateValue: date.getTime(),

    homeTeamId: String(homeId),
    awayTeamId: String(awayId),

    homeName:
      row.home ||
      row.raw_home ||
      row.home_team ||
      "",

    awayName:
      row.away ||
      row.raw_away ||
      row.away_team ||
      "",

    leagueId: getLeagueId(row),

    leagueName:
      row.league ||
      row.league_name ||
      row.raw_league ||
      "",

    homeGoals: score.home,
    awayGoals: score.away,

    totalGoals: score.home + score.away,

    gg: score.home > 0 && score.away > 0,

    result:
      score.home > score.away
        ? "1"
        : score.home < score.away
        ? "2"
        : "X",
  };
};

const deduplicateMatches = (rows) => {
  const map = new Map();

  rows.forEach((row) => {
    const match = normalizeHistoricalMatch(row);

    if (!match) return;

    let key;

    if (match.sofaId) {
      key = `sofa:${match.sofaId}`;
    } else if (match.id) {
      key = `id:${match.id}`;
    } else {
      key = [
        match.dateValue,
        match.homeTeamId,
        match.awayTeamId,
        match.homeGoals,
        match.awayGoals,
      ].join(":");
    }

    if (!map.has(key)) {
      map.set(key, match);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => a.dateValue - b.dateValue
  );
};

/* =========================================================
   ALIAS MAP
========================================================= */

const buildAliasMap = (aliases, sofaTeams) => {
  const map = new Map();

  const add = (name, teamId) => {
    if (!name || teamId === null || teamId === undefined) {
      return;
    }

    const key = normalizeText(name);

    if (!key) return;

    if (!map.has(key)) {
      map.set(key, []);
    }

    const list = map.get(key);

    const id = String(teamId);

    if (!list.includes(id)) {
      list.push(id);
    }
  };

  (aliases || []).forEach((row) => {
    add(row.alias, row.team_id);
  });

  (sofaTeams || []).forEach((row) => {
    add(row.name, row.id);
    add(row.short_name, row.id);
  });

  return map;
};

const buildTeamMetadata = (aliases, sofaTeams) => {
  const map = new Map();

  (sofaTeams || []).forEach((team) => {
    const id = String(team.id);

    map.set(id, {
      id,
      name: team.name || team.short_name || id,
      shortName: team.short_name || team.name || id,
      leagueId:
        team.league_id !== null &&
        team.league_id !== undefined
          ? String(team.league_id)
          : null,
      aliases: [],
    });
  });

  (aliases || []).forEach((row) => {
    if (row.team_id === null || row.team_id === undefined) {
      return;
    }

    const id = String(row.team_id);

    if (!map.has(id)) {
      map.set(id, {
        id,
        name: row.alias || id,
        shortName: row.alias || id,
        leagueId:
          row.league_id !== null &&
          row.league_id !== undefined
            ? String(row.league_id)
            : null,
        aliases: [],
      });
    }

    const team = map.get(id);

    if (
      row.alias &&
      !team.aliases.some(
        (x) =>
          normalizeText(x.alias) === normalizeText(row.alias)
      )
    ) {
      team.aliases.push({
        alias: row.alias,
        leagueId:
          row.league_id !== null &&
          row.league_id !== undefined
            ? String(row.league_id)
            : null,
        countryId:
          row.country_id !== null &&
          row.country_id !== undefined
            ? String(row.country_id)
            : null,
      });
    }

    if (!team.leagueId && row.league_id) {
      team.leagueId = String(row.league_id);
    }
  });

  return map;
};

const resolveTeamId = (
  match,
  side,
  aliasMap,
  teamMetadata
) => {
  const explicitId = getTeamIdFromObject(match, side);

  if (explicitId) {
    return explicitId;
  }

  const name = getTeamNameFromObject(match, side);
  const normalized = normalizeText(name);

  if (!normalized) return null;

  const candidates = aliasMap.get(normalized) || [];

  if (!candidates.length) return null;

  const leagueId = getLeagueId(match);

  if (leagueId) {
    const sameLeague = candidates.find((id) => {
      const team = teamMetadata.get(String(id));

      if (!team) return false;

      if (String(team.leagueId) === String(leagueId)) {
        return true;
      }

      return team.aliases?.some(
        (alias) =>
          alias.leagueId &&
          String(alias.leagueId) === String(leagueId)
      );
    });

    if (sameLeague) return sameLeague;
  }

  return candidates[0];
};

/* =========================================================
   LEAGUE BASELINES
========================================================= */

const createEmptyLeagueStats = () => ({
  matches: 0,

  homeGoals: 0,
  awayGoals: 0,
  totalGoals: 0,

  gg: 0,

  over15: 0,
  over25: 0,
  over35: 0,

  homeWins: 0,
  draws: 0,
  awayWins: 0,

  teams: new Set(),
});

const buildLeagueStats = (matches) => {
  const map = new Map();

  matches.forEach((match) => {
    const leagueId = match.leagueId || "unknown";

    if (!map.has(leagueId)) {
      map.set(leagueId, createEmptyLeagueStats());
    }

    const stats = map.get(leagueId);

    stats.matches += 1;

    stats.homeGoals += match.homeGoals;
    stats.awayGoals += match.awayGoals;
    stats.totalGoals += match.totalGoals;

    if (match.gg) stats.gg += 1;

    if (match.totalGoals >= 2) stats.over15 += 1;
    if (match.totalGoals >= 3) stats.over25 += 1;
    if (match.totalGoals >= 4) stats.over35 += 1;

    if (match.homeGoals > match.awayGoals) {
      stats.homeWins += 1;
    } else if (match.homeGoals === match.awayGoals) {
      stats.draws += 1;
    } else {
      stats.awayWins += 1;
    }

    stats.teams.add(match.homeTeamId);
    stats.teams.add(match.awayTeamId);
  });

  const result = new Map();

  map.forEach((stats, leagueId) => {
    const n = stats.matches || 1;

    result.set(leagueId, {
      ...stats,

      avgHomeGoals: stats.homeGoals / n,
      avgAwayGoals: stats.awayGoals / n,
      avgTotalGoals: stats.totalGoals / n,

      ggRate: stats.gg / n,

      over15Rate: stats.over15 / n,
      over25Rate: stats.over25 / n,
      over35Rate: stats.over35 / n,

      homeWinRate: stats.homeWins / n,
      drawRate: stats.draws / n,
      awayWinRate: stats.awayWins / n,

      teamCount: stats.teams.size,
    });
  });

  return result;
};

const globalLeagueBaseline = (leagueStats) => {
  let matches = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let gg = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  leagueStats.forEach((stats) => {
    matches += stats.matches;
    homeGoals += stats.homeGoals;
    awayGoals += stats.awayGoals;
    gg += stats.gg;
    over15 += stats.over15;
    over25 += stats.over25;
    over35 += stats.over35;
    homeWins += stats.homeWins;
    draws += stats.draws;
    awayWins += stats.awayWins;
  });

  if (!matches) {
    return {
      matches: 0,
      avgHomeGoals: 1.35,
      avgAwayGoals: 1.10,
      avgTotalGoals: 2.45,
      ggRate: 0.50,
      over15Rate: 0.75,
      over25Rate: 0.50,
      over35Rate: 0.28,
      homeWinRate: 0.44,
      drawRate: 0.27,
      awayWinRate: 0.29,
    };
  }

  return {
    matches,
    avgHomeGoals: homeGoals / matches,
    avgAwayGoals: awayGoals / matches,
    avgTotalGoals:
      (homeGoals + awayGoals) / matches,

    ggRate: gg / matches,
    over15Rate: over15 / matches,
    over25Rate: over25 / matches,
    over35Rate: over35 / matches,

    homeWinRate: homeWins / matches,
    drawRate: draws / matches,
    awayWinRate: awayWins / matches,
  };
};

/* =========================================================
   TEAM MATCH HISTORY
========================================================= */

const buildTeamHistory = (matches) => {
  const map = new Map();

  const ensure = (id) => {
    const key = String(id);

    if (!map.has(key)) {
      map.set(key, []);
    }

    return map.get(key);
  };

  matches.forEach((match) => {
    ensure(match.homeTeamId).push({
      ...match,
      teamId: match.homeTeamId,
      opponentId: match.awayTeamId,
      isHome: true,
      goalsFor: match.homeGoals,
      goalsAgainst: match.awayGoals,
      result: resultForTeam(
        match.homeTeamId,
        match.homeTeamId,
        match.awayTeamId,
        match.homeGoals,
        match.awayGoals
      ),
    });

    ensure(match.awayTeamId).push({
      ...match,
      teamId: match.awayTeamId,
      opponentId: match.homeTeamId,
      isHome: false,
      goalsFor: match.awayGoals,
      goalsAgainst: match.homeGoals,
      result: resultForTeam(
        match.awayTeamId,
        match.homeTeamId,
        match.awayTeamId,
        match.homeGoals,
        match.awayGoals
      ),
    });
  });

  map.forEach((rows) => {
    rows.sort((a, b) => a.dateValue - b.dateValue);
  });

  return map;
};

/* =========================================================
   TEAM PROFILE
========================================================= */

const calculateTeamProfile = (
  teamId,
  teamHistory,
  leagueBaseline
) => {
  const rows = teamHistory.get(String(teamId)) || [];

  const leagueHome =
    num(leagueBaseline?.avgHomeGoals, 1.35);

  const leagueAway =
    num(leagueBaseline?.avgAwayGoals, 1.10);

  const leagueTotal =
    num(leagueBaseline?.avgTotalGoals, 2.45);

  if (!rows.length) {
    return {
      teamId: String(teamId),

      matches: 0,

      overallGF: leagueTotal / 2,
      overallGA: leagueTotal / 2,

      homeGF: leagueHome,
      homeGA: leagueAway,

      awayGF: leagueAway,
      awayGA: leagueHome,

      recentGF: leagueTotal / 2,
      recentGA: leagueTotal / 2,

      formPoints: 0.5,

      wins: 0,
      draws: 0,
      losses: 0,

      recentWins: 0,
      recentDraws: 0,
      recentLosses: 0,

      last5: [],

      reliability: 0.15,

      homeMatches: 0,
      awayMatches: 0,

      cleanSheets: 0,
      failedToScore: 0,
    };
  }

  const calculateWeightedRates = (items) => {
    if (!items.length) {
      return null;
    }

    const newest = items[items.length - 1].dateValue;

    const gf = [];
    const ga = [];
    const points = [];

    let cleanSheets = 0;
    let failedToScore = 0;

    items.forEach((row) => {
      const ageDays =
        (newest - row.dateValue) /
        (1000 * 60 * 60 * 24);

      const weight = exponentialWeight(ageDays);

      gf.push({
        value: row.goalsFor,
        weight,
      });

      ga.push({
        value: row.goalsAgainst,
        weight,
      });

      points.push({
        value:
          row.result === "W"
            ? 1
            : row.result === "D"
            ? 0.5
            : 0,
        weight,
      });

      if (row.goalsAgainst === 0) cleanSheets += 1;
      if (row.goalsFor === 0) failedToScore += 1;
    });

    return {
      gf: weightedAverage(gf),
      ga: weightedAverage(ga),
      points: weightedAverage(points),
      cleanSheets,
      failedToScore,
    };
  };

  const overall = calculateWeightedRates(rows);

  const homeRows = rows.filter((x) => x.isHome);
  const awayRows = rows.filter((x) => !x.isHome);

  const home = calculateWeightedRates(homeRows);
  const away = calculateWeightedRates(awayRows);

  const recentRows = rows.slice(-10);
  const recent = calculateWeightedRates(recentRows);

  const last5 = rows
    .slice(-5)
    .reverse()
    .map((row) => ({
      result: row.result,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      date: row.date,
      opponentId: row.opponentId,
      isHome: row.isHome,
    }));

  const wins = rows.filter((x) => x.result === "W").length;
  const draws = rows.filter((x) => x.result === "D").length;
  const losses = rows.filter((x) => x.result === "L").length;

  const recentWins = recentRows.filter(
    (x) => x.result === "W"
  ).length;

  const recentDraws = recentRows.filter(
    (x) => x.result === "D"
  ).length;

  const recentLosses = recentRows.filter(
    (x) => x.result === "L"
  ).length;

  const overallGF = shrink(
    overall.gf,
    rows.length,
    leagueTotal / 2,
    8
  );

  const overallGA = shrink(
    overall.ga,
    rows.length,
    leagueTotal / 2,
    8
  );

  const homeGF = shrink(
    home?.gf ?? leagueHome,
    homeRows.length,
    leagueHome,
    5
  );

  const homeGA = shrink(
    home?.ga ?? leagueAway,
    homeRows.length,
    leagueAway,
    5
  );

  const awayGF = shrink(
    away?.gf ?? leagueAway,
    awayRows.length,
    leagueAway,
    5
  );

  const awayGA = shrink(
    away?.ga ?? leagueHome,
    awayRows.length,
    leagueHome,
    5
  );

  const recentGF = shrink(
    recent?.gf ?? overallGF,
    recentRows.length,
    overallGF,
    5
  );

  const recentGA = shrink(
    recent?.ga ?? overallGA,
    recentRows.length,
    overallGA,
    5
  );

  const formPoints = shrink(
    recent?.points ?? 0.5,
    recentRows.length,
    0.5,
    5
  );

  const reliability = clamp(
    0.25 +
      Math.min(rows.length, 20) / 20 * 0.50 +
      Math.min(homeRows.length, 8) / 8 * 0.10 +
      Math.min(awayRows.length, 8) / 8 * 0.10,
    0.15,
    1
  );

  return {
    teamId: String(teamId),

    matches: rows.length,

    overallGF,
    overallGA,

    homeGF,
    homeGA,

    awayGF,
    awayGA,

    recentGF,
    recentGA,

    formPoints,

    wins,
    draws,
    losses,

    recentWins,
    recentDraws,
    recentLosses,

    last5,

    reliability,

    homeMatches: homeRows.length,
    awayMatches: awayRows.length,

    cleanSheets: overall.cleanSheets,
    failedToScore: overall.failedToScore,
  };
};

/* =========================================================
   STANDINGS
========================================================= */

const buildStandingsMap = (rows) => {
  const map = new Map();

  (rows || []).forEach((row) => {
    if (
      row.team_id === null ||
      row.team_id === undefined
    ) {
      return;
    }

    const teamId = String(row.team_id);

    const leagueId =
      row.league_id !== null &&
      row.league_id !== undefined
        ? String(row.league_id)
        : null;

    const key = `${leagueId || "unknown"}:${teamId}`;

    const played = num(row.played);
    const points = num(row.points);
    const gf = num(row.goals_for);
    const ga = num(row.goals_against);

    const ppg =
      played > 0
        ? points / played
        : 0;

    const gdPerGame =
      played > 0
        ? (gf - ga) / played
        : 0;

    const position = num(row.position);

    map.set(key, {
      ...row,

      teamId,
      leagueId,

      played,
      points,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDifference: num(
        row.goal_difference,
        gf - ga
      ),

      ppg,
      gdPerGame,
      position,
    });
  });

  return map;
};

const findStandingForTeam = (
  standingsMap,
  teamId,
  leagueId
) => {
  if (!teamId) return null;

  if (leagueId) {
    const direct = standingsMap.get(
      `${leagueId}:${String(teamId)}`
    );

    if (direct) return direct;
  }

  let found = null;

  standingsMap.forEach((row) => {
    if (
      String(row.teamId) === String(teamId)
    ) {
      if (!found || row.played > found.played) {
        found = row;
      }
    }
  });

  return found;
};

const calculateTableStrength = (
  standing,
  leagueRows
) => {
  if (!standing || !leagueRows?.length) {
    return {
      multiplier: 1,
      reliability: 0,
      ppg: null,
      position: null,
    };
  }

  const ppgs = leagueRows
    .map((x) => num(x.points) / Math.max(1, num(x.played)))
    .filter((x) => Number.isFinite(x));

  const gdpgs = leagueRows
    .map(
      (x) =>
        num(
          x.goal_difference,
          num(x.goals_for) - num(x.goals_against)
        ) / Math.max(1, num(x.played))
    )
    .filter((x) => Number.isFinite(x));

  const avgPpg = average(ppgs) || 1.25;
  const avgGd = average(gdpgs);

  const ppgRatio = clamp(
    num(standing.ppg) / avgPpg,
    0.65,
    1.35
  );

  const gdRatio =
    avgGd !== 0
      ? clamp(
          1 + (num(standing.gdPerGame) - avgGd) * 0.12,
          0.85,
          1.15
        )
      : 1;

  const raw =
    0.68 * ppgRatio +
    0.32 * gdRatio;

  const multiplier = clamp(
    1 + (raw - 1) * 0.15,
    0.94,
    1.06
  );

  const reliability = clamp(
    num(standing.played) / 20,
    0,
    1
  );

  return {
    multiplier,
    reliability,
    ppg: standing.ppg,
    position: standing.position,
  };
};

/* =========================================================
   H2H
========================================================= */

const buildH2H = (
  matches,
  homeTeamId,
  awayTeamId
) => {
  const relevant = matches
    .filter(
      (match) =>
        (
          String(match.homeTeamId) ===
            String(homeTeamId) &&
          String(match.awayTeamId) ===
            String(awayTeamId)
        ) ||
        (
          String(match.homeTeamId) ===
            String(awayTeamId) &&
          String(match.awayTeamId) ===
            String(homeTeamId)
        )
    )
    .sort((a, b) => b.dateValue - a.dateValue)
    .slice(0, 8);

  if (!relevant.length) {
    return {
      matches: [],
      count: 0,
      homeTeamWins: 0,
      draws: 0,
      awayTeamWins: 0,
      homeTeamGoals: 0,
      awayTeamGoals: 0,
      ggRate: 0,
      usable: false,
      multiplierHome: 1,
      multiplierAway: 1,
    };
  }

  let homeTeamWins = 0;
  let draws = 0;
  let awayTeamWins = 0;
  let homeTeamGoals = 0;
  let awayTeamGoals = 0;
  let gg = 0;

  relevant.forEach((match) => {
    const homeIsCurrentHome =
      String(match.homeTeamId) ===
      String(homeTeamId);

    const currentHomeGoals = homeIsCurrentHome
      ? match.homeGoals
      : match.awayGoals;

    const currentAwayGoals = homeIsCurrentHome
      ? match.awayGoals
      : match.homeGoals;

    homeTeamGoals += currentHomeGoals;
    awayTeamGoals += currentAwayGoals;

    if (currentHomeGoals > currentAwayGoals) {
      homeTeamWins += 1;
    } else if (
      currentHomeGoals === currentAwayGoals
    ) {
      draws += 1;
    } else {
      awayTeamWins += 1;
    }

    if (
      match.homeGoals > 0 &&
      match.awayGoals > 0
    ) {
      gg += 1;
    }
  });

  const n = relevant.length;

  const homeRate = homeTeamWins / n;
  const awayRate = awayTeamWins / n;

  const multiplierHome =
    n >= 5
      ? clamp(1 + (homeRate - awayRate) * 0.05, 0.97, 1.03)
      : 1;

  const multiplierAway =
    n >= 5
      ? clamp(1 + (awayRate - homeRate) * 0.05, 0.97, 1.03)
      : 1;

  return {
    matches: relevant,
    count: n,

    homeTeamWins,
    draws,
    awayTeamWins,

    homeTeamGoals,
    awayTeamGoals,

    ggRate: gg / n,

    usable: n >= 4,

    multiplierHome,
    multiplierAway,
  };
};

/* =========================================================
   EXPECTED GOALS
========================================================= */

const calculateExpectedGoals = ({
  homeProfile,
  awayProfile,
  leagueBaseline,
  homeTable,
  awayTable,
  h2h,
}) => {
  const leagueHome =
    clamp(
      num(leagueBaseline?.avgHomeGoals, 1.35),
      0.75,
      2.5
    );

  const leagueAway =
    clamp(
      num(leagueBaseline?.avgAwayGoals, 1.10),
      0.60,
      2.2
    );

  /*
    Core attack/defence ratios.

    Home attack is measured against league home scoring.
    Home defence is measured against league away scoring.
    Away attack is measured against league away scoring.
    Away defence is measured against league home scoring.
  */

  const homeAttack =
    homeProfile.homeGF / Math.max(0.3, leagueHome);

  const homeDefense =
    homeProfile.homeGA / Math.max(0.3, leagueAway);

  const awayAttack =
    awayProfile.awayGF / Math.max(0.3, leagueAway);

  const awayDefense =
    awayProfile.awayGA / Math.max(0.3, leagueHome);

  const overallHomeAttack =
    homeProfile.overallGF /
    Math.max(
      0.3,
      leagueBaseline.avgTotalGoals / 2
    );

  const overallAwayAttack =
    awayProfile.overallGF /
    Math.max(
      0.3,
      leagueBaseline.avgTotalGoals / 2
    );

  const recentHomeAttack =
    homeProfile.recentGF /
    Math.max(
      0.3,
      leagueBaseline.avgTotalGoals / 2
    );

  const recentAwayAttack =
    awayProfile.recentGF /
    Math.max(
      0.3,
      leagueBaseline.avgTotalGoals / 2
    );

  /*
    Blend season/home-away/recent information.
  */

  const blendedHomeAttack =
    0.55 * homeAttack +
    0.25 * overallHomeAttack +
    0.20 * recentHomeAttack;

  const blendedAwayAttack =
    0.55 * awayAttack +
    0.25 * overallAwayAttack +
    0.20 * recentAwayAttack;

  const homeDefence =
    0.70 * homeDefense +
    0.30 *
      (
        homeProfile.overallGA /
        Math.max(
          0.3,
          leagueBaseline.avgTotalGoals / 2
        )
      );

  const awayDefence =
    0.70 * awayDefense +
    0.30 *
      (
        awayProfile.overallGA /
        Math.max(
          0.3,
          leagueBaseline.avgTotalGoals / 2
        )
      );

  let lambdaHome =
    leagueHome *
    blendedHomeAttack *
    awayDefence;

  let lambdaAway =
    leagueAway *
    blendedAwayAttack *
    homeDefence;

  /*
    Form adjustment.

    Form affects the model, but only moderately.
    We do not want five recent games to overwrite
    a whole season.
  */

  const homeFormAdjustment = clamp(
    1 +
      (homeProfile.formPoints - 0.5) * 0.10,
    0.95,
    1.05
  );

  const awayFormAdjustment = clamp(
    1 +
      (awayProfile.formPoints - 0.5) * 0.10,
    0.95,
    1.05
  );

  lambdaHome *= homeFormAdjustment;
  lambdaAway *= awayFormAdjustment;

  /*
    Standings strength.

    Very small influence deliberately.
  */

  const homeTableMultiplier =
    1 +
    (num(homeTable?.multiplier, 1) - 1) *
      num(homeTable?.reliability, 0);

  const awayTableMultiplier =
    1 +
    (num(awayTable?.multiplier, 1) - 1) *
      num(awayTable?.reliability, 0);

  lambdaHome *=
    homeTableMultiplier /
    Math.sqrt(awayTableMultiplier);

  lambdaAway *=
    awayTableMultiplier /
    Math.sqrt(homeTableMultiplier);

  /*
    H2H tiny adjustment.
  */

  if (h2h?.usable) {
    lambdaHome *= h2h.multiplierHome;
    lambdaAway *= h2h.multiplierAway;
  }

  /*
    Absolute sanity bounds.
  */

  lambdaHome = clamp(lambdaHome, 0.25, 3.80);
  lambdaAway = clamp(lambdaAway, 0.20, 3.50);

  return {
    lambdaHome,
    lambdaAway,

    components: {
      leagueHome,
      leagueAway,

      homeAttack: blendedHomeAttack,
      awayAttack: blendedAwayAttack,

      homeDefense: homeDefence,
      awayDefense: awayDefence,

      homeFormAdjustment,
      awayFormAdjustment,

      homeTableMultiplier,
      awayTableMultiplier,

      h2hHomeMultiplier:
        h2h?.multiplierHome || 1,

      h2hAwayMultiplier:
        h2h?.multiplierAway || 1,
    },
  };
};

/* =========================================================
   MODEL RELIABILITY
========================================================= */

const calculateReliability = ({
  homeProfile,
  awayProfile,
  leagueBaseline,
  homeTable,
  awayTable,
  h2h,
}) => {
  const homeHistory =
    clamp(homeProfile.matches / 20, 0, 1);

  const awayHistory =
    clamp(awayProfile.matches / 20, 0, 1);

  const homeSplit =
    clamp(homeProfile.homeMatches / 8, 0, 1);

  const awaySplit =
    clamp(awayProfile.awayMatches / 8, 0, 1);

  const leagueSample =
    clamp(
      num(leagueBaseline?.matches) / 100,
      0,
      1
    );

  const standingsReliability =
    (num(homeTable?.reliability) +
      num(awayTable?.reliability)) /
    2;

  const h2hReliability =
    h2h?.usable
      ? clamp(h2h.count / 8, 0, 1) * 0.08
      : 0;

  const value =
    0.24 * homeHistory +
    0.24 * awayHistory +
    0.12 * homeSplit +
    0.12 * awaySplit +
    0.15 * leagueSample +
    0.13 * standingsReliability +
    h2hReliability;

  return clamp(value, 0.10, 1);
};

/* =========================================================
   PROBABILITY SHRINKAGE
========================================================= */

const conservativeProbability = (
  probability,
  reliability
) => {
  /*
    Pull probabilities toward 50% when data quality
    is weaker.

    This is NOT fake "calibration".
    It is uncertainty shrinkage.
  */

  const p = clamp(probability, 0.01, 0.99);

  const r = clamp(
    0.45 + reliability * 0.55,
    0.45,
    1
  );

  return clamp(
    0.5 + (p - 0.5) * r,
    0.01,
    0.99
  );
};

/* =========================================================
   BEST PICK
========================================================= */

const buildMarketCandidates = (
  probabilities,
  match,
  reliability
) => {
  const markets = [
    {
      market: "home",
      probability: probabilities.home,
      odd: getOdd(match, "home"),
    },
    {
      market: "draw",
      probability: probabilities.draw,
      odd: getOdd(match, "draw"),
    },
    {
      market: "away",
      probability: probabilities.away,
      odd: getOdd(match, "away"),
    },
    {
      market: "gg",
      probability: probabilities.gg,
      odd: getOdd(match, "gg"),
    },
    {
      market: "ng",
      probability: probabilities.ng,
      odd: getOdd(match, "ng"),
    },
    {
      market: "over15",
      probability: probabilities.over15,
      odd: getOdd(match, "over15"),
    },
    {
      market: "over25",
      probability: probabilities.over25,
      odd: getOdd(match, "over25"),
    },
    {
      market: "over35",
      probability: probabilities.over35,
      odd: getOdd(match, "over35"),
    },
    {
      market: "under25",
      probability: probabilities.under25,
      odd: getOdd(match, "under25"),
    },
  ];

  const marketProbabilities =
    calculateMarketProbabilities(match);

  return markets
    .filter(
      (x) =>
        Number.isFinite(Number(x.probability)) &&
        x.probability > 0
    )
    .map((item) => {
      const p =
        conservativeProbability(
          item.probability,
          reliability
        );

      const marketP =
        marketProbabilities[item.market] ??
        (
          item.odd
            ? 1 / item.odd
            : null
        );

      const ev =
        item.odd
          ? p * item.odd - 1
          : null;

      const edge =
        marketP !== null
          ? p - marketP
          : null;

      return {
        ...item,

        rawProbability: item.probability,

        probability: p,

        marketProbability: marketP,

        edge,

        ev,

        reliability,
      };
    });
};

/* =========================================================
   PICK CLASSIFICATION
========================================================= */

const classifyPick = (pick) => {
  if (!pick) return "NO BET";

  const p = num(pick.probability);

  const ev =
    pick.ev === null ||
    pick.ev === undefined
      ? null
      : num(pick.ev);

  const edge =
    pick.edge === null ||
    pick.edge === undefined
      ? null
      : num(pick.edge);

  /*
    SAFE:
    high probability, reliable data.

    VALUE:
    positive EV/edge.

    NO BET:
    insufficient probability or no market edge.
  */

  if (
    p >= 0.68 &&
    num(pick.reliability) >= 0.55 &&
    (ev === null || ev >= -0.02)
  ) {
    return "SAFE";
  }

  if (
    p >= 0.55 &&
    (
      (ev !== null && ev >= 0.04) ||
      (edge !== null && edge >= 0.035)
    )
  ) {
    return "VALUE";
  }

  return "NO BET";
};

const calculatePickScore = (pick) => {
  if (!pick) return 0;

  const p = clamp(
    num(pick.probability),
    0,
    1
  );

  const reliability = clamp(
    num(pick.reliability),
    0,
    1
  );

  const ev =
    pick.ev === null ||
    pick.ev === undefined
      ? 0
      : clamp(num(pick.ev), -0.20, 0.50);

  const edge =
    pick.edge === null ||
    pick.edge === undefined
      ? 0
      : clamp(num(pick.edge), -0.20, 0.50);

  /*
    Probability is the primary component.
    EV/edge is secondary.
    Reliability prevents small samples from
    ranking too aggressively.
  */

  const score =
    p * 65 +
    reliability * 20 +
    Math.max(0, ev) * 30 +
    Math.max(0, edge) * 20;

  return score;
};

/* =========================================================
   PREDICTION ENGINE
========================================================= */

const predictMatch = ({
  match,
  historicalMatches,
  teamHistory,
  leagueStats,
  standingsMap,
  teamMetadata,
}) => {
  const homeTeamId =
    resolveTeamId(
      match,
      "home",
      teamMetadata.aliasMap,
      teamMetadata.map
    );

  const awayTeamId =
    resolveTeamId(
      match,
      "away",
      teamMetadata.aliasMap,
      teamMetadata.map
    );

  const homeName =
    getTeamNameFromObject(match, "home");

  const awayName =
    getTeamNameFromObject(match, "away");

  const leagueId = getLeagueId(match);

  const leagueBaseline =
    leagueStats.get(leagueId) ||
    globalLeagueBaseline(leagueStats);

  if (!homeTeamId || !awayTeamId) {
    return {
      id: match.id || `${homeName}-${awayName}`,
      homeName,
      awayName,

      homeTeamId,
      awayTeamId,

      leagueId,

      resolved: false,

      probabilities: null,

      markets: [],

      bestPick: null,

      reliability: 0,

      error:
        "Tim nije pouzdano mapiran na Sofa ID.",
    };
  }

  const homeProfile =
    calculateTeamProfile(
      homeTeamId,
      teamHistory,
      leagueBaseline
    );

  const awayProfile =
    calculateTeamProfile(
      awayTeamId,
      teamHistory,
      leagueBaseline
    );

  const leagueRows =
    Array.from(standingsMap.values()).filter(
      (row) =>
        String(row.leagueId) ===
        String(leagueId)
    );

  const homeStanding =
    findStandingForTeam(
      standingsMap,
      homeTeamId,
      leagueId
    );

  const awayStanding =
    findStandingForTeam(
      standingsMap,
      awayTeamId,
      leagueId
    );

  const homeTable =
    calculateTableStrength(
      homeStanding,
      leagueRows
    );

  const awayTable =
    calculateTableStrength(
      awayStanding,
      leagueRows
    );

  const h2h =
    buildH2H(
      historicalMatches,
      homeTeamId,
      awayTeamId
    );

  const expectedGoals =
    calculateExpectedGoals({
      homeProfile,
      awayProfile,
      leagueBaseline,
      homeTable,
      awayTable,
      h2h,
    });

  const matrix =
    buildDixonColesMatrix(
      expectedGoals.lambdaHome,
      expectedGoals.lambdaAway,
      8
    );

  const probabilities =
    probabilitiesFromMatrix(matrix);

  const reliability =
    calculateReliability({
      homeProfile,
      awayProfile,
      leagueBaseline,
      homeTable,
      awayTable,
      h2h,
    });

  const markets =
    buildMarketCandidates(
      probabilities,
      match,
      reliability
    )
      .map((pick) => ({
        ...pick,
        classification:
          classifyPick(pick),
        score:
          calculatePickScore(pick),
      }))
      .sort((a, b) => b.score - a.score);

  /*
    We don't simply take the highest probability.
    We rank according to probability + reliability + EV.
  */

  const bestPick =
    markets.length
      ? markets[0]
      : null;

  const safePicks =
    markets.filter(
      (x) =>
        x.classification === "SAFE"
    );

  const valuePicks =
    markets.filter(
      (x) =>
        x.classification === "VALUE"
    );

  const mostLikelyScores =
    getMostLikelyScores(
      matrix,
      5
    );

  /*
    Model agreement:
    how much do model probabilities agree
    with the broad market direction.
  */

  const marketProbabilities =
    calculateMarketProbabilities(match);

  let agreement = null;

  if (
    marketProbabilities.home !== undefined &&
    marketProbabilities.draw !== undefined &&
    marketProbabilities.away !== undefined
  ) {
    const modelVector = [
      probabilities.home,
      probabilities.draw,
      probabilities.away,
    ];

    const marketVector = [
      marketProbabilities.home,
      marketProbabilities.draw,
      marketProbabilities.away,
    ];

    agreement =
      1 -
      average(
        modelVector.map(
          (value, index) =>
            Math.abs(
              value -
                marketVector[index]
            )
        )
      );
  }

  const confidence =
    clamp(
      reliability * 0.70 +
        num(agreement, 0.65) * 0.30,
      0,
      1
    );

  const oddsAvailable =
    markets.filter(
      (x) => x.odd
    ).length;

  const flags = [];

  if (homeProfile.matches < 8) {
    flags.push(
      "Mali uzorak za domaćina"
    );
  }

  if (awayProfile.matches < 8) {
    flags.push(
      "Mali uzorak za gosta"
    );
  }

  if (homeProfile.homeMatches < 4) {
    flags.push(
      "Malo domaćih utakmica"
    );
  }

  if (awayProfile.awayMatches < 4) {
    flags.push(
      "Malo gostujućih utakmica"
    );
  }

  if (leagueBaseline.matches < 30) {
    flags.push(
      "Mali uzorak lige"
    );
  }

  if (!homeStanding || !awayStanding) {
    flags.push(
      "Tabela nije dostupna"
    );
  }

  if (!oddsAvailable) {
    flags.push(
      "Nema dostupnih kvota"
    );
  }

  return {
    id:
      match.id ||
      match.sofa_id ||
      `${homeTeamId}-${awayTeamId}-${getMatchDateValue(match)}`,

    rawMatch: match,

    homeName:
      teamMetadata.map.get(String(homeTeamId))
        ?.name ||
      homeName,

    awayName:
      teamMetadata.map.get(String(awayTeamId))
        ?.name ||
      awayName,

    displayHomeName: homeName,
    displayAwayName: awayName,

    homeTeamId,
    awayTeamId,

    leagueId,

    leagueName:
      match.league ||
      match.league_name ||
      "",

    date: getMatchDateValue(match),

    resolved: true,

    homeProfile,
    awayProfile,

    homeStanding,
    awayStanding,

    homeTable,
    awayTable,

    leagueBaseline,

    h2h,

    expectedGoals,

    lambdaHome:
      expectedGoals.lambdaHome,

    lambdaAway:
      expectedGoals.lambdaAway,

    matrix,

    probabilities,

    markets,

    bestPick,

    safePicks,
    valuePicks,

    mostLikelyScores,

    marketProbabilities,

    agreement,

    reliability,

    confidence,

    flags,

    oddsAvailable,
  };
};

/* =========================================================
   FUTURE MATCH NORMALIZATION
========================================================= */

const normalizeFutureMatch = (match) => {
  if (!match) return null;

  return {
    ...match,

    id:
      match.id ||
      match.sofa_id ||
      match.sofaId ||
      null,

    home:
      match.home ||
      match.home_team ||
      match.homeTeam ||
      match.raw_home ||
      "",

    away:
      match.away ||
      match.away_team ||
      match.awayTeam ||
      match.raw_away ||
      "",

    league:
      match.league ||
      match.league_name ||
      "",

    league_id:
      match.league_id ??
      match.leagueId ??
      null,

    match_date:
      match.match_date ||
      match.matchDate ||
      match.date ||
      null,

    match_time:
      match.match_time ||
      match.matchTime ||
      match.time ||
      "",
  };
};

/* =========================================================
   TICKET ENGINE
========================================================= */

const buildTicket = (
  predictions,
  mode,
  maxLegs
) => {
  let candidates = [];

  predictions.forEach((prediction) => {
    if (!prediction.resolved) return;

    const markets =
      prediction.markets || [];

    markets.forEach((pick) => {
      if (
        !pick ||
        !pick.probability ||
        !pick.odd
      ) {
        return;
      }

      if (
        pick.classification ===
        "NO BET"
      ) {
        return;
      }

      /*
        One market per match.
        We use candidate score later.
      */

      candidates.push({
        ...pick,
        predictionId:
          prediction.id,

        homeName:
          prediction.homeName,

        awayName:
          prediction.awayName,

        leagueName:
          prediction.leagueName,

        date:
          prediction.date,

        lambdaHome:
          prediction.lambdaHome,

        lambdaAway:
          prediction.lambdaAway,

        confidence:
          prediction.confidence,

        prediction,
      });
    });
  });

  if (mode === "safe") {
    candidates = candidates.filter(
      (x) =>
        x.probability >= 0.65 &&
        x.reliability >= 0.50 &&
        (
          x.ev === null ||
          x.ev >= -0.04
        )
    );
  }

  if (mode === "balanced") {
    candidates = candidates.filter(
      (x) =>
        x.probability >= 0.58 &&
        x.reliability >= 0.40
    );
  }

  if (mode === "value") {
    candidates = candidates.filter(
      (x) =>
        x.probability >= 0.53 &&
        x.reliability >= 0.35 &&
        x.ev !== null &&
        x.ev >= 0.03
    );
  }

  /*
    Different markets can be heavily correlated.
    If the same match appears more than once,
    only keep the best candidate.
  */

  const byMatch = new Map();

  candidates.forEach((candidate) => {
    const key =
      String(candidate.predictionId);

    const existing =
      byMatch.get(key);

    if (
      !existing ||
      candidate.score > existing.score
    ) {
      byMatch.set(key, candidate);
    }
  });

  candidates =
    Array.from(byMatch.values());

  candidates.sort((a, b) => {
    if (mode === "safe") {
      return (
        b.probability * 100 +
        b.reliability * 20 -
        a.probability * 100 -
        a.reliability * 20
      );
    }

    if (mode === "value") {
      return (
        num(b.ev) * 100 +
        b.probability * 30 +
        b.reliability * 10 -
        (
          num(a.ev) * 100 +
          a.probability * 30 +
          a.reliability * 10
        )
      );
    }

    return b.score - a.score;
  });

  const selected =
    candidates.slice(
      0,
      Math.min(maxLegs, candidates.length)
    );

  if (!selected.length) {
    return {
      mode,
      legs: [],
      totalOdds: null,
      estimatedProbability: null,
      estimatedEV: null,
      possibleWin: null,
    };
  }

  const totalOdds =
    selected.reduce(
      (product, pick) =>
        product * pick.odd,
      1
    );

  /*
    Product of probabilities assumes independence.
    This is only an estimate.
  */

  const estimatedProbability =
    selected.reduce(
      (product, pick) =>
        product * pick.probability,
      1
    );

  const estimatedEV =
    totalOdds *
      estimatedProbability -
    1;

  return {
    mode,
    legs: selected,

    totalOdds,

    estimatedProbability,

    estimatedEV,

    possibleWin:
      totalOdds,

    independenceWarning:
      selected.length > 1,
  };
};

/* =========================================================
   REASONS
========================================================= */

const buildReasons = (prediction) => {
  if (!prediction?.resolved) {
    return [
      "Nije moguće pouzdano mapirati oba tima.",
    ];
  }

  const reasons = [];

  const home =
    prediction.homeProfile;

  const away =
    prediction.awayProfile;

  const lambdaHome =
    prediction.lambdaHome;

  const lambdaAway =
    prediction.lambdaAway;

  if (
    lambdaHome >
    lambdaAway + 0.35
  ) {
    reasons.push(
      `Model očekuje više golova domaćina (${lambdaHome.toFixed(
        2
      )} vs ${lambdaAway.toFixed(2)}).`
    );
  }

  if (
    lambdaAway >
    lambdaHome + 0.35
  ) {
    reasons.push(
      `Model očekuje više golova gosta (${lambdaAway.toFixed(
        2
      )} vs ${lambdaHome.toFixed(2)}).`
    );
  }

  if (
    home.formPoints >
    away.formPoints + 0.12
  ) {
    reasons.push(
      "Domaćin ima bolju skoriju formu."
    );
  }

  if (
    away.formPoints >
    home.formPoints + 0.12
  ) {
    reasons.push(
      "Gost ima bolju skoriju formu."
    );
  }

  if (
    home.homeGF >
    away.awayGA
  ) {
    reasons.push(
      "Domaći napad ima povoljan matchup protiv gostujuće odbrane."
    );
  }

  if (
    away.awayGF >
    home.homeGA
  ) {
    reasons.push(
      "Gostujući napad ima povoljan matchup protiv domaće odbrane."
    );
  }

  if (
    prediction.probabilities.gg >
    0.58
  ) {
    reasons.push(
      "Poisson model daje povišenu vjerovatnoću da oba tima postignu gol."
    );
  }

  if (
    prediction.probabilities.over25 >
    0.60
  ) {
    reasons.push(
      "Model očekuje najmanje 3 gola sa relativno visokom vjerovatnoćom."
    );
  }

  if (
    prediction.homeStanding &&
    prediction.awayStanding
  ) {
    if (
      prediction.homeStanding.ppg >
      prediction.awayStanding.ppg +
        0.30
    ) {
      reasons.push(
        "Domaćin ima bolji PPG u tabeli."
      );
    }

    if (
      prediction.awayStanding.ppg >
      prediction.homeStanding.ppg +
        0.30
    ) {
      reasons.push(
        "Gost ima bolji PPG u tabeli."
      );
    }
  }

  if (
    prediction.h2h?.usable &&
    prediction.h2h.count >= 5
  ) {
    reasons.push(
      `U model je uključen H2H signal (${prediction.h2h.count} međusobnih).`
    );
  }

  if (!reasons.length) {
    reasons.push(
      "Model nema dovoljno jak signal za izdvajanje jednog dominantnog faktora."
    );
  }

  return reasons.slice(0, 6);
};

/* =========================================================
   UI COMPONENTS
========================================================= */

const Badge = ({ children, type = "" }) => (
  <span
    className={`s4-badge ${
      type ? `s4-badge-${type}` : ""
    }`}
  >
    {children}
  </span>
);

const ProbabilityCell = ({
  value,
  highlight,
}) => (
  <span
    className={
      highlight
        ? "s4-probability s4-probability-best"
        : "s4-probability"
    }
  >
    {pct0(value)}
  </span>
);

const FormDots = ({ form = [] }) => {
  return (
    <div className="s4-form-dots">
      {form.map((item, index) => {
        const letter =
          item.result || item;

        return (
          <span
            key={index}
            className={`s4-form-dot s4-form-${String(
              letter
            ).toLowerCase()}`}
            title={
              item.date
                ? `${formatDate(item.date)}`
                : ""
            }
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Screen4() {
  const {
    futureMatches = [],
  } = useContext(MatchesContext) || {};

  const [historicalMatches, setHistoricalMatches] =
    useState([]);

  const [aliases, setAliases] =
    useState([]);

  const [sofaTeams, setSofaTeams] =
    useState([]);

  const [standings, setStandings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("ticket");

  const [ticketMode, setTicketMode] =
    useState("safe");

  const [selectedPrediction, setSelectedPrediction] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [leagueFilter, setLeagueFilter] =
    useState("all");

  const [minProbability, setMinProbability] =
    useState(0.50);

  const [maxTicketLegs, setMaxTicketLegs] =
    useState(5);

  const [sortBy, setSortBy] =
    useState("score");

  const [showOnlyBettable, setShowOnlyBettable] =
    useState(false);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          historyRows,
          aliasRows,
          sofaTeamRows,
          standingsRows,
        ] = await Promise.all([
          fetchAllSupabase(
            supabase,
            "screen1_matches",
            "*",
            {
              pageSize: 1000,
              orderBy: "match_date",
              ascending: true,
            }
          ),

          fetchAllSupabase(
            supabase,
            "team_aliases",
            "*",
            {
              pageSize: 1000,
              orderBy: "id",
              ascending: true,
            }
          ),

          fetchAllSupabase(
            supabase,
            "sofa_teams",
            "*",
            {
              pageSize: 1000,
              orderBy: "id",
              ascending: true,
            }
          ),

          fetchAllSupabase(
            supabase,
            "sofa_standings",
            "*",
            {
              pageSize: 1000,
              orderBy: "id",
              ascending: true,
            }
          ),
        ]);

        if (cancelled) return;

        setHistoricalMatches(
          historyRows || []
        );

        setAliases(
          aliasRows || []
        );

        setSofaTeams(
          sofaTeamRows || []
        );

        setStandings(
          standingsRows || []
        );
      } catch (err) {
        console.error(
          "Screen4 load error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Greška pri učitavanju podataka."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     PREPARE DATA
  ======================================================= */

  const prepared = useMemo(() => {
    const normalized =
      deduplicateMatches(
        historicalMatches
      );

    const aliasMap =
      buildAliasMap(
        aliases,
        sofaTeams
      );

    const teamMap =
      buildTeamMetadata(
        aliases,
        sofaTeams
      );

    const teamHistory =
      buildTeamHistory(
        normalized
      );

    const leagueStats =
      buildLeagueStats(
        normalized
      );

    const globalBaseline =
      globalLeagueBaseline(
        leagueStats
      );

    const standingsMap =
      buildStandingsMap(
        standings
      );

    const enrichedTeamMetadata = {
      map: teamMap,
      aliasMap,
    };

    return {
      normalized,
      aliasMap,
      teamMap,
      teamHistory,
      leagueStats,
      globalBaseline,
      standingsMap,
      enrichedTeamMetadata,
    };
  }, [
    historicalMatches,
    aliases,
    sofaTeams,
    standings,
  ]);

  /* =======================================================
     PREDICTIONS
  ======================================================= */

  const predictions = useMemo(() => {
    if (
      !prepared ||
      !futureMatches?.length
    ) {
      return [];
    }

    return futureMatches
      .map(normalizeFutureMatch)
      .filter(
        (match) =>
          match.home &&
          match.away
      )
      .map((match) =>
        predictMatch({
          match,

          historicalMatches:
            prepared.normalized,

          teamHistory:
            prepared.teamHistory,

          leagueStats:
            prepared.leagueStats,

          standingsMap:
            prepared.standingsMap,

          teamMetadata:
            prepared.enrichedTeamMetadata,
        })
      );
  }, [
    futureMatches,
    prepared,
  ]);

  /* =======================================================
     LEAGUES
  ======================================================= */

  const leagues = useMemo(() => {
    const map = new Map();

    predictions.forEach((prediction) => {
      const key =
        prediction.leagueId ||
        prediction.leagueName ||
        "unknown";

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name:
            prediction.leagueName ||
            "Nepoznata liga",
        });
      }
    });

    return Array.from(
      map.values()
    ).sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "sr"
      )
    );
  }, [predictions]);

  /* =======================================================
     FILTERED PREDICTIONS
  ======================================================= */

  const filteredPredictions =
    useMemo(() => {
      let rows = [
        ...predictions,
      ];

      const q =
        normalizeText(search);

      if (q) {
        rows = rows.filter(
          (prediction) => {
            const text = normalizeText(
              [
                prediction.homeName,
                prediction.awayName,
                prediction.displayHomeName,
                prediction.displayAwayName,
                prediction.leagueName,
              ].join(" ")
            );

            return text.includes(q);
          }
        );
      }

      if (
        leagueFilter !== "all"
      ) {
        rows = rows.filter(
          (prediction) =>
            String(
              prediction.leagueId ||
                prediction.leagueName
            ) ===
            String(leagueFilter)
        );
      }

      rows = rows.filter(
        (prediction) => {
          if (
            !prediction.bestPick
          ) {
            return false;
          }

          return (
            prediction.bestPick
              .probability >=
            minProbability
          );
        }
      );

      if (showOnlyBettable) {
        rows = rows.filter(
          (prediction) =>
            prediction.bestPick &&
            prediction.bestPick
              .classification !==
              "NO BET"
        );
      }

      rows.sort((a, b) => {
        if (sortBy === "probability") {
          return (
            num(
              b.bestPick?.probability
            ) -
            num(
              a.bestPick?.probability
            )
          );
        }

        if (sortBy === "ev") {
          return (
            num(
              b.bestPick?.ev
            ) -
            num(
              a.bestPick?.ev
            )
          );
        }

        if (sortBy === "confidence") {
          return (
            num(b.confidence) -
            num(a.confidence)
          );
        }

        if (sortBy === "goals") {
          return (
            (
              b.lambdaHome +
              b.lambdaAway
            ) -
            (
              a.lambdaHome +
              a.lambdaAway
            )
          );
        }

        return (
          num(
            b.bestPick?.score
          ) -
          num(
            a.bestPick?.score
          )
        );
      });

      return rows;
    }, [
      predictions,
      search,
      leagueFilter,
      minProbability,
      showOnlyBettable,
      sortBy,
    ]);

  /* =======================================================
     TICKETS
  ======================================================= */

  const tickets = useMemo(() => {
    return {
      safe: buildTicket(
        predictions,
        "safe",
        Math.min(
          3,
          maxTicketLegs
        )
      ),

      balanced: buildTicket(
        predictions,
        "balanced",
        Math.min(
          4,
          maxTicketLegs
        )
      ),

      value: buildTicket(
        predictions,
        "value",
        maxTicketLegs
      ),
    };
  }, [
    predictions,
    maxTicketLegs,
  ]);

  const activeTicket =
    tickets[ticketMode];

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const total =
      predictions.length;

    const resolved =
      predictions.filter(
        (x) => x.resolved
      ).length;

    const safe =
      predictions.filter(
        (x) =>
          x.bestPick?.classification ===
          "SAFE"
      ).length;

    const value =
      predictions.filter(
        (x) =>
          x.bestPick?.classification ===
          "VALUE"
      ).length;

    const noBet =
      predictions.filter(
        (x) =>
          !x.bestPick ||
          x.bestPick.classification ===
            "NO BET"
      ).length;

    const avgReliability =
      average(
        predictions.map(
          (x) => x.reliability
        )
      );

    return {
      total,
      resolved,
      safe,
      value,
      noBet,
      avgReliability,
    };
  }, [predictions]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="screen4">
        <div className="s4-loading">
          <div className="s4-loading-spinner">
            ⏳
          </div>

          <h2>
            Učitavanje prediction modela...
          </h2>

          <p>
            Učitavam istoriju, timove,
            alias-e, tabelu i podatke
            potrebne za Poisson model.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="screen4">
        <div className="s4-error">
          <h2>
            Greška
          </h2>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="screen4">
      <style>{`
        .screen4 {
          width: 100%;
          min-height: 100%;
          padding: 18px;
          box-sizing: border-box;
          color: #111827;
        }

        .s4-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .s4-title h1 {
          margin: 0;
          font-size: 25px;
          font-weight: 800;
        }

        .s4-title p {
          margin: 6px 0 0;
          color: #374151;
          font-size: 13px;
        }

        .s4-model-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(61, 135, 255, 0.10);
          border: 1px solid rgba(61, 135, 255, 0.25);
          color: #83b6ff;
          font-size: 12px;
          font-weight: 700;
        }

        .s4-stat-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(100px, 1fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .s4-stat-card {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          border-radius: 12px;
          padding: 12px;
        }

        .s4-stat-label {
          color: #374151;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .s4-stat-value {
          margin-top: 5px;
          font-size: 20px;
          font-weight: 800;
        }

        .s4-tabs {
          display: flex;
          gap: 7px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .s4-tab {
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.025);
          color: #374151;
          border-radius: 9px;
          padding: 9px 13px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .s4-tab.active {
          background: rgba(255,255,255,.08);
          color: #111827;
        }

        .s4-controls {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 14px;
        }

        .s4-input,
        .s4-select {
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.09);
          color: #111827;
          border-radius: 8px;
          padding: 9px 11px;
          outline: none;
          font-size: 12px;
        }

        .s4-input {
          min-width: 230px;
        }

        .s4-select option {
          background: #171b22;
        }

        .s4-checkbox {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #374151;
          font-size: 12px;
          padding: 8px;
        }

        .s4-panel {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          border-radius: 13px;
          overflow: hidden;
        }

        .s4-panel-header {
          padding: 13px 15px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .s4-panel-title {
          font-size: 14px;
          font-weight: 800;
        }

        .s4-panel-subtitle {
          color: #4b5563;
          font-size: 11px;
          margin-top: 3px;
        }

        .s4-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .s4-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1120px;
        }

        .s4-table th {
          color: #4b5563;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .03em;
          font-weight: 700;
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          white-space: nowrap;
        }

        .s4-table td {
          padding: 10px;
          border-bottom: 1px solid rgba(255,255,255,.045);
          font-size: 12px;
          white-space: nowrap;
        }

        .s4-table tr:hover td {
          background: rgba(255,255,255,.025);
        }

        .s4-match {
          cursor: pointer;
        }

        .s4-match-teams {
          min-width: 185px;
        }

        .s4-home {
          font-weight: 700;
        }

        .s4-away {
          margin-top: 3px;
          color: #374151;
        }

        .s4-league {
          color: #4b5563;
          font-size: 10px;
          margin-top: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 190px;
        }

        .s4-probability {
          font-variant-numeric: tabular-nums;
          color: #111827;
        }

        .s4-probability-best {
          color: #111827;
          font-weight: 800;
        }

        .s4-xg {
          font-variant-numeric: tabular-nums;
        }

        .s4-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 45px;
          border-radius: 7px;
          padding: 4px 7px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .03em;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
        }

        .s4-badge-SAFE {
          color: #78d99d;
          background: rgba(62, 190, 112, .08);
          border-color: rgba(62,190,112,.20);
        }

        .s4-badge-VALUE {
          color: #e8bf68;
          background: rgba(220,170,50,.08);
          border-color: rgba(220,170,50,.20);
        }

        .s4-badge-NO-BET {
          color: #374151;
        }

        .s4-ev-positive {
          color: #78d99d;
          font-weight: 800;
        }

        .s4-ev-negative {
          color: #d98585;
        }

        .s4-clickable {
          cursor: pointer;
        }

        .s4-form-dots {
          display: flex;
          gap: 3px;
        }

        .s4-form-dot {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 800;
          background: rgba(255,255,255,.05);
          color: #374151;
        }

        .s4-form-w {
          background: rgba(62,190,112,.15);
          color: #78d99d;
        }

        .s4-form-d {
          background: rgba(220,170,50,.15);
          color: #e8bf68;
        }

        .s4-form-l {
          background: rgba(215,80,80,.15);
          color: #e18b8b;
        }

        .s4-ticket-tabs {
          display: flex;
          gap: 7px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .s4-ticket-button {
          border: 1px solid rgba(255,255,255,.08);
          background: transparent;
          color: #374151;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .s4-ticket-button.active {
          color: #111827;
          background: rgba(255,255,255,.07);
        }

        .s4-ticket-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .s4-ticket-summary-item {
          background: rgba(255,255,255,.025);
          border-radius: 9px;
          padding: 10px;
        }

        .s4-ticket-summary-label {
          font-size: 10px;
          color: #4b5563;
          text-transform: uppercase;
        }

        .s4-ticket-summary-value {
          font-size: 18px;
          font-weight: 800;
          margin-top: 4px;
        }

        .s4-ticket-empty {
          padding: 35px 20px;
          text-align: center;
          color: #4b5563;
        }

        .s4-ticket-legs {
          display: flex;
          flex-direction: column;
        }

        .s4-ticket-leg {
          display: grid;
          grid-template-columns: 38px minmax(180px, 1fr) 100px 80px 90px 90px;
          gap: 12px;
          align-items: center;
          padding: 13px 15px;
          border-bottom: 1px solid rgba(255,255,255,.045);
        }

        .s4-leg-number {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.07);
          color: #374151;
          font-size: 11px;
          font-weight: 800;
        }

        .s4-leg-match {
          font-weight: 700;
        }

        .s4-leg-market {
          margin-top: 3px;
          color: #374151;
          font-size: 10px;
        }

        .s4-detail {
          margin-top: 16px;
          border-top: 1px solid rgba(255,255,255,.07);
          padding-top: 16px;
        }

        .s4-detail-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .s4-detail-card {
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
          padding: 11px;
          background: rgba(255,255,255,.02);
        }

        .s4-detail-label {
          font-size: 10px;
          color: #4b5563;
          text-transform: uppercase;
        }

        .s4-detail-value {
          margin-top: 5px;
          font-size: 16px;
          font-weight: 800;
        }

        .s4-detail-section {
          margin-top: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
          padding: 12px;
        }

        .s4-detail-section h4 {
          margin: 0 0 9px;
          font-size: 12px;
        }

        .s4-reason {
          padding: 7px 0;
          border-bottom: 1px solid rgba(255,255,255,.045);
          color: #374151;
          font-size: 12px;
        }

        .s4-reason:last-child {
          border-bottom: 0;
        }

        .s4-score-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .s4-score-item {
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,.04);
          font-size: 11px;
        }

        .s4-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.70);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .s4-modal {
          width: min(900px, 100%);
          max-height: 90vh;
          overflow: auto;
          background: #171b22;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 14px;
          box-shadow: 0 25px 80px rgba(0,0,0,.50);
        }

        .s4-modal-header {
          position: sticky;
          top: 0;
          background: #171b22;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 15px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .s4-modal-title {
          font-weight: 800;
          font-size: 16px;
        }

        .s4-close {
          border: 0;
          background: rgba(255,255,255,.06);
          color: #111827;
          border-radius: 7px;
          width: 30px;
          height: 30px;
          cursor: pointer;
        }

        .s4-modal-body {
          padding: 15px;
        }

        .s4-market-table {
          width: 100%;
          border-collapse: collapse;
        }

        .s4-market-table th,
        .s4-market-table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,.05);
          font-size: 11px;
        }

        .s4-market-table th {
          color: #4b5563;
        }

        .s4-loading,
        .s4-error {
          padding: 60px 20px;
          text-align: center;
          color: #374151;
        }

        .s4-loading-spinner {
          font-size: 30px;
          margin-bottom: 10px;
        }

        .s4-empty {
          padding: 45px 20px;
          text-align: center;
          color: #4b5563;
        }

        .s4-note {
          color: #4b5563;
          font-size: 10px;
          line-height: 1.5;
        }

        .s4-positive {
          color: #78d99d;
        }

        .s4-negative {
          color: #dc8989;
        }

        @media (max-width: 1100px) {
          .s4-stat-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .s4-ticket-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .s4-detail-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .screen4 {
            padding: 10px;
          }

          .s4-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .s4-ticket-leg {
            grid-template-columns: 30px 1fr 70px;
          }

          .s4-ticket-leg > :nth-child(n+4) {
            display: none;
          }

          .s4-detail-grid {
            grid-template-columns: 1fr 1fr;
          }

          .s4-input {
            width: 100%;
            min-width: 0;
          }

          .s4-controls {
            align-items: stretch;
          }
        }
      `}</style>

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="s4-header">
        <div className="s4-title">
          <h1>
            ⚽ PREDICTION ENGINE
          </h1>

          <p>
            Poisson / Dixon-Coles model +
            forma + home/away + tabela +
            H2H + tržišne kvote
          </p>
        </div>

        <div className="s4-model-badge">
          🧠 STATISTICAL MODEL
        </div>
      </div>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="s4-stat-grid">
        <div className="s4-stat-card">
          <div className="s4-stat-label">
            Utakmice
          </div>

          <div className="s4-stat-value">
            {stats.total}
          </div>
        </div>

        <div className="s4-stat-card">
          <div className="s4-stat-label">
            Mapirano
          </div>

          <div className="s4-stat-value">
            {stats.resolved}
          </div>
        </div>

        <div className="s4-stat-card">
          <div className="s4-stat-label">
            SAFE
          </div>

          <div className="s4-stat-value s4-positive">
            {stats.safe}
          </div>
        </div>

        <div className="s4-stat-card">
          <div className="s4-stat-label">
            VALUE
          </div>

          <div className="s4-stat-value">
            {stats.value}
          </div>
        </div>

        <div className="s4-stat-card">
          <div className="s4-stat-label">
            NO BET
          </div>

          <div className="s4-stat-value">
            {stats.noBet}
          </div>
        </div>

        <div className="s4-stat-card">
          <div className="s4-stat-label">
            Pouzdanost
          </div>

          <div className="s4-stat-value">
            {pct0(
              stats.avgReliability
            )}
          </div>
        </div>
      </div>

      {/* ===================================================
          TABS
      =================================================== */}

      <div className="s4-tabs">
        <button
          className={`s4-tab ${
            activeTab === "ticket"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("ticket")
          }
        >
          🎟️ PREDLOG TIKETA
        </button>

        <button
          className={`s4-tab ${
            activeTab === "all"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveTab("all")
          }
        >
          📊 SVE PREDIKCIJE
        </button>
      </div>

      {/* ===================================================
          TICKET TAB
      =================================================== */}

      {activeTab === "ticket" && (
        <>
          <div className="s4-panel">
            <div className="s4-ticket-tabs">
              <button
                className={`s4-ticket-button ${
                  ticketMode === "safe"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setTicketMode("safe")
                }
              >
                🛡️ SAFE
              </button>

              <button
                className={`s4-ticket-button ${
                  ticketMode === "balanced"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setTicketMode(
                    "balanced"
                  )
                }
              >
                ⚖️ BALANCED
              </button>

              <button
                className={`s4-ticket-button ${
                  ticketMode === "value"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setTicketMode("value")
                }
              >
                💰 VALUE
              </button>
            </div>

            <div className="s4-ticket-summary">
              <div className="s4-ticket-summary-item">
                <div className="s4-ticket-summary-label">
                  Broj parova
                </div>

                <div className="s4-ticket-summary-value">
                  {
                    activeTicket.legs
                      .length
                  }
                </div>
              </div>

              <div className="s4-ticket-summary-item">
                <div className="s4-ticket-summary-label">
                  Ukupna kvota
                </div>

                <div className="s4-ticket-summary-value">
                  {activeTicket.totalOdds
                    ? formatNumber(
                        activeTicket.totalOdds,
                        2
                      )
                    : "-"}
                </div>
              </div>

              <div className="s4-ticket-summary-item">
                <div className="s4-ticket-summary-label">
                  Procjena prolaza
                </div>

                <div className="s4-ticket-summary-value">
                  {activeTicket.estimatedProbability
                    ? pct(
                        activeTicket.estimatedProbability,
                        1
                      )
                    : "-"}
                </div>
              </div>

              <div className="s4-ticket-summary-item">
                <div className="s4-ticket-summary-label">
                  Procijenjeni EV
                </div>

                <div
                  className={`s4-ticket-summary-value ${
                    activeTicket.estimatedEV >=
                    0
                      ? "s4-positive"
                      : "s4-negative"
                  }`}
                >
                  {activeTicket.estimatedEV !==
                  null
                    ? pct(
                        activeTicket.estimatedEV,
                        1
                      )
                    : "-"}
                </div>
              </div>
            </div>

            {!activeTicket.legs.length ? (
              <div className="s4-ticket-empty">
                <h3>
                  Nema dovoljno kvalitetnih
                  kandidata
                </h3>

                <p>
                  Model neće forsirati tiket
                  kada podaci ili kvote ne daju
                  dovoljno jak signal.
                </p>
              </div>
            ) : (
              <div className="s4-ticket-legs">
                {activeTicket.legs.map(
                  (pick, index) => (
                    <div
                      className="s4-ticket-leg"
                      key={`${pick.predictionId}-${pick.market}`}
                    >
                      <div className="s4-leg-number">
                        {index + 1}
                      </div>

                      <div>
                        <div className="s4-leg-match">
                          {pick.homeName}
                          {" - "}
                          {pick.awayName}
                        </div>

                        <div className="s4-leg-market">
                          {marketLabel(
                            pick.market
                          )}

                          {" • "}

                          {pick.classification}
                        </div>
                      </div>

                      <div>
                        <Badge
                          type={
                            pick.classification.replace(
                              " ",
                              "-"
                            )
                          }
                        >
                          {
                            pick.classification
                          }
                        </Badge>
                      </div>

                      <div>
                        <strong>
                          {pct0(
                            pick.probability
                          )}
                        </strong>
                      </div>

                      <div>
                        <strong>
                          {formatNumber(
                            pick.odd,
                            2
                          )}
                        </strong>
                      </div>

                      <div
                        className={
                          num(pick.ev) >=
                          0
                            ? "s4-ev-positive"
                            : "s4-ev-negative"
                        }
                      >
                        {pick.ev !==
                        null
                          ? pct(
                              pick.ev,
                              1
                            )
                          : "-"}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {activeTicket
              .independenceWarning && (
              <div
                style={{
                  padding: "12px 15px",
                }}
              >
                <div className="s4-note">
                  ⚠️ Procjena prolaza tiketa
                  pretpostavlja približnu
                  nezavisnost parova. Stvarni
                  rezultat može biti lošiji zbog
                  korelacije i varijanse.
                </div>
              </div>
            )}
          </div>

          <div
            className="s4-panel"
            style={{
              marginTop: 14,
            }}
          >
            <div className="s4-panel-header">
              <div>
                <div className="s4-panel-title">
                  Najbolji kandidati
                </div>

                <div className="s4-panel-subtitle">
                  Model rangira tipove po
                  vjerovatnoći, pouzdanosti i EV-u.
                </div>
              </div>
            </div>

            <div className="s4-table-wrap">
              <table className="s4-table">
                <thead>
                  <tr>
                    <th>
                      Meč
                    </th>
                    <th>
                      1
                    </th>
                    <th>
                      X
                    </th>
                    <th>
                      2
                    </th>
                    <th>
                      GG
                    </th>
                    <th>
                      O2.5
                    </th>
                    <th>
                      xG
                    </th>
                    <th>
                      BEST
                    </th>
                    <th>
                      P
                    </th>
                    <th>
                      KVOTA
                    </th>
                    <th>
                      EV
                    </th>
                    <th>
                      STATUS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPredictions
                    .slice(0, 20)
                    .map(
                      (prediction) => {
                        const p =
                          prediction.probabilities;

                        const best =
                          prediction.bestPick;

                        return (
                          <tr
                            key={
                              prediction.id
                            }
                            className="s4-match"
                            onClick={() =>
                              setSelectedPrediction(
                                prediction
                              )
                            }
                          >
                            <td>
                              <div className="s4-match-teams">
                                <div className="s4-home">
                                  {
                                    prediction.homeName
                                  }
                                </div>

                                <div className="s4-away">
                                  {
                                    prediction.awayName
                                  }
                                </div>

                                <div className="s4-league">
                                  {
                                    prediction.leagueName ||
                                      "Liga"
                                  }
                                </div>
                              </div>
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.home
                                }
                                highlight={
                                  best?.market ===
                                  "home"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.draw
                                }
                                highlight={
                                  best?.market ===
                                  "draw"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.away
                                }
                                highlight={
                                  best?.market ===
                                  "away"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.gg
                                }
                                highlight={
                                  best?.market ===
                                  "gg"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.over25
                                }
                                highlight={
                                  best?.market ===
                                  "over25"
                                }
                              />
                            </td>

                            <td>
                              <span className="s4-xg">
                                {formatNumber(
                                  prediction.lambdaHome,
                                  2
                                )}
                                {" - "}
                                {formatNumber(
                                  prediction.lambdaAway,
                                  2
                                )}
                              </span>
                            </td>

                            <td>
                              {best
                                ? marketLabel(
                                    best.market
                                  )
                                : "-"}
                            </td>

                            <td>
                              {best
                                ? pct0(
                                    best.probability
                                  )
                                : "-"}
                            </td>

                            <td>
                              {best?.odd
                                ? formatNumber(
                                    best.odd,
                                    2
                                  )
                                : "-"}
                            </td>

                            <td
                              className={
                                best &&
                                num(
                                  best.ev
                                ) >= 0
                                  ? "s4-ev-positive"
                                  : "s4-ev-negative"
                              }
                            >
                              {best?.ev !==
                              null &&
                              best?.ev !==
                                undefined
                                ? pct(
                                    best.ev,
                                    1
                                  )
                                : "-"}
                            </td>

                            <td>
                              <Badge
                                type={
                                  best?.classification
                                    ? best.classification.replace(
                                        " ",
                                        "-"
                                      )
                                    : "NO-BET"
                                }
                              >
                                {best?.classification ||
                                  "NO BET"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      }
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===================================================
          ALL PREDICTIONS
      =================================================== */}

      {activeTab === "all" && (
        <>
          <div className="s4-controls">
            <input
              className="s4-input"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Pretraži tim ili ligu..."
            />

            <select
              className="s4-select"
              value={leagueFilter}
              onChange={(e) =>
                setLeagueFilter(
                  e.target.value
                )
              }
            >
              <option value="all">
                Sve lige
              </option>

              {leagues.map(
                (league) => (
                  <option
                    key={league.id}
                    value={league.id}
                  >
                    {league.name}
                  </option>
                )
              )}
            </select>

            <select
              className="s4-select"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value
                )
              }
            >
              <option value="score">
                Sortiraj: score
              </option>

              <option value="probability">
                Sortiraj: vjerovatnoća
              </option>

              <option value="ev">
                Sortiraj: EV
              </option>

              <option value="confidence">
                Sortiraj: pouzdanost
              </option>

              <option value="goals">
                Sortiraj: xG
              </option>
            </select>

            <select
              className="s4-select"
              value={String(
                minProbability
              )}
              onChange={(e) =>
                setMinProbability(
                  Number(
                    e.target.value
                  )
                )
              }
            >
              <option value="0.45">
                P ≥ 45%
              </option>

              <option value="0.50">
                P ≥ 50%
              </option>

              <option value="0.55">
                P ≥ 55%
              </option>

              <option value="0.60">
                P ≥ 60%
              </option>

              <option value="0.65">
                P ≥ 65%
              </option>

              <option value="0.70">
                P ≥ 70%
              </option>
            </select>

            <select
              className="s4-select"
              value={String(
                maxTicketLegs
              )}
              onChange={(e) =>
                setMaxTicketLegs(
                  Number(
                    e.target.value
                  )
                )
              }
            >
              <option value="3">
                Max tiket: 3
              </option>

              <option value="4">
                Max tiket: 4
              </option>

              <option value="5">
                Max tiket: 5
              </option>
            </select>

            <label className="s4-checkbox">
              <input
                type="checkbox"
                checked={
                  showOnlyBettable
                }
                onChange={(e) =>
                  setShowOnlyBettable(
                    e.target.checked
                  )
                }
              />

              Samo BET
            </label>
          </div>

          <div className="s4-panel">
            <div className="s4-panel-header">
              <div>
                <div className="s4-panel-title">
                  Sve predikcije
                </div>

                <div className="s4-panel-subtitle">
                  Klikni utakmicu za kompletan
                  prikaz modela.
                </div>
              </div>

              <div className="s4-note">
                Prikazano{" "}
                {
                  filteredPredictions.length
                }{" "}
                /{" "}
                {
                  predictions.length
                }
              </div>
            </div>

            {!filteredPredictions.length ? (
              <div className="s4-empty">
                Nema utakmica koje
                odgovaraju filterima.
              </div>
            ) : (
              <div className="s4-table-wrap">
                <table className="s4-table">
                  <thead>
                    <tr>
                      <th>
                        Meč
                      </th>

                      <th>
                        Datum
                      </th>

                      <th>
                        1
                      </th>

                      <th>
                        X
                      </th>

                      <th>
                        2
                      </th>

                      <th>
                        GG
                      </th>

                      <th>
                        O1.5
                      </th>

                      <th>
                        O2.5
                      </th>

                      <th>
                        O3.5
                      </th>

                      <th>
                        U2.5
                      </th>

                      <th>
                        xG
                      </th>

                      <th>
                        BEST
                      </th>

                      <th>
                        P
                      </th>

                      <th>
                        KV
                      </th>

                      <th>
                        EV
                      </th>

                      <th>
                        DATA
                      </th>

                      <th>
                        STATUS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPredictions.map(
                      (prediction) => {
                        const p =
                          prediction.probabilities;

                        const best =
                          prediction.bestPick;

                        return (
                          <tr
                            key={
                              prediction.id
                            }
                            className="s4-match"
                            onClick={() =>
                              setSelectedPrediction(
                                prediction
                              )
                            }
                          >
                            <td>
                              <div className="s4-match-teams">
                                <div className="s4-home">
                                  {
                                    prediction.homeName
                                  }
                                </div>

                                <div className="s4-away">
                                  {
                                    prediction.awayName
                                  }
                                </div>

                                <div className="s4-league">
                                  {
                                    prediction.leagueName ||
                                      "Liga"
                                  }
                                </div>
                              </div>
                            </td>

                            <td>
                              {formatDate(
                                prediction.date
                              )}
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.home
                                }
                                highlight={
                                  best?.market ===
                                  "home"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.draw
                                }
                                highlight={
                                  best?.market ===
                                  "draw"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.away
                                }
                                highlight={
                                  best?.market ===
                                  "away"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.gg
                                }
                                highlight={
                                  best?.market ===
                                  "gg"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.over15
                                }
                                highlight={
                                  best?.market ===
                                  "over15"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.over25
                                }
                                highlight={
                                  best?.market ===
                                  "over25"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.over35
                                }
                                highlight={
                                  best?.market ===
                                  "over35"
                                }
                              />
                            </td>

                            <td>
                              <ProbabilityCell
                                value={
                                  p?.under25
                                }
                                highlight={
                                  best?.market ===
                                  "under25"
                                }
                              />
                            </td>

                            <td>
                              {formatNumber(
                                prediction.lambdaHome,
                                2
                              )}
                              {" - "}
                              {formatNumber(
                                prediction.lambdaAway,
                                2
                              )}
                            </td>

                            <td>
                              {best
                                ? marketLabel(
                                    best.market
                                  )
                                : "-"}
                            </td>

                            <td>
                              {best
                                ? pct0(
                                    best.probability
                                  )
                                : "-"}
                            </td>

                            <td>
                              {best?.odd
                                ? formatNumber(
                                    best.odd,
                                    2
                                  )
                                : "-"}
                            </td>

                            <td
                              className={
                                best &&
                                num(
                                  best.ev
                                ) >= 0
                                  ? "s4-ev-positive"
                                  : "s4-ev-negative"
                              }
                            >
                              {best?.ev !==
                              null &&
                              best?.ev !==
                                undefined
                                ? pct(
                                    best.ev,
                                    1
                                  )
                                : "-"}
                            </td>

                            <td>
                              {pct0(
                                prediction.reliability
                              )}
                            </td>

                            <td>
                              <Badge
                                type={
                                  best?.classification
                                    ? best.classification.replace(
                                        " ",
                                        "-"
                                      )
                                    : "NO-BET"
                                }
                              >
                                {best?.classification ||
                                  "NO BET"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================================================
          DETAIL MODAL
      =================================================== */}

      {selectedPrediction && (
        <div
          className="s4-modal-backdrop"
          onClick={() =>
            setSelectedPrediction(
              null
            )
          }
        >
          <div
            className="s4-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="s4-modal-header">
              <div>
                <div className="s4-modal-title">
                  {
                    selectedPrediction.homeName
                  }
                  {" - "}
                  {
                    selectedPrediction.awayName
                  }
                </div>

                <div className="s4-panel-subtitle">
                  {
                    selectedPrediction.leagueName ||
                      "Liga"
                  }
                  {" • "}
                  {formatDate(
                    selectedPrediction.date
                  )}
                </div>
              </div>

              <button
                className="s4-close"
                onClick={() =>
                  setSelectedPrediction(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="s4-modal-body">
              {!selectedPrediction.resolved ? (
                <div className="s4-error">
                  {
                    selectedPrediction.error
                  }
                </div>
              ) : (
                <>
                  {/* BEST */}
                  <div
                    className="s4-panel"
                    style={{
                      marginBottom: 14,
                    }}
                  >
                    <div className="s4-panel-header">
                      <div>
                        <div className="s4-panel-title">
                          Najbolji tip
                        </div>

                        <div className="s4-panel-subtitle">
                          Rangirano prema
                          vjerovatnoći,
                          pouzdanosti i EV-u.
                        </div>
                      </div>

                      {selectedPrediction
                        .bestPick && (
                        <Badge
                          type={selectedPrediction.bestPick.classification.replace(
                            " ",
                            "-"
                          )}
                        >
                          {
                            selectedPrediction
                              .bestPick
                              .classification
                          }
                        </Badge>
                      )}
                    </div>

                    <div
                      style={{
                        padding: 15,
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div className="s4-detail-label">
                          TIP
                        </div>

                        <div className="s4-detail-value">
                          {selectedPrediction
                            .bestPick
                            ? marketLabel(
                                selectedPrediction
                                  .bestPick
                                  .market
                              )
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="s4-detail-label">
                          MODEL P
                        </div>

                        <div className="s4-detail-value">
                          {selectedPrediction
                            .bestPick
                            ? pct(
                                selectedPrediction
                                  .bestPick
                                  .probability
                              )
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="s4-detail-label">
                          KVOTA
                        </div>

                        <div className="s4-detail-value">
                          {selectedPrediction
                            .bestPick?.odd
                            ? formatNumber(
                                selectedPrediction
                                  .bestPick
                                  .odd,
                                2
                              )
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="s4-detail-label">
                          EV
                        </div>

                        <div
                          className={`s4-detail-value ${
                            num(
                              selectedPrediction
                                .bestPick
                                ?.ev
                            ) >= 0
                              ? "s4-positive"
                              : "s4-negative"
                          }`}
                        >
                          {selectedPrediction
                            .bestPick
                            ?.ev !== null &&
                          selectedPrediction
                            .bestPick
                            ?.ev !==
                            undefined
                            ? pct(
                                selectedPrediction
                                  .bestPick
                                  .ev
                              )
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <div className="s4-detail-label">
                          DATA
                        </div>

                        <div className="s4-detail-value">
                          {pct(
                            selectedPrediction
                              .reliability
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* XG */}
                  <div className="s4-detail-grid">
                    <div className="s4-detail-card">
                      <div className="s4-detail-label">
                        Home xG
                      </div>

                      <div className="s4-detail-value">
                        {formatNumber(
                          selectedPrediction
                            .lambdaHome,
                          2
                        )}
                      </div>
                    </div>

                    <div className="s4-detail-card">
                      <div className="s4-detail-label">
                        Away xG
                      </div>

                      <div className="s4-detail-value">
                        {formatNumber(
                          selectedPrediction
                            .lambdaAway,
                          2
                        )}
                      </div>
                    </div>

                    <div className="s4-detail-card">
                      <div className="s4-detail-label">
                        Ukupno xG
                      </div>

                      <div className="s4-detail-value">
                        {formatNumber(
                          selectedPrediction
                            .lambdaHome +
                            selectedPrediction
                              .lambdaAway,
                          2
                        )}
                      </div>
                    </div>

                    <div className="s4-detail-card">
                      <div className="s4-detail-label">
                        Model agreement
                      </div>

                      <div className="s4-detail-value">
                        {selectedPrediction
                          .agreement !==
                        null
                          ? pct(
                              selectedPrediction
                                .agreement
                            )
                          : "-"}
                      </div>
                    </div>
                  </div>

                  {/* PROBABILITIES */}
                  <div className="s4-detail-section">
                    <h4>
                      Model vjerovatnoće
                    </h4>

                    <table className="s4-market-table">
                      <thead>
                        <tr>
                          <th>
                            Market
                          </th>

                          <th>
                            Model
                          </th>

                          <th>
                            Market
                          </th>

                          <th>
                            Edge
                          </th>

                          <th>
                            EV
                          </th>

                          <th>
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedPrediction.markets.map(
                          (pick) => (
                            <tr
                              key={
                                pick.market
                              }
                            >
                              <td>
                                <strong>
                                  {marketLabel(
                                    pick.market
                                  )}
                                </strong>
                              </td>

                              <td>
                                {pct(
                                  pick.probability
                                )}
                              </td>

                              <td>
                                {pick.marketProbability !==
                                null &&
                                pick.marketProbability !==
                                  undefined
                                  ? pct(
                                      pick.marketProbability
                                    )
                                  : "-"}
                              </td>

                              <td
                                className={
                                  num(
                                    pick.edge
                                  ) >= 0
                                    ? "s4-positive"
                                    : "s4-negative"
                                }
                              >
                                {pick.edge !==
                                  null &&
                                pick.edge !==
                                  undefined
                                  ? pct(
                                      pick.edge
                                    )
                                  : "-"}
                              </td>

                              <td
                                className={
                                  num(
                                    pick.ev
                                  ) >= 0
                                    ? "s4-positive"
                                    : "s4-negative"
                                }
                              >
                                {pick.ev !==
                                  null &&
                                pick.ev !==
                                  undefined
                                  ? pct(
                                      pick.ev
                                    )
                                  : "-"}
                              </td>

                              <td>
                                <Badge
                                  type={pick.classification.replace(
                                    " ",
                                    "-"
                                  )}
                                >
                                  {
                                    pick.classification
                                  }
                                </Badge>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* FORM */}
                  <div className="s4-detail-section">
                    <h4>
                      Forma
                    </h4>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 15,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            marginBottom: 6,
                            fontSize: 11,
                            color:
                              "#4b5563",
                          }}
                        >
                          {
                            selectedPrediction
                              .homeName
                          }
                        </div>

                        <FormDots
                          form={
                            selectedPrediction
                              .homeProfile
                              .last5
                          }
                        />

                        <div
                          className="s4-note"
                          style={{
                            marginTop: 7,
                          }}
                        >
                          {
                            selectedPrediction
                              .homeProfile
                              .wins
                          }
                          W /{" "}
                          {
                            selectedPrediction
                              .homeProfile
                              .draws
                          }
                          D /{" "}
                          {
                            selectedPrediction
                              .homeProfile
                              .losses
                          }
                          L
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            marginBottom: 6,
                            fontSize: 11,
                            color:
                              "#4b5563",
                          }}
                        >
                          {
                            selectedPrediction
                              .awayName
                          }
                        </div>

                        <FormDots
                          form={
                            selectedPrediction
                              .awayProfile
                              .last5
                          }
                        />

                        <div
                          className="s4-note"
                          style={{
                            marginTop: 7,
                          }}
                        >
                          {
                            selectedPrediction
                              .awayProfile
                              .wins
                          }
                          W /{" "}
                          {
                            selectedPrediction
                              .awayProfile
                              .draws
                          }
                          D /{" "}
                          {
                            selectedPrediction
                              .awayProfile
                              .losses
                          }
                          L
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TABLE */}
                  <div className="s4-detail-section">
                    <h4>
                      Tabela
                    </h4>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div className="s4-detail-card">
                        <div className="s4-detail-label">
                          {
                            selectedPrediction
                              .homeName
                          }
                        </div>

                        <div className="s4-detail-value">
                          {selectedPrediction
                            .homeStanding
                            ? `#${selectedPrediction.homeStanding.position}`
                            : "-"}
                        </div>

                        <div className="s4-note">
                          PPG:{" "}
                          {selectedPrediction
                            .homeStanding
                            ? formatNumber(
                                selectedPrediction
                                  .homeStanding
                                  .ppg,
                                2
                              )
                            : "-"}
                        </div>
                      </div>

                      <div className="s4-detail-card">
                        <div className="s4-detail-label">
                          {
                            selectedPrediction
                              .awayName
                          }
                        </div>

                        <div className="s4-detail-value">
                          {selectedPrediction
                            .awayStanding
                            ? `#${selectedPrediction.awayStanding.position}`
                            : "-"}
                        </div>

                        <div className="s4-note">
                          PPG:{" "}
                          {selectedPrediction
                            .awayStanding
                            ? formatNumber(
                                selectedPrediction
                                  .awayStanding
                                  .ppg,
                                2
                              )
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* H2H */}
                  <div className="s4-detail-section">
                    <h4>
                      H2H
                    </h4>

                    <div className="s4-note">
                      {selectedPrediction
                        .h2h?.count
                        ? `${selectedPrediction.h2h.count} posljednjih međusobnih utakmica`
                        : "Nema dovoljno H2H podataka."}
                    </div>

                    {selectedPrediction
                      .h2h?.count > 0 && (
                      <div
                        style={{
                          marginTop: 9,
                        }}
                      >
                        <div className="s4-score-list">
                          {selectedPrediction.h2h.matches.map(
                            (match) => (
                              <div
                                className="s4-score-item"
                                key={`${match.id}-${match.dateValue}`}
                              >
                                {formatDate(
                                  match.date
                                )}
                                {" • "}
                                {match.homeName}
                                {" "}
                                {match.homeGoals}
                                :
                                {match.awayGoals}
                                {" "}
                                {match.awayName}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MOST LIKELY SCORES */}
                  <div className="s4-detail-section">
                    <h4>
                      Najvjerovatniji rezultati
                    </h4>

                    <div className="s4-score-list">
                      {selectedPrediction.mostLikelyScores.map(
                        (score) => (
                          <div
                            className="s4-score-item"
                            key={`${score.home}-${score.away}`}
                          >
                            <strong>
                              {score.home}
                              :
                              {score.away}
                            </strong>
                            {" "}
                            {pct(
                              score.probability
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* REASONS */}
                  <div className="s4-detail-section">
                    <h4>
                      Zašto model bira ovo
                    </h4>

                    {buildReasons(
                      selectedPrediction
                    ).map(
                      (reason, index) => (
                        <div
                          className="s4-reason"
                          key={index}
                        >
                          • {reason}
                        </div>
                      )
                    )}
                  </div>

                  {/* FLAGS */}
                  {selectedPrediction.flags
                    ?.length > 0 && (
                    <div className="s4-detail-section">
                      <h4>
                        Upozorenja
                      </h4>

                      {selectedPrediction.flags.map(
                        (flag, index) => (
                          <div
                            className="s4-reason"
                            key={index}
                          >
                            ⚠️ {flag}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    className="s4-note"
                    style={{
                      marginTop: 14,
                    }}
                  >
                    Napomena: model daje
                    statističke procjene, ne
                    garantuje ishod. `EV` je
                    očekivana vrijednost prema
                    model vjerovatnoći i dostupnoj
                    kvoti. Za pravi test kvaliteta
                    modela potrebno je raditi
                    out-of-sample backtest i pratiti
                    Brier score, log loss i ROI.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
