import { num, safeDiv } from "./numberUtils";

export const calculateWindow = (games) => {
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
