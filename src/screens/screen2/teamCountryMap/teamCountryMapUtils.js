import countries from "./countries";

const STORAGE_KEY = "TEAM_COUNTRY_MAP_V1";

let teamCountryMap = {};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) teamCountryMap = JSON.parse(raw) || {};
  } catch (e) {
    console.error("Failed to load teamCountryMap", e);
    teamCountryMap = {};
  }
}

function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(teamCountryMap)); }
  catch(e){ console.error("Failed to save teamCountryMap", e); }
}

loadFromStorage();

let subscribers = [];

function notifySubscribers() {
  const copy = { ...teamCountryMap };
  subscribers.forEach(cb => cb(copy));
}

export function subscribeTeamMap(callback) {
  subscribers.push(callback);
  callback({ ...teamCountryMap });
  return () => { subscribers = subscribers.filter(cb => cb !== callback); };
}

export function getTeamMap() { return { ...teamCountryMap }; }
export function getTeamInfo(teamName) { return teamCountryMap[teamName] || null; }

function guessCountryFromLeague(leagueName = "") {
  const lower = (leagueName || "").toLowerCase();
  for (const entry of Object.values(countries)) {
    if (!entry || !entry.name) continue;
    if (lower.includes(entry.name.toLowerCase())) return { country: entry.name, flag: entry.flag };
  }
  return { country: leagueName || "?", flag: "" };
}

export function ensureTeam(teamName, leagueName = "") {
  if (!teamName) return;
  if (teamCountryMap[teamName]) return;
  const { country, flag } = guessCountryFromLeague(leagueName);
  teamCountryMap[teamName] = { country, flag };
  saveToStorage();
  notifySubscribers();
}
