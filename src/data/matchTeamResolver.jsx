// src/data/matchTeamResolver.js

import { getOrCreateTeamId } from "./teamManager";

// prima raw match sa imenima, vraća match sa ID-evima
export function resolveMatchTeams(match) {
  const homeId = getOrCreateTeamId(
    match.home,
    match.country || "",
    match.homeType || "senior"
  );

  const awayId = getOrCreateTeamId(
    match.away,
    match.country || "",
    match.awayType || "senior"
  );

  return {
    ...match,
    homeId,
    awayId
  };
}
