// src/predictions/models/formModel.js

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


export const runFormModel = (
  match,
  homeStats,
  awayStats
) => {
  if (
    !homeStats ||
    !awayStats
  ) {
    return null;
  }

  const homeForm =
    homeStats.form || {};

  const awayForm =
    awayStats.form || {};

  const homePPG = n(
    homeForm.last5_ppg,
    n(homeForm.ppg)
  );

  const awayPPG = n(
    awayForm.last5_ppg,
    n(awayForm.ppg)
  );

  const homeGF = n(
    homeForm.goals_for_per_game,
    n(homeForm.gf_per_game)
  );

  const awayGF = n(
    awayForm.goals_for_per_game,
    n(awayForm.gf_per_game)
  );

  const homeGA = n(
    homeForm.goals_against_per_game,
    n(homeForm.ga_per_game)
  );

  const awayGA = n(
    awayForm.goals_against_per_game,
    n(awayForm.ga_per_game)
  );

  const ppgDifference =
    homePPG - awayPPG;

  const attackDifference =
    homeGF - awayGF;

  const defenceDifference =
    awayGA - homeGA;

  const signal =
    ppgDifference * 0.18 +
    attackDifference * 0.10 +
    defenceDifference * 0.08;

  const home =
    clamp(
      0.50 + signal,
      0.05,
      0.90
    );

  const away =
    clamp(
      0.30 - signal * 0.60,
      0.05,
      0.75
    );

  const draw =
    clamp(
      1 - home - away,
      0.05,
      0.60
    );

  const total =
    home + draw + away;

  const probabilities = {
    home: home / total,
    draw: draw / total,
    away: away / total,
  };

  const entries = [
    {
      market: "1",
      probability:
        probabilities.home,
    },
    {
      market: "X",
      probability:
        probabilities.draw,
    },
    {
      market: "2",
      probability:
        probabilities.away,
    },
  ];

  const strongest =
    [...entries].sort(
      (a, b) =>
        b.probability -
        a.probability
    )[0];

  return {
    model: "FORM",

    modelName:
      "Recent Form Model",

    probabilities,

    strongest,

    confidence:
      strongest.probability * 100,

    factors: {
      homePPG,
      awayPPG,
      homeGF,
      awayGF,
      homeGA,
      awayGA,
    },

    explanation: {
      positive:
        ppgDifference > 0
          ? "Domaćin ima bolji učinak u poslednjih pet utakmica."
          : "Gost ima bolji ili sličan učinak u poslednjih pet utakmica.",

      risk:
        Math.abs(ppgDifference) < 0.25
          ? "Forma timova je relativno izjednačena, pa ovaj model nema jak signal."
          : "Forma daje jasniji signal, ali mali uzorak od nekoliko utakmica povećava neizvesnost.",
    },
  };
};


export default runFormModel;
