import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import "./Screen4.css";

/* =========================================================
   SCREEN 4 — PREDICTION CENTER

   SOURCE:
   future_matches
      ↓
   team_aliases
      ↓
   team_id
      ↓
   league_aliases
      ↓
   league_id
      ↓
   existing statistical tables

   PREDICTION:
   - Poisson
   - Dixon-Coles low-score adjustment
   - team statistics
   - recent form
   - home/away form
   - goal profile
   - recency
   - opponent strength
   - H2H
   - league context
   - bookmaker odds
   - market implied probability
   - value

   TICKETS:
   - 5
   - 10
   - 15
   - 20
   - 25
   - 30
   - SAFE
   - BALANCED
   - VALUE
========================================================= */


/* =========================================================
   HELPERS
========================================================= */

const n = (value, fallback = 0) => {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
};

const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, n(value)));

const pct = (value, digits = 1) => {
  const x = n(value);

  if (!Number.isFinite(x)) return "-";

  return `${(x * 100).toFixed(digits)}%`;
};

const formatOdd = (value) => {
  const x = Number(value);

  if (!Number.isFinite(x) || x <= 1) return "-";

  return x.toFixed(2);
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

const safeDate = (value) => {
  if (!value) return null;

  const d = new Date(value);

  if (!Number.isNaN(d.getTime())) {
    return d;
  }

  const text = String(value).trim();

  const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (m) {
    const parsed = new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    );

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
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

const formatTime = (value) => {
  if (!value) return "";

  return String(value).slice(0, 5);
};

const factorial = (x) => {
  let result = 1;

  for (let i = 2; i <= x; i += 1) {
    result *= i;
  }

  return result;
};

const poisson = (goals, lambda) => {
  const l = Math.max(0.01, Math.min(8, n(lambda, 1)));

  return (
    Math.exp(-l) *
    Math.pow(l, goals) /
    factorial(goals)
  );
};


/* =========================================================
   ODDS
========================================================= */

const getOdd = (match, market) => {
  if (!match) return null;

  const sources = {
    home: [
      "odd1",
      "odds1",
      "odd_1",
      "home_odds",
      "homeOdd",
      "kvota1",
      "m1",
      "1",
    ],

    draw: [
      "oddX",
      "oddsX",
      "odd_x",
      "draw_odds",
      "drawOdd",
      "kvotaX",
      "mx",
      "X",
    ],

    away: [
      "odd2",
      "odds2",
      "odd_2",
      "away_odds",
      "awayOdd",
      "kvota2",
      "m2",
      "2",
    ],

    gg: [
      "oddGG",
      "oddsGG",
      "gg_odds",
      "ggOdd",
      "kvotaGG",
      "gg",
    ],

    ng: [
      "oddNG",
      "oddsNG",
      "ng_odds",
      "ngOdd",
      "kvotaNG",
      "ng",
    ],

    over15: [
      "odd15",
      "oddOver15",
      "over15_odds",
      "over_15_odds",
      "kvotaOver15",
      "over15",
    ],

    over25: [
      "odd25",
      "oddOver25",
      "over25_odds",
      "over_25_odds",
      "kvotaOver25",
      "over25",
    ],

    over35: [
      "odd35",
      "oddOver35",
      "over35_odds",
      "over_35_odds",
      "kvotaOver35",
      "over35",
    ],
  };

  const keys = sources[market] || [];

  for (const key of keys) {
    if (
      match[key] !== undefined &&
      match[key] !== null &&
      match[key] !== ""
    ) {
      const value = Number(match[key]);

      if (Number.isFinite(value) && value > 1) {
        return value;
      }
    }
  }

  return null;
};

const impliedProbability = (odd) => {
  const x = Number(odd);

  if (!Number.isFinite(x) || x <= 1) {
    return null;
  }

  return 1 / x;
};

const devig = (odds) => {
  const valid = odds.map(Number);

  if (
    valid.length === 0 ||
    valid.some((x) => !Number.isFinite(x) || x <= 1)
  ) {
    return null;
  }

  const raw = valid.map((x) => 1 / x);

  const total = raw.reduce(
    (sum, value) => sum + value,
    0
  );

  if (!total) return null;

  return raw.map((value) => value / total);
};


/* =========================================================
   DIXON COLES
========================================================= */

const dixonColesTau = (
  homeGoals,
  awayGoals,
  lambdaHome,
  lambdaAway
) => {
  const rho = -0.08;

  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }

  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }

  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }

  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }

  return 1;
};

const buildMatrix = (
  lambdaHome,
  lambdaAway,
  maxGoals = 8
) => {
  const matrix = [];
  let total = 0;

  for (let h = 0; h <= maxGoals; h += 1) {
    const row = [];

    for (let a = 0; a <= maxGoals; a += 1) {
      const base =
        poisson(h, lambdaHome) *
        poisson(a, lambdaAway);

      const tau = Math.max(
        0.01,
        dixonColesTau(
          h,
          a,
          lambdaHome,
          lambdaAway
        )
      );

      const probability = base * tau;

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

const matrixProbabilities = (matrix) => {
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

      if (h > 0 && a > 0) {
        gg += p;
      }

      if (h + a >= 2) {
        over15 += p;
      }

      if (h + a >= 3) {
        over25 += p;
      }

      if (h + a >= 4) {
        over35 += p;
      }
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


/* =========================================================
   SUPABASE FETCH
========================================================= */

const fetchAll = async (table, columns = "*") => {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
};


/* =========================================================
   TEAM ALIAS RESOLUTION
========================================================= */

const buildTeamAliasMap = (aliases) => {
  const map = new Map();

  for (const row of aliases || []) {
    const alias = normalizeText(row.alias);

    if (!alias) continue;

    const id = row.team_id;

    if (id === null || id === undefined) {
      continue;
    }

    const key = alias;

    if (!map.has(key)) {
      map.set(key, []);
    }

    const list = map.get(key);

    if (!list.some((x) => String(x.teamId) === String(id))) {
      list.push({
        teamId: String(id),
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
  }

  return map;
};

const buildLeagueAliasMap = (aliases) => {
  const map = new Map();

  for (const row of aliases || []) {
    if (
      row.league_id === null ||
      row.league_id === undefined
    ) {
      continue;
    }

    const alias = normalizeText(row.alias);

    if (!alias) continue;

    const leagueId = String(row.league_id);

    if (!map.has(alias)) {
      map.set(alias, []);
    }

    const list = map.get(alias);

    if (
      !list.some(
        (x) => x.leagueId === leagueId
      )
    ) {
      list.push({
        leagueId,
        type: row.type || null,
        countryId:
          row.country_id !== null &&
          row.country_id !== undefined
            ? String(row.country_id)
            : null,
      });
    }
  }

  return map;
};

const resolveTeam = (
  name,
  leagueId,
  aliasMap
) => {
  const key = normalizeText(name);

  if (!key) return null;

  const candidates = aliasMap.get(key) || [];

  if (!candidates.length) {
    return null;
  }

  if (leagueId) {
    const sameLeague = candidates.find(
      (candidate) =>
        candidate.leagueId &&
        String(candidate.leagueId) ===
          String(leagueId)
    );

    if (sameLeague) {
      return sameLeague;
    }
  }

  return candidates[0];
};

const resolveLeague = (
  leagueName,
  aliasMap
) => {
  const key = normalizeText(leagueName);

  if (!key) return null;

  const candidates = aliasMap.get(key) || [];

  if (!candidates.length) {
    return null;
  }

  const league = candidates.find(
    (x) => x.type === "league"
  );

  return league || candidates[0];
};


/* =========================================================
   STAT MAPS
========================================================= */

const makeMap = (
  rows,
  keyFn
) => {
  const map = new Map();

  for (const row of rows || []) {
    map.set(keyFn(row), row);
  }

  return map;
};

const teamKey = (
  teamId,
  leagueId
) =>
  `${String(teamId)}:${String(leagueId)}`;


/* =========================================================
   FEATURE ENGINE
========================================================= */

const getTeamStats = (
  teamId,
  leagueId,
  maps
) => {
  const key = teamKey(teamId, leagueId);

  return {
    basic:
      maps.teamStats.get(key) || null,

    form:
      maps.formStats.get(key) || null,

    homeAway:
      maps.homeAway.get(key) || null,

    goals:
      maps.goalStats.get(key) || null,

    recency:
      maps.recency.get(key) || null,

    strength:
      maps.strength.get(key) || null,

    primary:
      maps.primary.get(String(teamId)) || null,
  };
};


/* =========================================================
   ATTACK / DEFENCE ESTIMATION
========================================================= */

const estimateTeamAttack = (
  stats,
  side
) => {
  const basic = stats.basic || {};
  const form = stats.form || {};
  const ha = stats.homeAway || {};
  const goals = stats.goals || {};
  const recency = stats.recency || {};

  const home = side === "home";

  const basicGF = n(
    home
      ? basic.home_ppg !== undefined
        ? basic.home_goals_for /
          Math.max(1, n(basic.home_matches))
        : 0
      : basic.away_matches
        ? basic.away_goals_for /
          Math.max(1, n(basic.away_matches))
        : 0
  );

  const formGF = n(
    form.last5_gf,
    0
  ) / Math.max(1, n(form.last5_matches));

  const recencyGF = n(
    home
      ? recency.home_weighted_gf
      : recency.away_weighted_gf,
    0
  );

  const goalScored2 =
    n(
      home
        ? goals.home_scored_2_plus_pct
        : goals.away_scored_2_plus_pct
    );

  let estimate =
    basicGF * 0.35 +
    formGF * 0.25 +
    recencyGF * 0.25 +
    goalScored2 * 1.0 * 0.15;

  if (!Number.isFinite(estimate)) {
    estimate = 1;
  }

  return clamp(
    estimate,
    0.2,
    3.5
  );
};

const estimateTeamDefence = (
  stats,
  side
) => {
  const basic = stats.basic || {};
  const form = stats.form || {};
  const recency = stats.recency || {};

  const home = side === "home";

  const basicGA =
    n(
      home
        ? basic.home_goals_against
        : basic.away_goals_against
    ) /
    Math.max(
      1,
      n(
        home
          ? basic.home_matches
          : basic.away_matches
      )
    );

  const formGA =
    n(form.last5_ga) /
    Math.max(1, n(form.last5_matches));

  const recencyGA = n(
    home
      ? recency.home_weighted_ga
      : recency.away_weighted_ga
  );

  const estimate =
    basicGA * 0.4 +
    formGA * 0.3 +
    recencyGA * 0.3;

  return clamp(
    estimate || 1.2,
    0.2,
    3.5
  );
};


/* =========================================================
   EXPECTED GOALS
========================================================= */

const calculateExpectedGoals = (
  homeStats,
  awayStats,
  leagueStats
) => {
  const leagueHomeGoals =
    n(leagueStats?.avg_home_goals, 1.4);

  const leagueAwayGoals =
    n(leagueStats?.avg_away_goals, 1.1);

  const homeAttack =
    estimateTeamAttack(
      homeStats,
      "home"
    );

  const awayAttack =
    estimateTeamAttack(
      awayStats,
      "away"
    );

  const homeDefence =
    estimateTeamDefence(
      homeStats,
      "home"
    );

  const awayDefence =
    estimateTeamDefence(
      awayStats,
      "away"
    );

  const homeLambda =
    leagueHomeGoals *
    (
      0.45 +
      0.30 *
        (homeAttack /
          Math.max(0.5, leagueHomeGoals)) +
      0.25 *
        (awayDefence /
          Math.max(0.5, leagueAwayGoals))
    );

  const awayLambda =
    leagueAwayGoals *
    (
      0.45 +
      0.30 *
        (awayAttack /
          Math.max(0.5, leagueAwayGoals)) +
      0.25 *
        (homeDefence /
          Math.max(0.5, leagueHomeGoals))
    );

  return {
    home: clamp(
      homeLambda,
      0.25,
      4
    ),

    away: clamp(
      awayLambda,
      0.20,
      4
    ),
  };
};


/* =========================================================
   STATISTICAL ADJUSTMENTS
========================================================= */

const applyStatisticalAdjustments = (
  probabilities,
  homeStats,
  awayStats
) => {
  let home = probabilities.home;
  let draw = probabilities.draw;
  let away = probabilities.away;

  const homeBasic =
    homeStats.basic || {};

  const awayBasic =
    awayStats.basic || {};

  const homeForm =
    homeStats.form || {};

  const awayForm =
    awayStats.form || {};

  const homePPG =
    n(homeBasic.ppg);

  const awayPPG =
    n(awayBasic.ppg);

  const homeFormPPG =
    n(homeForm.last5_ppg);

  const awayFormPPG =
    n(awayForm.last5_ppg);

  const homeSignal =
    (homePPG - awayPPG) * 0.035 +
    (homeFormPPG - awayFormPPG) * 0.025;

  home += homeSignal;
  away -= homeSignal;

  const homeStrength =
    n(homeStats.strength?.strength_index);

  const awayStrength =
    n(awayStats.strength?.strength_index);

  const strengthSignal =
    (homeStrength - awayStrength) *
    0.04;

  home += strengthSignal;
  away -= strengthSignal;

  const total =
    home + draw + away;

  if (!total) {
    return probabilities;
  }

  return {
    ...probabilities,
    home: clamp(home / total),
    draw: clamp(draw / total),
    away: clamp(away / total),
  };
};


/* =========================================================
   VALUE
========================================================= */

const calculateValue = (
  probability,
  odd
) => {
  const p = n(probability);
  const o = Number(odd);

  if (
    !Number.isFinite(p) ||
    !Number.isFinite(o) ||
    o <= 1
  ) {
    return null;
  }

  return p * o - 1;
};

const valueScore = (
  probability,
  odd
) => {
  const value = calculateValue(
    probability,
    odd
  );

  if (value === null) {
    return 0;
  }

  return value * 100;
};


/* =========================================================
   PREDICTION
========================================================= */

const makePrediction = (
  match,
  homeStats,
  awayStats,
  leagueStats
) => {
  const expected =
    calculateExpectedGoals(
      homeStats,
      awayStats,
      leagueStats
    );

  const matrix =
    buildMatrix(
      expected.home,
      expected.away
    );

  const raw =
    matrixProbabilities(matrix);

  const adjusted =
    applyStatisticalAdjustments(
      raw,
      homeStats,
      awayStats
    );

  const odds = {
    home: getOdd(match, "home"),
    draw: getOdd(match, "draw"),
    away: getOdd(match, "away"),
    gg: getOdd(match, "gg"),
    ng: getOdd(match, "ng"),
    over15: getOdd(match, "over15"),
    over25: getOdd(match, "over25"),
    over35: getOdd(match, "over35"),
  };

  const markets = [
    {
      market: "1",
      key: "home",
      probability: adjusted.home,
      odd: odds.home,
    },

    {
      market: "X",
      key: "draw",
      probability: adjusted.draw,
      odd: odds.draw,
    },

    {
      market: "2",
      key: "away",
      probability: adjusted.away,
      odd: odds.away,
    },

    {
      market: "GG",
      key: "gg",
      probability: adjusted.gg,
      odd: odds.gg,
    },

    {
      market: "NG",
      key: "ng",
      probability: adjusted.ng,
      odd: odds.ng,
    },

    {
      market: "O1.5",
      key: "over15",
      probability: adjusted.over15,
      odd: odds.over15,
    },

    {
      market: "O2.5",
      key: "over25",
      probability: adjusted.over25,
      odd: odds.over25,
    },

    {
      market: "O3.5",
      key: "over35",
      probability: adjusted.over35,
      odd: odds.over35,
    },
  ];

  const enrichedMarkets =
    markets.map((item) => ({
      ...item,

      implied:
        impliedProbability(
          item.odd
        ),

      value:
        calculateValue(
          item.probability,
          item.odd
        ),

      valueScore:
        valueScore(
          item.probability,
          item.odd
        ),
    }));

  const strongest =
    [...enrichedMarkets]
      .sort(
        (a, b) =>
          b.probability -
          a.probability
      )[0];

  const bestValue =
    [...enrichedMarkets]
      .filter(
        (x) =>
          x.odd &&
          x.value !== null
      )
      .sort(
        (a, b) =>
          b.valueScore -
          a.valueScore
      )[0] || null;

  const confidence =
    Math.round(
      clamp(
        (
          strongest.probability *
            0.65 +
          (
            bestValue
              ? Math.max(
                  0,
                  bestValue.value
                )
              : 0
          ) *
            0.35
        ),
        0,
        0.95
      ) * 100
    );

  return {
    expectedHome:
      expected.home,

    expectedAway:
      expected.away,

    probabilities:
      adjusted,

    matrix,

    odds,

    markets:
      enrichedMarkets,

    strongest,

    bestValue,

    confidence,
  };
};


/* =========================================================
   TICKET RANKING
========================================================= */

const marketRiskPenalty = (
  market
) => {
  if (
    market === "1" ||
    market === "2"
  ) {
    return 0;
  }

  if (market === "X") {
    return 12;
  }

  if (
    market === "O1.5"
  ) {
    return 2;
  }

  if (
    market === "O2.5"
  ) {
    return 5;
  }

  if (
    market === "O3.5"
  ) {
    return 10;
  }

  if (
    market === "GG"
  ) {
    return 5;
  }

  if (
    market === "NG"
  ) {
    return 8;
  }

  return 10;
};

const chooseBestMarket = (
  prediction,
  mode
) => {
  const markets =
    prediction.markets
      .filter(
        (x) =>
          x.probability >= 0.50
      );

  if (!markets.length) {
    return prediction.strongest;
  }

  let sorted;

  if (mode === "SAFE") {
    sorted =
      [...markets].sort(
        (a, b) =>
          (
            b.probability -
            marketRiskPenalty(b.market) /
              100
          ) -
          (
            a.probability -
            marketRiskPenalty(a.market) /
              100
          )
      );
  } else if (mode === "VALUE") {
    sorted =
      [...markets]
        .filter(
          (x) =>
            x.value !== null
        )
        .sort(
          (a, b) =>
            b.valueScore -
            a.valueScore
        );
  } else {
    sorted =
      [...markets].sort(
        (a, b) =>
          (
            b.probability *
              0.65 +
            Math.max(
              0,
              n(b.value)
            ) *
              0.35
          ) -
          (
            a.probability *
              0.65 +
            Math.max(
              0,
              n(a.value)
            ) *
              0.35
          )
      );
  }

  return (
    sorted[0] ||
    prediction.strongest
  );
};

const buildTicket = (
  predictions,
  count,
  mode
) => {
  const candidates =
    predictions
      .filter(
        (p) =>
          p.status === "READY"
      )
      .map((p) => ({
        prediction: p,
        market: chooseBestMarket(
          p.prediction,
          mode
        ),
      }))
      .filter(
        (x) =>
          x.market &&
          x.market.probability >=
            0.50
      );

  let sorted;

  if (mode === "VALUE") {
    sorted =
      candidates.sort(
        (a, b) =>
          n(b.market.valueScore) -
          n(a.market.valueScore)
      );
  } else if (mode === "SAFE") {
    sorted =
      candidates.sort(
        (a, b) =>
          b.market.probability -
          a.market.probability
      );
  } else {
    sorted =
      candidates.sort(
        (a, b) => {
          const scoreA =
            a.market.probability *
              0.70 +
            Math.max(
              0,
              n(a.market.value)
            ) *
              0.30;

          const scoreB =
            b.market.probability *
              0.70 +
            Math.max(
              0,
              n(b.market.value)
            ) *
              0.30;

          return scoreB - scoreA;
        }
      );
  }

  const selected = [];

  const usedMatches =
    new Set();

  for (const candidate of sorted) {
    const id =
      String(candidate.prediction.id);

    if (usedMatches.has(id)) {
      continue;
    }

    usedMatches.add(id);
    selected.push(candidate);

    if (selected.length >= count) {
      break;
    }
  }

  const totalOdds =
    selected.reduce(
      (product, item) => {
        const odd =
          Number(item.market.odd);

        if (
          !Number.isFinite(odd) ||
          odd <= 1
        ) {
          return product;
        }

        return product * odd;
      },
      1
    );

  const combinedProbability =
    selected.reduce(
      (product, item) =>
        product *
        item.market.probability,
      1
    );

  return {
    mode,
    count: selected.length,
    selections: selected,
    totalOdds,
    combinedProbability,
  };
};


/* =========================================================
   COMPONENT
========================================================= */

export default function Screen4() {
  const [matches, setMatches] =
    useState([]);

  const [teamAliases, setTeamAliases] =
    useState([]);

  const [leagueAliases, setLeagueAliases] =
    useState([]);

  const [stats, setStats] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("PREDIKCIJE");

  const [ticketMode, setTicketMode] =
    useState("SAFE");

  const [ticketSize, setTicketSize] =
    useState(5);

  const [search, setSearch] =
    useState("");

  const [selectedMatch, setSelectedMatch] =
    useState(null);


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
          future,
          aliases,
          leagues,
          teamStats,
          formStats,
          homeAway,
          goalStats,
          recency,
          strength,
          h2h,
          leagueStats,
          primary,
        ] = await Promise.all([
          fetchAll("future_matches"),
          fetchAll("team_aliases"),
          fetchAll("league_aliases"),
          fetchAll("team_league_statistics"),
          fetchAll("team_form_statistics"),
          fetchAll("team_home_away_form"),
          fetchAll("team_goal_statistics"),
          fetchAll("team_recency_statistics"),
          fetchAll("team_opponent_strength"),
          fetchAll("team_h2h_statistics"),
          fetchAll("league_statistics"),
          fetchAll("team_primary_leagues"),
        ]);

        if (cancelled) return;

        setMatches(future || []);
        setTeamAliases(aliases || []);
        setLeagueAliases(leagues || []);

        setStats({
          teamStats,
          formStats,
          homeAway,
          goalStats,
          recency,
          strength,
          h2h,
          leagueStats,
          primary,
        });
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
     MAPS
  ======================================================= */

  const maps = useMemo(() => {
    if (!stats) return null;

    return {
      teamStats: makeMap(
        stats.teamStats,
        (row) =>
          teamKey(
            row.team_id,
            row.league_id
          )
      ),

      formStats: makeMap(
        stats.formStats,
        (row) =>
          teamKey(
            row.team_id,
            row.league_id
          )
      ),

      homeAway: makeMap(
        stats.homeAway,
        (row) =>
          teamKey(
            row.team_id,
            row.league_id
          )
      ),

      goalStats: makeMap(
        stats.goalStats,
        (row) =>
          teamKey(
            row.team_id,
            row.league_id
          )
      ),

      recency: makeMap(
        stats.recency,
        (row) =>
          teamKey(
            row.team_id,
            row.league_id
          )
      ),

      strength: makeMap(
        stats.strength,
        (row) =>
          teamKey(
            row.team_id,
            row.league_id
          )
      ),

      primary: makeMap(
        stats.primary,
        (row) =>
          String(row.team_id)
      ),

      leagueStats: makeMap(
        stats.leagueStats,
        (row) =>
          String(row.league_id)
      ),

      h2h: stats.h2h || [],
    };
  }, [stats]);


  /* =======================================================
     ALIAS MAPS
  ======================================================= */

  const aliasMaps = useMemo(
    () => ({
      teams:
        buildTeamAliasMap(
          teamAliases
        ),

      leagues:
        buildLeagueAliasMap(
          leagueAliases
        ),
    }),
    [
      teamAliases,
      leagueAliases,
    ]
  );


  /* =======================================================
     NORMALIZE FUTURE MATCHES
  ======================================================= */

  const normalizedMatches =
    useMemo(() => {
      if (!maps) return [];

      return matches.map(
        (match, index) => {
          const leagueName =
            match.liga ||
            match.league ||
            match.league_name ||
            "";

          const homeName =
            match.home ||
            match.home_team ||
            match.homeTeam ||
            "";

          const awayName =
            match.away ||
            match.away_team ||
            match.awayTeam ||
            "";

          let league =
            null;

          if (
            match.league_id !==
              undefined &&
            match.league_id !== null
          ) {
            league = {
              leagueId:
                String(
                  match.league_id
                ),
            };
          } else {
            league =
              resolveLeague(
                leagueName,
                aliasMaps.leagues
              );
          }

          const leagueId =
            league?.leagueId ||
            null;

          const home =
            resolveTeam(
              homeName,
              leagueId,
              aliasMaps.teams
            );

          const away =
            resolveTeam(
              awayName,
              leagueId,
              aliasMaps.teams
            );

          const homeId =
            match.home_team_id ||
            match.homeTeamId ||
            home?.teamId ||
            null;

          const awayId =
            match.away_team_id ||
            match.awayTeamId ||
            away?.teamId ||
            null;

          const finalLeagueId =
            leagueId ||
            home?.leagueId ||
            away?.leagueId ||
            null;

          const homeStats =
            homeId &&
            finalLeagueId &&
            maps
              ? getTeamStats(
                  homeId,
                  finalLeagueId,
                  maps
                )
              : null;

          const awayStats =
            awayId &&
            finalLeagueId &&
            maps
              ? getTeamStats(
                  awayId,
                  finalLeagueId,
                  maps
                )
              : null;

          const leagueStats =
            finalLeagueId
              ? maps.leagueStats.get(
                  String(
                    finalLeagueId
                  )
                )
              : null;

          let prediction = null;

          if (
            homeStats?.basic &&
            awayStats?.basic
          ) {
            prediction =
              makePrediction(
                match,
                homeStats,
                awayStats,
                leagueStats
              );
          }

          return {
            id:
              match.id ??
              `future-${index}`,

            original: match,

            date:
              match.datum ||
              match.date ||
              match.match_date ||
              null,

            time:
              match.vreme ||
              match.time ||
              match.match_time ||
              "",

            leagueName,

            leagueId:
              finalLeagueId,

            homeName,

            awayName,

            homeId:
              homeId
                ? String(homeId)
                : null,

            awayId:
              awayId
                ? String(awayId)
                : null,

            homeStats,
            awayStats,
            leagueStats,

            prediction,

            status:
              homeId &&
              awayId &&
              finalLeagueId &&
              prediction
                ? "READY"
                : "MISSING_DATA",
          };
        }
      );
    }, [
      matches,
      maps,
      aliasMaps,
    ]);


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredMatches =
    useMemo(() => {
      const query =
        normalizeText(search);

      if (!query) {
        return normalizedMatches;
      }

      return normalizedMatches.filter(
        (match) =>
          normalizeText(
            match.homeName
          ).includes(query) ||
          normalizeText(
            match.awayName
          ).includes(query) ||
          normalizeText(
            match.leagueName
          ).includes(query)
      );
    }, [
      normalizedMatches,
      search,
    ]);


  /* =======================================================
     TICKETS
  ======================================================= */

  const ticket =
    useMemo(() => {
      return buildTicket(
        normalizedMatches,
        ticketSize,
        ticketMode
      );
    }, [
      normalizedMatches,
      ticketSize,
      ticketMode,
    ]);


  /* =======================================================
     SUMMARY
  ======================================================= */

  const readyCount =
    normalizedMatches.filter(
      (x) =>
        x.status === "READY"
    ).length;

  const missingCount =
    normalizedMatches.filter(
      (x) =>
        x.status !== "READY"
    ).length;

  const valueCount =
    normalizedMatches.filter(
      (x) =>
        x.prediction?.bestValue
          ?.value > 0
    ).length;

  const strongest =
    normalizedMatches
      .filter(
        (x) =>
          x.prediction
      )
      .sort(
        (a, b) =>
          b.prediction.confidence -
          a.prediction.confidence
      )
      .slice(0, 10);


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="screen4">
        <div className="screen4-loading">
          Učitavanje Prediction Centera...
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
        <div className="screen4-error">
          <h2>Greška</h2>
          <p>{error}</p>

          <button
            onClick={() =>
              window.location.reload()
            }
          >
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="screen4">

      <header className="screen4-header">
        <div>
          <div className="screen4-kicker">
            STATISTICAL ENGINE
          </div>

          <h1>
            Prediction Center
          </h1>

          <p>
            Predikcija budućih utakmica
            na osnovu statistika iz
            Supabase baze.
          </p>
        </div>

        <div className="screen4-header-status">
          <span className="status-dot" />
          DATABASE CONNECTED
        </div>
      </header>


      {/* =====================================================
         SUMMARY CARDS
      ===================================================== */}

      <section className="screen4-summary">

        <div className="prediction-card">
          <span>
            FUTURE MEČEVI
          </span>
          <strong>
            {normalizedMatches.length}
          </strong>
        </div>

        <div className="prediction-card">
          <span>
            SPREMNI
          </span>
          <strong>
            {readyCount}
          </strong>
        </div>

        <div className="prediction-card">
          <span>
            BEZ PODATAKA
          </span>
          <strong>
            {missingCount}
          </strong>
        </div>

        <div className="prediction-card">
          <span>
            VALUE
          </span>
          <strong>
            {valueCount}
          </strong>
        </div>

      </section>


      {/* =====================================================
         TABS
      ===================================================== */}

      <nav className="screen4-tabs">

        <button
          className={
            activeTab ===
            "PREDIKCIJE"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "PREDIKCIJE"
            )
          }
        >
          PREDIKCIJE
        </button>

        <button
          className={
            activeTab ===
            "TIKETI"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "TIKETI"
            )
          }
        >
          TIKETI
        </button>

        <button
          className={
            activeTab ===
            "NAJBOLJI"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "NAJBOLJI"
            )
          }
        >
          NAJBOLJI TIPOVI
        </button>

      </nav>


      {/* =====================================================
         PREDICTIONS
      ===================================================== */}

      {activeTab ===
        "PREDIKCIJE" && (
        <section>

          <div className="screen4-toolbar">

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Pretraži tim ili ligu..."
            />

            <span>
              {filteredMatches.length} mečeva
            </span>

          </div>


          <div className="prediction-list">

            {filteredMatches.map(
              (match) => {

                const p =
                  match.prediction;

                return (
                  <article
                    key={String(
                      match.id
                    )}
                    className="prediction-match"
                    onClick={() =>
                      setSelectedMatch(
                        match
                      )
                    }
                  >

                    <div className="match-meta">
                      <span>
                        {formatDate(
                          match.date
                        )}
                      </span>

                      <span>
                        {formatTime(
                          match.time
                        )}
                      </span>

                      <span>
                        {match.leagueName ||
                          "Liga"}
                      </span>
                    </div>


                    <div className="match-main">

                      <div className="teams">
                        <strong>
                          {match.homeName}
                        </strong>

                        <span>vs</span>

                        <strong>
                          {match.awayName}
                        </strong>
                      </div>


                      {p ? (
                        <>

                          <div className="main-probabilities">

                            <div>
                              <span>1</span>
                              <strong>
                                {pct(
                                  p.probabilities.home
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>X</span>
                              <strong>
                                {pct(
                                  p.probabilities.draw
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>2</span>
                              <strong>
                                {pct(
                                  p.probabilities.away
                                )}
                              </strong>
                            </div>

                          </div>


                          <div className="secondary-markets">

                            <span>
                              GG{" "}
                              {pct(
                                p.probabilities.gg
                              )}
                            </span>

                            <span>
                              O2.5{" "}
                              {pct(
                                p.probabilities.over25
                              )}
                            </span>

                            <span>
                              O1.5{" "}
                              {pct(
                                p.probabilities.over15
                              )}
                            </span>

                          </div>


                          <div className="prediction-pick">

                            <span>
                              PREDLOG
                            </span>

                            <strong>
                              {
                                p.strongest
                                  ?.market
                              }
                            </strong>

                            <em>
                              {p.confidence}/100
                            </em>

                          </div>

                        </>
                      ) : (
                        <div className="missing-data">
                          NEMA DOVOLJNO PODATAKA
                        </div>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>

        </section>
      )}


      {/* =====================================================
         TICKETS
      ===================================================== */}

      {activeTab ===
        "TIKETI" && (
        <section className="tickets-section">

          <div className="ticket-heading">
            <div>
              <div className="screen4-kicker">
                AUTOMATIC SELECTION
              </div>

              <h2>
                Predlog tiketa
              </h2>

              <p>
                Sistem bira najbolje
                dostupne predloge iz
                budućih utakmica.
              </p>
            </div>
          </div>


          <div className="ticket-size-tabs">

            {[5, 10, 15, 20, 25, 30].map(
              (size) => (
                <button
                  key={size}
                  className={
                    ticketSize === size
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTicketSize(
                      size
                    )
                  }
                >
                  {size}
                </button>
              )
            )}

          </div>


          <div className="ticket-mode-tabs">

            {[
              "SAFE",
              "BALANCED",
              "VALUE",
            ].map((mode) => (
              <button
                key={mode}
                className={
                  ticketMode === mode
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTicketMode(
                    mode
                  )
                }
              >
                {mode}
              </button>
            ))}

          </div>


          <div className="ticket-summary">

            <div>
              <span>
                ODABRANO
              </span>

              <strong>
                {ticket.count}
              </strong>
            </div>

            <div>
              <span>
                UKUPNA KVOTA
              </span>

              <strong>
                {formatOdd(
                  ticket.totalOdds
                )}
              </strong>
            </div>

            <div>
              <span>
                MODEL PROBABILITY
              </span>

              <strong>
                {pct(
                  ticket.combinedProbability
                )}
              </strong>
            </div>

          </div>


          <div className="ticket-list">

            {ticket.selections.map(
              (
                selection,
                index
              ) => {

                const match =
                  selection.prediction;

                const market =
                  selection.market;

                return (
                  <div
                    className="ticket-row"
                    key={
                      String(
                        match.id
                      )
                    }
                  >

                    <div className="ticket-number">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div className="ticket-match">

                      <strong>
                        {match.homeName}
                      </strong>

                      <span>
                        -
                      </span>

                      <strong>
                        {match.awayName}
                      </strong>

                      <small>
                        {match.leagueName}
                      </small>

                    </div>

<div className="ticket-pick">

  <div className="ticket-pick-type">
    <strong>
      {market.market}
    </strong>

    <span>
      {market.market === "1"
        ? "Pobeda domaćina"
        : market.market === "X"
        ? "Nerešeno"
        : market.market === "2"
        ? "Pobeda gosta"
        : market.market === "GG"
        ? "Oba tima daju gol"
        : market.market === "NG"
        ? "Oba tima ne daju gol"
        : market.market === "O1.5"
        ? "Više od 1.5 gola"
        : market.market === "O2.5"
        ? "Više od 2.5 gola"
        : market.market === "O3.5"
        ? "Više od 3.5 gola"
        : "Predikcioni tip"}
    </span>
  </div>

  <div className="ticket-pick-probability">
    {pct(
      market.probability
    )}
  </div>

</div>

                    <div className="ticket-odd">

                      {formatOdd(
                        market.odd
                      )}

                    </div>

                    <div className="ticket-value">

                      {market.value !==
                      null
                        ? `${
                            market.value >=
                            0
                              ? "+"
                              : ""
                          }${(
                            market.value *
                            100
                          ).toFixed(
                            1
                          )}%`
                        : "-"}

                    </div>

                  </div>
                );
              }
            )}

          </div>


          {ticket.count <
            ticketSize && (
            <div className="ticket-warning">
              Nema dovoljno kvalitetnih
              predloga za puni tiket od{" "}
              {ticketSize} mečeva.
              Sistem neće veštački
              dodavati slabe predloge.
            </div>
          )}

        </section>
      )}


      {/* =====================================================
         BEST PICKS
      ===================================================== */}

      {activeTab ===
        "NAJBOLJI" && (
        <section>

          <div className="best-picks-heading">
            <div>
              <div className="screen4-kicker">
                TOP SIGNALS
              </div>

              <h2>
                Najbolji predlozi
              </h2>
            </div>
          </div>


          <div className="best-picks-grid">

            {strongest.map(
              (match) => {

                const p =
                  match.prediction;

                return (
                  <article
                    className="best-pick-card"
                    key={String(
                      match.id
                    )}
                    onClick={() =>
                      setSelectedMatch(
                        match
                      )
                    }
                  >

                    <div className="best-pick-confidence">
                      {p.confidence}/100
                    </div>

                    <small>
                      {match.leagueName}
                    </small>

                    <h3>
                      {match.homeName}
                    </h3>

                    <span>
                      vs
                    </span>

                    <h3>
                      {match.awayName}
                    </h3>

                    <div className="best-pick-result">

                      <strong>
                        {p.strongest.market}
                      </strong>

                      <span>
                        {pct(
                          p.strongest
                            .probability
                        )}
                      </span>

                    </div>

                    {p.bestValue && (
                      <div className="best-pick-value">
                        VALUE{" "}
                        {pct(
                          p.bestValue.value
                        )}
                      </div>
                    )}

                  </article>
                );
              }
            )}

          </div>

        </section>
      )}


      {/* =====================================================
         MATCH DETAIL MODAL
      ===================================================== */}

      {selectedMatch && (
        <div
          className="prediction-modal-backdrop"
          onClick={() =>
            setSelectedMatch(
              null
            )
          }
        >

          <div
            className="prediction-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="modal-close"
              onClick={() =>
                setSelectedMatch(
                  null
                )
              }
            >
              ×
            </button>

            <div className="modal-kicker">
              MATCH ANALYSIS
            </div>

            <h2>
              {
                selectedMatch.homeName
              }
              {" "}
              -
              {" "}
              {
                selectedMatch.awayName
              }
            </h2>

            <p>
              {
                selectedMatch.leagueName
              }
            </p>


            {selectedMatch.prediction && (
              <>
                <div className="modal-probabilities">

                  <div>
                    <span>1</span>
                    <strong>
                      {pct(
                        selectedMatch
                          .prediction
                          .probabilities
                          .home
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>X</span>
                    <strong>
                      {pct(
                        selectedMatch
                          .prediction
                          .probabilities
                          .draw
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>2</span>
                    <strong>
                      {pct(
                        selectedMatch
                          .prediction
                          .probabilities
                          .away
                      )}
                    </strong>
                  </div>

                </div>


                <div className="modal-section">

                  <h3>
                    Tržišta
                  </h3>

                  <div className="modal-market-grid">

                    {selectedMatch.prediction.markets.map(
                      (market) => (
                        <div
                          key={
                            market.market
                          }
                          className="modal-market"
                        >

                          <span>
                            {
                              market.market
                            }
                          </span>

                          <strong>
                            {pct(
                              market.probability
                            )}
                          </strong>

                          <small>
                            Kvota{" "}
                            {formatOdd(
                              market.odd
                            )}
                          </small>

                          {market.value !==
                            null && (
                            <em>
                              Value{" "}
                              {(
                                market.value *
                                100
                              ).toFixed(
                                1
                              )}
                              %
                            </em>
                          )}

                        </div>
                      )
                    )}

                  </div>

                </div>


                <div className="modal-section">

                  <h3>
                    Očekivani golovi
                  </h3>

                  <div className="expected-goals">

                    <div>
                      <span>
                        {
                          selectedMatch
                            .homeName
                        }
                      </span>

                      <strong>
                        {
                          selectedMatch
                            .prediction
                            .expectedHome
                        .toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {
                          selectedMatch
                            .awayName
                        }
                      </span>

                      <strong>
                        {
                          selectedMatch
                            .prediction
                            .expectedAway
                        .toFixed(2)}
                      </strong>
                    </div>

                  </div>

                </div>


                <div className="modal-section">

                  <h3>
                    Najverovatniji predlog
                  </h3>

                  <div className="modal-final-pick">

                    <strong>
                      {
                        selectedMatch
                          .prediction
                          .strongest
                          .market
                      }
                    </strong>

                    <span>
                      {
                        selectedMatch
                          .prediction
                          .confidence
                      }
                      /100
                    </span>

                  </div>

                </div>

              </>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
