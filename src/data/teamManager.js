// src/data/teamManager.js

import teams from "./teams";

const STORAGE_KEY = "TEAMS_DB_V1";

function loadDB() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  return { ...teams };
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function makeId(name, type = "senior") {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);

  return base + "-" + type.toUpperCase() + "-" + Date.now();
}

// glavna funkcija
export function getOrCreateTeamId(name, country, type = "senior") {
  const db = loadDB();

  // traži tačan match
  for (const id in db) {
    const t = db[id];
    if (t.name === name && t.type === type) {
      return id;
    }
  }

  // ne postoji → pravi novi
  const newId = makeId(name, type);

  db[newId] = {
    id: newId,
    name,
    country,
    type
  };

  saveDB(db);

  return newId;
}

export function getTeamById(id) {
  const db = loadDB();
  return db[id] || null;
}

export function getAllTeams() {
  return loadDB();
}
