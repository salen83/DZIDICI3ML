import { num, safeDiv } from "./numberUtils";

export const normalizeStanding = (row) => {
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
