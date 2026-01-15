// src/utils/teamId.js

// pravi normalizovan string za ID
export function normalizeTeamName(name) {
  return name
    .toUpperCase()
    .replace(/Š/g, "S")
    .replace(/Đ/g, "DJ")
    .replace(/Č/g, "C")
    .replace(/Ć/g, "C")
    .replace(/Ž/g, "Z")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// pravi stabilan ID za tim na osnovu imena
export function makeTeamId(teamName) {
  return normalizeTeamName(teamName);
}

// dodaje homeId i awayId u svaki meč
export function attachTeamIds(rows) {
  return rows.map(m => ({
    ...m,
    homeId: makeTeamId(m.home),
    awayId: makeTeamId(m.away)
  }));
}
