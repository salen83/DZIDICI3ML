export const getMainTeamName = (
  teamId,
  primaryLeagueByTeam,
  aliasesByTeam,
  sofaTeamById,
  matches
) => {
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

export const countryByTeam = (
  teamId,
  primaryLeagueByTeam,
  aliasesByTeam,
  sofaTeamById
) => {
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
