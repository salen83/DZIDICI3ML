// src/predictions/models/currentPrediction.js

/*
  MODEL 1
  --------
  Poisson + Dixon-Coles + statistička korekcija

  Ovaj fajl sadrži glavnu postojeću matematičku logiku
  koja je ranije bila direktno u Screen4.jsx.
*/

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const n = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const factorial = (x) => {
  const value = Math.max(0, Math.floor(x));

  let result = 1;

  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }

  return result;
};

const poisson = (goals, lambda) => {
  const l = clamp(n(lambda, 1), 0.01, 8);

  return (
    Math.exp(-l) *
    Math.pow(l, goals) /
    factorial(goals)
  );
};


/* =========================================================
   ODDS
========================================================= */

export const getOdd = (match, market) => {
  if (!match) return null;

  const sources = {
    "1": [
      match.home_odd,
      match.homeOdds,
      match.odd_home,
      match.odds_home,
      match.odds1,
      match.odd1,
      match["1"],
    ],

    X: [
      match.draw_odd,
      match.drawOdds,
      match.odd_draw,
      match.odds_draw,
      match.oddsX,
      match.oddX,
      match.X,
    ],

    "2": [
      match.away_odd,
      match.awayOdds,
      match.odd_away,
      match.odds_away,
      match.odds2,
      match.odd2,
      match["2"],
    ],

    GG: [
      match.gg_odd,
      match.ggOdds,
      match.odd_gg,
      match.odds_gg,
      match.btts_yes,
      match.bttsYes,
      match.gg,
    ],

    NG: [
      match.ng_odd,
      match.ngOdds,
      match.odd_ng,
      match.odds_ng,
      match.btts_no,
      match.bttsNo,
      match.ng,
    ],

    "O1.5": [
      match.over15_odd,
      match.over_15_odd,
      match.o15_odd,
      match.odds_over15,
      match.over15,
      match.o15,
    ],

    "O2.5": [
      match.over25_odd,
      match.over_25_odd,
      match.o25_odd,
      match.odds_over25,
      match.over25,
      match.o25,
    ],

    "O3.5": [
      match.over35_odd,
      match.over_35_odd,
      match.o35_odd,
      match.odds_over35,
      match.over35,
      match.o35,
    ],
  };

  const values = sources[market] || [];

  for (const value of values) {
    const odd = Number(value);

    if (Number.isFinite(odd) && odd > 1) {
      return odd;
    }
  }

  return null;
};


export const impliedProbability = (odd) => {
  const value = Number(odd);

  if (!Number.isFinite(value) || value <= 1) {
    return null;
  }

  return 1 / value;
};


export const devig = (odds) => {
  if (!Array.isArray(odds)) {
    return [];
  }

  const probabilities = odds
    .map(impliedProbability)
    .filter(
      (value) =>
        value !== null &&
        Number.isFinite(value)
    );

  const total = probabilities.reduce(
    (sum, value) => sum + value,
    0
  );

  if (total <= 0) {
    return probabilities;
  }

  return probabilities.map(
    (value) => value / total
  );
};


/* =========================================================
   DIXON-COLES
========================================================= */

export const dixonColesTau = (
  homeGoals,
  awayGoals,
  lambdaHome,
  lambdaAway
) => {
  const rho = -0.08;

  const lh = n(lambdaHome, 1);
  const la = n(lambdaAway, 1);

  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lh * la * rho;
  }

  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lh * rho;
  }

  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + la * rho;
  }

  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }

  return 1;
};


export const buildMatrix = (
  lambdaHome,
  lambdaAway,
  maxGoals = 8
) => {
  const matrix = [];

  let total = 0;

  for (let home = 0; home <= maxGoals; home += 1) {
    const row = [];

    for (
      let away = 0;
      away <= maxGoals;
      away += 1
    ) {
      const probability =
        poisson(home, lambdaHome) *
        poisson(away, lambdaAway) *
        dixonColesTau(
          home,
          away,
          lambdaHome,
          lambdaAway
        );

      row.push(probability);
      total += probability;
    }

    matrix.push(row);
  }

  if (total > 0) {
    return matrix.map((row) =>
      row.map(
        (value) => value / total
      )
    );
  }

  return matrix;
};


export const matrixProbabilities = (
  matrix
) => {
  let home = 0;
  let draw = 0;
  let away = 0;

  let gg = 0;
  let ng = 0;

  let over15 = 0;
  let under15 = 0;

  let over25 = 0;
  let under25 = 0;

  let over35 = 0;
  let under35 = 0;

  for (
    let h = 0;
    h < matrix.length;
    h += 1
  ) {
    for (
      let a = 0;
      a < matrix[h].length;
      a += 1
    ) {
      const probability =
        matrix[h][a];

      if (h > a) {
        home += probability;
      }

      if (h === a) {
        draw += probability;
      }

      if (h < a) {
        away += probability;
      }

      if (h > 0 && a > 0) {
        gg += probability;
      } else {
        ng += probability;
      }

      const totalGoals = h + a;

      if (totalGoals > 1) {
        over15 += probability;
      } else {
        under15 += probability;
      }

      if (totalGoals > 2) {
        over25 += probability;
      } else {
        under25 += probability;
      }

      if (totalGoals > 3) {
        over35 += probability;
      } else {
        under35 += probability;
      }
    }
  }

  return {
    home,
    draw,
    away,

    gg,
    ng,

    over15,
    under15,

    over25,
    under25,

    over35,
    under35,
  };
};


/* =========================================================
   TEAM ATTACK / DEFENCE
========================================================= */

const estimateTeamAttack = (
  stats,
  side
) => {
  if (!stats) return 1;

  const basic =
    stats.basic || {};

  const form =
    stats.form || {};

  const recency =
    stats.recency || {};

  const basicGoals =
    side === "home"
      ? n(
          basic.home_goals_for,
          n(basic.goals_for)
        )
      : n(
          basic.away_goals_for,
          n(basic.goals_for)
        );

  const basicGames =
    side === "home"
      ? n(
          basic.home_games,
          n(basic.games)
        )
      : n(
          basic.away_games,
          n(basic.games)
        );

  const formGoals =
    n(
      form.goals_for_per_game,
      form.gf_per_game
    );

  const recentGoals =
    n(
      recency.goals_for_per_game,
      recency.gf_per_game
    );

  const scoredTwoPlus =
    n(
      form.scored_2_plus_pct,
      0
    );

  const basicAverage =
    basicGames > 0
      ? basicGoals / basicGames
      : 0;

  const result =
    basicAverage * 0.35 +
    formGoals * 0.25 +
    recentGoals * 0.25 +
    (scoredTwoPlus / 100) * 0.15;

  return clamp(
    result || 1,
    0.2,
    3.5
  );
};


const estimateTeamDefence = (
  stats,
  side
) => {
  if (!stats) return 1;

  const basic =
    stats.basic || {};

  const form =
    stats.form || {};

  const recency =
    stats.recency || {};

  const basicGoalsAgainst =
    side === "home"
      ? n(
          basic.home_goals_against,
          n(basic.goals_against)
        )
      : n(
          basic.away_goals_against,
          n(basic.goals_against)
        );

  const basicGames =
    side === "home"
      ? n(
          basic.home_games,
          n(basic.games)
        )
      : n(
          basic.away_games,
          n(basic.games)
        );

  const basicAverage =
    basicGames > 0
      ? basicGoalsAgainst /
        basicGames
      : 0;

  const last5Average =
    n(
      form.goals_against_per_game,
      form.ga_per_game
    );

  const recentAverage =
    n(
      recency.goals_against_per_game,
      recency.ga_per_game
    );

  const result =
    basicAverage * 0.4 +
    last5Average * 0.3 +
    recentAverage * 0.3;

  return clamp(
    result || 1,
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
  const leagueHomeGoals = Math.max(
    0.5,
    n(
      leagueStats?.avg_home_goals,
      n(
        leagueStats?.home_goals_per_game,
        1.4
      )
    )
  );

  const leagueAwayGoals = Math.max(
    0.5,
    n(
      leagueStats?.avg_away_goals,
      n(
        leagueStats?.away_goals_per_game,
        1.1
      )
    )
  );

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

  const expectedHome =
    leagueHomeGoals *
    (
      0.45 +
      0.30 *
        (
          homeAttack /
          leagueHomeGoals
        ) +
      0.25 *
        (
          awayDefence /
          leagueAwayGoals
        )
    );

  const expectedAway =
    leagueAwayGoals *
    (
      0.45 +
      0.30 *
        (
          awayAttack /
          leagueAwayGoals
        ) +
      0.25 *
        (
          homeDefence /
          leagueHomeGoals
        )
    );

  return {
    home: clamp(
      expectedHome,
      0.25,
      4
    ),

    away: clamp(
      expectedAway,
      0.2,
      4
    ),
  };
};


/* =========================================================
   STATISTICAL ADJUSTMENT
========================================================= */

const applyStatisticalAdjustments = (
  probabilities,
  homeStats,
  awayStats
) => {
  const homeBasic =
    homeStats?.basic || {};

  const awayBasic =
    awayStats?.basic || {};

  const homeForm =
    homeStats?.form || {};

  const awayForm =
    awayStats?.form || {};

  const homeStrength =
    homeStats?.strength || {};

  const awayStrength =
    awayStats?.strength || {};

  const ppgDifference =
    n(homeBasic.ppg) -
    n(awayBasic.ppg);

  const formDifference =
    n(homeForm.last5_ppg) -
    n(awayForm.last5_ppg);

  const strengthDifference =
    n(homeStrength.strength_index) -
    n(awayStrength.strength_index);

  const homeAdjustment =
    ppgDifference * 0.035 +
    formDifference * 0.025 +
    strengthDifference * 0.04;

  const awayAdjustment =
    -homeAdjustment;

  let home =
    probabilities.home +
    homeAdjustment;

  let away =
    probabilities.away +
    awayAdjustment;

  let draw =
    probabilities.draw;

  home = clamp(home, 0.001, 0.999);
  away = clamp(away, 0.001, 0.999);
  draw = clamp(draw, 0.001, 0.999);

  const total =
    home + draw + away;

  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
  };
};


/* =========================================================
   VALUE
========================================================= */

export const calculateValue = (
  probability,
  odd
) => {
  if (
    probability == null ||
    odd == null ||
    !Number.isFinite(
      Number(probability)
    ) ||
    !Number.isFinite(
      Number(odd)
    ) ||
    Number(odd) <= 1
  ) {
    return null;
  }

  return (
    Number(probability) *
      Number(odd) -
    1
  );
};


export const valueScore = (
  probability,
  odd
) => {
  const value =
    calculateValue(
      probability,
      odd
    );

  if (value === null) {
    return 0;
  }

  return value * 100;
};


/* =========================================================
   MODEL
========================================================= */

export const runCurrentPrediction = (
  match,
  homeStats,
  awayStats,
  leagueStats
) => {
  if (
    !homeStats ||
    !awayStats
  ) {
    return null;
  }

  const expectedGoals =
    calculateExpectedGoals(
      homeStats,
      awayStats,
      leagueStats
    );

  const matrix =
    buildMatrix(
      expectedGoals.home,
      expectedGoals.away,
      8
    );

  const raw =
    matrixProbabilities(
      matrix
    );

  const adjusted =
    applyStatisticalAdjustments(
      raw,
      homeStats,
      awayStats
    );

  const odds = {
    "1": getOdd(match, "1"),
    X: getOdd(match, "X"),
    "2": getOdd(match, "2"),
    GG: getOdd(match, "GG"),
    NG: getOdd(match, "NG"),
    "O1.5": getOdd(match, "O1.5"),
    "O2.5": getOdd(match, "O2.5"),
    "O3.5": getOdd(match, "O3.5"),
  };

  const markets = [
    {
      market: "1",
      probability: adjusted.home,
      odd: odds["1"],
    },

    {
      market: "X",
      probability: adjusted.draw,
      odd: odds.X,
    },

    {
      market: "2",
      probability: adjusted.away,
      odd: odds["2"],
    },

    {
      market: "GG",
      probability: raw.gg,
      odd: odds.GG,
    },

    {
      market: "NG",
      probability: raw.ng,
      odd: odds.NG,
    },

    {
      market: "O1.5",
      probability: raw.over15,
      odd: odds["O1.5"],
    },

    {
      market: "O2.5",
      probability: raw.over25,
      odd: odds["O2.5"],
    },

    {
      market: "O3.5",
      probability: raw.over35,
      odd: odds["O3.5"],
    },
  ].map((market) => {
    const value =
      calculateValue(
        market.probability,
        market.odd
      );

    return {
      ...market,
      impliedProbability:
        impliedProbability(
          market.odd
        ),
      value,
      valueScore:
        valueScore(
          market.probability,
          market.odd
        ),
    };
  });

  const strongest =
    [...markets].sort(
      (a, b) =>
        b.probability -
        a.probability
    )[0];

  const valueCandidates =
    markets.filter(
      (market) =>
        market.odd !== null &&
        market.value !== null
    );

  const bestValue =
    valueCandidates.length > 0
      ? [...valueCandidates].sort(
          (a, b) =>
            b.valueScore -
            a.valueScore
        )[0]
      : null;

  const confidence =
    clamp(
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
          0.35,
      0,
      0.95
    ) * 100;

  return {
    model: "CURRENT",

    modelName:
      "Poisson + Dixon-Coles",

    expectedHome:
      expectedGoals.home,

    expectedAway:
      expectedGoals.away,

    probabilities: {
      home: adjusted.home,
      draw: adjusted.draw,
      away: adjusted.away,

      gg: raw.gg,
      ng: raw.ng,

      over15: raw.over15,
      under15: raw.under15,

      over25: raw.over25,
      under25: raw.under25,

      over35: raw.over35,
      under35: raw.under35,
    },

    matrix,

    odds,

    markets,

    strongest,

    bestValue,

    confidence,

    rawProbabilities: raw,

    statisticalProbabilities:
      adjusted,
  };
};


export default runCurrentPrediction;
