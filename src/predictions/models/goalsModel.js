// src/predictions/models/goalsModel.js

const clamp = (
  value,
  min = 0,
  max = 1
) =>
  Math.min(
    max,
    Math.max(min, value)
  );

const n = (
  value,
  fallback = 0
) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};


const poissonDistribution = (
  lambda,
  goals
) => {
  const factorial = (
    value
  ) => {
    let result = 1;

    for (
      let i = 2;
      i <= value;
      i += 1
    ) {
      result *= i;
    }

    return result;
  };

  return (
    Math.exp(-lambda) *
    Math.pow(lambda, goals) /
    factorial(goals)
  );
};


const probabilityOver = (
  lambda,
  line
) => {
  let underOrEqual = 0;

  const max =
    Math.floor(line);

  for (
    let goals = 0;
    goals <= max;
    goals += 1
  ) {
    underOrEqual +=
      poissonDistribution(
        lambda,
        goals
      );
  }

  return clamp(
    1 - underOrEqual
  );
};


export const runGoalsModel = (
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

  const homeBasic =
    homeStats.basic || {};

  const awayBasic =
    awayStats.basic || {};

  const league =
    leagueStats || {};

  const homeGF =
    n(
      homeBasic.home_goals_for_per_game,
      n(
        homeBasic.goals_for_per_game,
        1.3
      )
    );

  const awayGF =
    n(
      awayBasic.away_goals_for_per_game,
      n(
        awayBasic.goals_for_per_game,
        1.1
      )
    );

  const homeGA =
    n(
      homeBasic.home_goals_against_per_game,
      n(
        homeBasic.goals_against_per_game,
        1.2
      )
    );

  const awayGA =
    n(
      awayBasic.away_goals_against_per_game,
      n(
        awayBasic.goals_against_per_game,
        1.2
      )
    );

  const leagueTotal =
    n(
      league.avg_total_goals,
      n(
        league.total_goals_per_game,
        2.5
      )
    );

  const expectedHome =
    clamp(
      homeGF * 0.65 +
        awayGA * 0.35,
      0.2,
      4
    );

  const expectedAway =
    clamp(
      awayGF * 0.65 +
        homeGA * 0.35,
      0.2,
      4
    );

  const expectedTotal =
    expectedHome +
    expectedAway;

  const over15 =
    probabilityOver(
      expectedTotal,
      1.5
    );

  const over25 =
    probabilityOver(
      expectedTotal,
      2.5
    );

  const over35 =
    probabilityOver(
      expectedTotal,
      3.5
    );

  const ggHome =
    1 -
    poissonDistribution(
      expectedHome,
      0
    );

  const ggAway =
    1 -
    poissonDistribution(
      expectedAway,
      0
    );

  const gg =
    ggHome * ggAway;

  const ng =
    1 - gg;

  const markets = [
    {
      market: "GG",
      probability: gg,
    },
    {
      market: "NG",
      probability: ng,
    },
    {
      market: "O1.5",
      probability: over15,
    },
    {
      market: "O2.5",
      probability: over25,
    },
    {
      market: "O3.5",
      probability: over35,
    },
  ];

  const strongest =
    [...markets].sort(
      (a, b) =>
        b.probability -
        a.probability
    )[0];

  return {
    model: "GOALS",

    modelName:
      "Goals Profile Model",

    expectedHome,

    expectedAway,

    expectedTotal,

    leagueExpectedTotal:
      leagueTotal,

    probabilities: {
      gg,
      ng,
      over15,
      over25,
      over35,
    },

    markets,

    strongest,

    confidence:
      strongest.probability * 100,

    explanation: {
      positive:
        expectedTotal >= 2.5
          ? "Model očekuje utakmicu sa relativno visokim brojem golova."
          : "Model ne očekuje izrazito golgetersku utakmicu.",

      risk:
        Math.abs(
          expectedTotal - leagueTotal
        ) > 0.8
          ? "Procena se značajno razlikuje od proseka lige, pa je neizvesnost veća."
          : "Procena ukupnog broja golova je relativno blizu proseku lige.",
    },
  };
};


export default runGoalsModel;
