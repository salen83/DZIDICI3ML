import { pct } from "./numberUtils";

export const parseFT = (ft) => {
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
export const getResultForTeam = (gf, ga) => {
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
};
export const resultPoints = (result) => {
  if (result === "W") return 3;
  if (result === "D") return 1;
  return 0;
};
export const calculateTableStrength = (
  standing,
  leagueStandings
) => {
  if (!standing) return 0;

  const rows = (leagueStandings || []).filter(
    (x) =>
      x &&
      x.played > 0 &&
      x.seasonId === standing.seasonId
  );

  if (!rows.length) return 0;

  const maxPPG = Math.max(
    ...rows.map((x) => x.ppg),
    0
  );

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
    maxPPG > 0
      ? (standing.ppg / maxPPG) * 60
      : 0;

  const gdScore =
    maxGD > 0
      ? Math.max(
          0,
          standing.gdPerGame / maxGD
        ) * 20
      : 0;

  const positionScore =
    maxPosition > 1 && standing.position
      ? ((maxPosition - standing.position + 1) /
          maxPosition) *
        20
      : 0;

  return pct(
    ppgScore +
      gdScore +
      positionScore
  );
};
export const calculateFormStrength = (form) => {
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

export const calculateAttackStrength = (
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

export const calculateDefenseStrength = (
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
      ? Math.max(
          0,
          Math.min(
            100,
            100 - seasonGA * 35
          )
        )
      : 0;

  const recentScore =
    recentGA !== undefined
      ? Math.max(
          0,
          Math.min(
            100,
            100 - recentGA * 35
          )
        )
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

export const calculateGoalStrength = (form) => {
  if (!form?.played) return 0;

  return pct(
    form.over2Rate * 0.3 +
      form.over3Rate * 0.2 +
      form.ggRate * 0.25 +
      form.gfPerGame * 15 +
      Math.max(
        0,
        50 - form.gaPerGame * 10
      ) * 0.25
  );
};

export const calculateVenueStrength = (
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
        Math.min(
          100,
          50 + split.gdPerGame * 25
        )
      ) *
        0.15
  );
};

export const calculateConfidence = ({
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

export const calculateFinalScore = ({
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
