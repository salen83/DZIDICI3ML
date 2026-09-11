import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const MODEL_VERSION = "DB-HYBRID-v2";

const HISTORY_TABLE = "prediction_history";

function normalizeHistoryText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function historyDate(value) {
  if (!value) return null;

  const s = String(value).trim();

  const m = s.match(
    /^(\\d{1,2})\\.\\s*(\\d{1,2})\\.\\s*(\\d{4})/
  );

  if (m) {
    const y = Number(m[3]);
    const month = Number(m[2]);
    const day = Number(m[1]);

    if (
      y >= 2000 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const d = value instanceof Date ? value : parseDate(value);

  if (!d || Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${month}-${day}`;
}

function buildPredictionHistoryRows(predictions) {
  return predictions
    .filter(Boolean)
    .map(p => {
      const best = p.best;

      if (!best || !p.homeName || !p.awayName) {
        return null;
      }

      const date =
        historyDate(p.date) ||
        historyDate(p.time);

      const home = normalizeHistoryText(p.homeName);
      const away = normalizeHistoryText(p.awayName);

      const matchKey = [
        date || "",
        home,
        away
      ].join("|");

      return {
        prediction_key: `${MODEL_VERSION}|${matchKey}`,

        source_match_id:
          p.id !== null && p.id !== undefined
            ? String(p.id)
            : null,

        model_version: MODEL_VERSION,

        match_date: date,
        match_time: p.time || null,
        league_name: p.leagueName || null,

        home_name: p.homeName,
        away_name: p.awayName,
        match_key: matchKey,

        predicted_market: best.key || "",
        predicted_label: best.label || null,

        predicted_probability:
          best.probability ?? null,

        market_probability:
          best.marketProbability ?? null,

        odd:
          best.odd ?? null,

        edge:
          best.edge ?? null,

        ev:
          best.ev ?? null,

        confidence:
          best.confidence ?? null,

        status:
          p.status || null,

        data_quality:
          p.dataQuality ?? null,

        rates:
          p.rates || null,

        probabilities:
          p.probabilities || null,

        candidates:
          p.candidates || null
      };
    })
    .filter(Boolean);
}

async function savePredictionHistory(predictions) {
  const rows = buildPredictionHistoryRows(predictions);

  if (!rows.length) return;

  const { error } = await supabase
    .from(HISTORY_TABLE)
    .upsert(rows, {
      onConflict: "prediction_key",
      ignoreDuplicates: true
    });

  if (error) {
    console.error(
      "[Screen4] prediction_history:",
      error
    );
  } else {
    console.log(
      "[Screen4] prediction_history saved:",
      rows.length
    );
  }
}

const PAGE_SIZE = 1000;
const TICKET_SIZES = [5, 10, 15, 20, 25, 30];

const CSS = `
.s4 {
  min-height: 100vh;
  background: #080b11;
  color: #e8edf5;
  padding: 24px;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.s4 * {
  box-sizing: border-box;
}

.s4-shell {
  max-width: 1500px;
  margin: 0 auto;
}

.s4-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.s4-title {
  margin: 0;
  font-size: 28px;
  font-weight: 850;
  letter-spacing: -.6px;
}

.s4-subtitle {
  margin: 7px 0 0;
  color: #7f8b9d;
  font-size: 12px;
}

.s4-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.s4-btn {
  border: 1px solid #252e3b;
  background: #10151e;
  color: #dfe6ef;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 750;
}

.s4-btn:hover {
  background: #161d27;
  border-color: #3a4658;
}

.s4-btn.active {
  background: #e8edf5;
  color: #080b11;
  border-color: #e8edf5;
}

.s4-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.s4-tabs {
  display: flex;
  gap: 6px;
  background: #0d121a;
  border: 1px solid #1d2632;
  padding: 5px;
  border-radius: 13px;
  margin-bottom: 18px;
}

.s4-tab {
  flex: 1;
  border: 0;
  background: transparent;
  color: #7f8b9d;
  padding: 12px;
  border-radius: 9px;
  font-weight: 850;
  cursor: pointer;
}

.s4-tab.active {
  background: #18202b;
  color: #fff;
}

.s4-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.s4-stat {
  background: #0e141d;
  border: 1px solid #1d2632;
  border-radius: 13px;
  padding: 13px 15px;
}

.s4-stat-label {
  color: #738095;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .65px;
}

.s4-stat-value {
  margin-top: 5px;
  font-size: 22px;
  font-weight: 850;
}

.s4-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.s4-input,
.s4-select {
  background: #0e141d;
  border: 1px solid #252f3c;
  color: #e8edf5;
  border-radius: 10px;
  padding: 11px 13px;
  outline: none;
}

.s4-input {
  min-width: 260px;
  flex: 1;
}

.s4-select {
  min-width: 190px;
}

.s4-panel {
  background: #0d131c;
  border: 1px solid #1d2632;
  border-radius: 15px;
  overflow: hidden;
}

.s4-table {
  width: 100%;
  border-collapse: collapse;
}

.s4-table th {
  text-align: left;
  color: #69778b;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .6px;
  padding: 11px 13px;
  border-bottom: 1px solid #1d2632;
}

.s4-table td {
  padding: 13px;
  border-bottom: 1px solid #171f29;
  vertical-align: middle;
}

.s4-table tr:last-child td {
  border-bottom: 0;
}

.s4-match {
  font-weight: 800;
}

.s4-meta {
  color: #707d90;
  font-size: 10px;
  margin-top: 4px;
}

.s4-pick {
  display: inline-flex;
  align-items: center;
  background: #171e29;
  border: 1px solid #293444;
  padding: 7px 10px;
  border-radius: 8px;
  font-weight: 850;
}

.s4-prob {
  font-weight: 850;
}

.s4-muted {
  color: #738095;
}

.s4-positive {
  color: #8fe0b4;
}

.s4-warning {
  color: #e9c779;
}

.s4-danger {
  color: #ed9696;
}

.s4-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
  background: #151c27;
  border: 1px solid #283241;
}

.s4-chip.safe {
  color: #98dfb5;
}

.s4-chip.balanced {
  color: #bdc9ed;
}

.s4-chip.value {
  color: #e4b9d3;
}

.s4-empty {
  padding: 38px;
  text-align: center;
  color: #778396;
}

.s4-error {
  background: #281619;
  border: 1px solid #5b292f;
  color: #f0a7a7;
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.s4-mapbox {
  margin-top: 15px;
  background: #0d131c;
  border: 1px solid #392f1e;
  border-radius: 14px;
  padding: 14px;
}

.s4-mapbox h3 {
  margin: 0 0 10px;
  font-size: 13px;
}

.s4-mapitem {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-bottom: 1px solid #1c2430;
  font-size: 11px;
}

.s4-mapitem:last-child {
  border-bottom: 0;
}

/* TICKETS */

.s4-ticket-controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.s4-control-title {
  color: #69778b;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .7px;
  margin-bottom: 7px;
}

.s4-size-group,
.s4-strategy-group {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.s4-size {
  min-width: 54px;
}

.s4-strategy {
  min-width: 108px;
}

.s4-ticket-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

/* GLAVNA TIKET KARTICA */

.s4-ticket {
  background: #0d131c;
  border: 1px solid #222c39;
  border-radius: 17px;
  overflow: hidden;
  margin-bottom: 18px;
  box-shadow: 0 12px 38px rgba(0,0,0,.18);
}

.s4-ticket-head {
  padding: 18px 20px;
  border-bottom: 1px solid #202a37;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
}

.s4-ticket-title {
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -.2px;
}

.s4-ticket-note {
  color: #778396;
  font-size: 11px;
  margin-top: 5px;
}

.s4-ticket-head-right {
  text-align: right;
}

.s4-ticket-count {
  margin-top: 6px;
  font-size: 17px;
  font-weight: 850;
}

/* PAROVI */

.s4-ticket-grid {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.s4-pick-card {
  background: #111821;
  border: 1px solid #202a36;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  grid-template-columns: 32px minmax(0,1fr) auto;
  gap: 10px;
  align-items: center;
  transition: .15s ease;
}

.s4-pick-card:hover {
  border-color: #354255;
  background: #131b25;
}

.s4-pick-number {
  color: #68768a;
  font-size: 11px;
  font-weight: 850;
}

.s4-pick-main {
  min-width: 0;
}

.s4-pick-match {
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.s4-pick-league {
  color: #69778b;
  font-size: 9px;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.s4-pick-right {
  text-align: right;
  min-width: 86px;
}

.s4-pick-market {
  display: inline-flex;
  justify-content: center;
  min-width: 38px;
  background: #1b2330;
  border: 1px solid #2b3747;
  border-radius: 7px;
  padding: 4px 7px;
  font-size: 12px;
  font-weight: 900;
}

.s4-pick-odd {
  color: #b2bdcb;
  font-size: 10px;
  margin-top: 4px;
}

.s4-pick-prob {
  color: #8fe0b4;
  font-size: 10px;
  margin-top: 2px;
  font-weight: 750;
}

.s4-ticket-foot {
  padding: 14px 18px;
  border-top: 1px solid #202a37;
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  color: #7e8a9c;
  font-size: 10px;
}

.s4-ticket-foot strong {
  color: #e8edf5;
}

.s4-explain {
  padding: 0 18px 15px;
  color: #657286;
  font-size: 9px;
}

.s4-warning-ticket {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #493c22;
  background: #17140d;
  color: #cdb878;
  border-radius: 12px;
  font-size: 11px;
}

.s4-loading {
  min-height: 55vh;
  display: grid;
  place-items: center;
  color: #8a96a7;
}

.s4-spinner {
  width: 27px;
  height: 27px;
  border: 3px solid #273141;
  border-top-color: #dce5ef;
  border-radius: 50%;
  animation: s4spin .8s linear infinite;
  margin: 0 auto;
}

@keyframes s4spin {
  to { transform: rotate(360deg); }
}

.s4-details {
  margin-top: 15px;
  border-top: 1px solid #1b2430;
  padding-top: 10px;
}

.s4-detail-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  color: #687588;
  font-size: 9px;
}

@media (max-width: 1000px) {
  .s4-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .s4-ticket-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .s4 {
    padding: 12px;
  }

  .s4-header {
    flex-direction: column;
  }

  .s4-title {
    font-size: 23px;
  }

  .s4-stats,
  .s4-ticket-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .s4-table th:nth-child(2),
  .s4-table td:nth-child(2) {
    display: none;
  }

  .s4-input {
    min-width: 100%;
  }

  .s4-ticket-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .s4-ticket-head-right {
    text-align: left;
  }

  .s4-pick-card {
    grid-template-columns: 27px minmax(0,1fr) auto;
  }
}
`;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}

function num(v, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;

  const n = Number(String(v).replace(",", "."));

  return Number.isFinite(n) ? n : fallback;
}

function pct(v, fallback = 0) {
  const n = num(v, fallback);
  return n > 1 ? n / 100 : n;
}

function fmtPct(v) {
  return `${Math.round(clamp(v, 0, 1) * 100)}%`;
}

function fmtEdge(v) {
  const x = num(v);
  return `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
}

function fmtOdd(v) {
  return v ? num(v).toFixed(2) : "—";
}

function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const s = String(value).trim();

  // DD. MM. YYYY. HH:MM:SS
  // DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
  let m = s.match(
    /^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4})/
  );

  if (m) {
    const d = new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD / YYYY-MM-DD HH:MM:SS
  m = s.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3])
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);

  return Number.isNaN(d.getTime()) ? null : d;
}

function avg(values, fallback = 0) {
  const a = values.filter(v => Number.isFinite(v));

  return a.length
    ? a.reduce((s, v) => s + v, 0) / a.length
    : fallback;
}

function shrinkRate(total, matches, prior, priorWeight = 6) {
  const n = num(matches);

  if (!n) return prior;

  return (
    num(total) + prior * priorWeight
  ) / (
    n + priorWeight
  );
}

function getOdd(row, market) {
  const aliases = {
    "1": [
      "odd1",
      "odds1",
      "kvota1",
      "odd_1",
      "m1",
      "1"
    ],

    "X": [
      "oddX",
      "oddsX",
      "kvotaX",
      "odd_x",
      "mx",
      "X",
      "x"
    ],

    "2": [
      "odd2",
      "odds2",
      "kvota2",
      "kvota_2",
      "odd_2",
      "m2",
      "2"
    ],

    GG: [
      "oddGG",
      "oddsGG",
      "kvotaGG",
      "odd_gg",
      "gg",
      "GG"
    ],

    NG: [
      "oddNG",
      "oddsNG",
      "kvotaNG",
      "odd_ng",
      "ng",
      "NG"
    ],

    O15: [
      "odd15",
      "odd1p",
      "odds15",
      "kvota15",
      "over15",
      "o15"
    ],

    O25: [
      "odd25",
      "odd2p",
      "odds25",
      "kvota25",
      "over25",
      "o25"
    ],

    U25: [
      "oddU25",
      "odd2m",
      "oddsU25",
      "kvotaU25",
      "under25",
      "u25"
    ],

    O35: [
      "odd35",
      "odd3p",
      "odds35",
      "kvota35",
      "over35",
      "o35"
    ]
  };

  for (const key of aliases[market] || []) {
    if (
      row?.[key] !== undefined &&
      row?.[key] !== null &&
      row?.[key] !== ""
    ) {
      const n = num(row[key]);

      if (n > 1) return n;
    }
  }

  return null;
}

function poissonPmf(k, lambda) {
  const l = Math.max(.001, lambda);

  let p = Math.exp(-l);

  for (let i = 1; i <= k; i++) {
    p *= l / i;
  }

  return p;
}

function dcTau(h, a, lh, la, rho = -0.08) {
  if (h === 0 && a === 0) {
    return 1 - lh * la * rho;
  }

  if (h === 0 && a === 1) {
    return 1 + lh * rho;
  }

  if (h === 1 && a === 0) {
    return 1 + la * rho;
  }

  if (h === 1 && a === 1) {
    return 1 - rho;
  }

  return 1;
}

function scoreMatrix(lambdaHome, lambdaAway, maxGoals = 8) {
  const matrix = [];
  let total = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p =
        poissonPmf(h, lambdaHome) *
        poissonPmf(a, lambdaAway) *
        Math.max(
          .01,
          dcTau(
            h,
            a,
            lambdaHome,
            lambdaAway
          )
        );

      matrix.push({ h, a, p });
      total += p;
    }
  }

  return matrix.map(x => ({
    ...x,
    p: x.p / total
  }));
}

function probabilitiesFromMatrix(matrix) {
  const out = {
    home: 0,
    draw: 0,
    away: 0,
    gg: 0,
    over15: 0,
    over25: 0,
    over35: 0
  };

  for (const x of matrix) {
    if (x.h > x.a) {
      out.home += x.p;
    } else if (x.h === x.a) {
      out.draw += x.p;
    } else {
      out.away += x.p;
    }

    if (x.h > 0 && x.a > 0) {
      out.gg += x.p;
    }

    if (x.h + x.a >= 2) {
      out.over15 += x.p;
    }

    if (x.h + x.a >= 3) {
      out.over25 += x.p;
    }

    if (x.h + x.a >= 4) {
      out.over35 += x.p;
    }
  }

  out.ng = 1 - out.gg;
  out.under25 = 1 - out.over25;

  return out;
}

function devig(odds) {
  const valid = odds.every(
    o => Number.isFinite(o) && o > 1
  );

  if (!valid) return null;

  const raw = odds.map(o => 1 / o);
  const sum = raw.reduce((a, b) => a + b, 0);

  if (!sum) return null;

  return raw.map(x => x / sum);
}

function key2(a, b) {
  return `${String(a)}:${String(b)}`;
}

function h2hKey(a, b, league) {
  const x = [
    Number(a),
    Number(b)
  ].sort((m, n) => m - n);

  return `${x[0]}:${x[1]}:${String(league)}`;
}

function buildAliasMap(rows, field) {
  const map = new Map();

  for (const row of rows) {
    const value = norm(row[field]);

    if (!value) continue;

    if (!map.has(value)) {
      map.set(value, []);
    }

    map.get(value).push(row);
  }

  return map;
}

function resolveLeague(name, leagueMap, countryId) {
  const exact = leagueMap.get(norm(name)) || [];

  const leagueOnly = exact.filter(
    r =>
      String(r.type ?? "league").toLowerCase() ===
      "league"
  );

  const candidates =
    leagueOnly.length ? leagueOnly : exact;

  if (!candidates.length) {
    return {
      id: null,
      row: null,
      reason: `Liga nije pronađena: ${name || "prazno"}`
    };
  }

  let usable = candidates;

  if (
    countryId !== null &&
    countryId !== undefined &&
    countryId !== ""
  ) {
    const countryMatches = candidates.filter(
      r =>
        String(r.country_id) ===
        String(countryId)
    );

    if (countryMatches.length) {
      usable = countryMatches;
    }
  }

  const ids = [
    ...new Set(
      usable
        .map(r => String(r.league_id))
        .filter(Boolean)
    )
  ];

  if (ids.length !== 1) {
    return {
      id: null,
      row: null,
      reason: `Ambigvitet lige: ${name}`
    };
  }

  const sorted = [...usable].sort(
    (a, b) =>
      num(b.confidence) -
      num(a.confidence)
  );

  return {
    id: sorted[0].league_id,
    row: sorted[0],
    reason: null
  };
}

function resolveTeam(rows, leagueId, countryId) {
  if (!rows.length) return null;

  let candidates = rows;

  if (
    leagueId !== null &&
    leagueId !== undefined
  ) {
    const sameLeague = candidates.filter(
      r =>
        String(r.league_id) ===
        String(leagueId)
    );

    if (sameLeague.length) {
      candidates = sameLeague;
    }
  }

  if (
    countryId !== null &&
    countryId !== undefined &&
    countryId !== ""
  ) {
    const sameCountry = candidates.filter(
      r =>
        String(r.country_id) ===
        String(countryId)
    );

    if (sameCountry.length) {
      candidates = sameCountry;
    }
  }

  const ids = [
    ...new Set(
      candidates
        .map(r => String(r.team_id))
        .filter(Boolean)
    )
  ];

  if (ids.length !== 1) {
    return null;
  }

  return candidates[0];
}

function indexByTeam(rows) {
  const map = new Map();

  for (const row of rows) {
    map.set(
      String(row.team_id),
      row
    );
  }

  return map;
}

function indexByTeamLeague(rows) {
  const map = new Map();

  for (const row of rows) {
    map.set(
      key2(
        row.team_id,
        row.league_id
      ),
      row
    );
  }

  return map;
}

async function fetchAllRows(table, orders = []) {
  const all = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select("*")
      .range(
        from,
        from + PAGE_SIZE - 1
      );

    for (const order of orders) {
      query = query.order(
        order,
        { ascending: true }
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `${table}: ${error.message}`
      );
    }

    const rows = data || [];
    console.log(`[${table}] BROJ REDOVA:`, rows.length);
    if (table === "future_matches") console.log("[future_matches] PRVI RED:", rows[0]);
    if (table === "future_matches") console.log("[future_matches] DATUMI:", rows.map(r => ({ id: r.id, datum: r.datum, date: r.date, match_date: r.match_date, home: r.home, away: r.away })));

    all.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return all;
}

async function loadDatabase() {
  const [
    futureMatches,
    teamAliases,
    leagueAliases,
    primaryLeagues,
    teamStats,
    formStats,
    homeAwayStats,
    goalStats,
    opponentStats,
    h2hStats,
    recencyStats,
    leagueStats
  ] = await Promise.all([
    fetchAllRows(
      "future_matches",
      ["id"]
    ),

    fetchAllRows(
      "team_aliases",
      ["id"]
    ),

    fetchAllRows(
      "league_aliases",
      ["id"]
    ),

    fetchAllRows(
      "team_primary_leagues",
      ["team_id"]
    ),

    fetchAllRows(
      "team_league_statistics",
      ["team_id"]
    ),

    fetchAllRows(
      "team_form_statistics",
      ["team_id"]
    ),

    fetchAllRows(
      "team_home_away_form",
      ["team_id"]
    ),

    fetchAllRows(
      "team_goal_statistics",
      ["team_id"]
    ),

    fetchAllRows(
      "team_opponent_strength",
      ["team_id", "league_id"]
    ),

    fetchAllRows(
      "team_h2h_statistics",
      [
        "team_a_id",
        "team_b_id",
        "league_id"
      ]
    ),

    fetchAllRows(
      "team_recency_statistics",
      [
        "team_id",
        "league_id"
      ]
    ),

    fetchAllRows(
      "league_statistics",
      ["league_id"]
    )
  ]);

  return {
    futureMatches,
    teamAliases,
    leagueAliases,
    primaryLeagues,
    teamStats,
    formStats,
    homeAwayStats,
    goalStats,
    opponentStats,
    h2hStats,
    recencyStats,
    leagueStats
  };
}

function isFutureMatch(row) {
  const rawDate =
    row.datum ||
    row.date ||
    row.match_date ||
    row.vreme ||
    row.kickoff ||
    row.kickoff_at ||
    row.start_time;

  const d = parseDate(rawDate);

  if (!d) {
    console.warn("[Screen4] DATUM NIJE PARSIRAN:", {
      id: row.id,
      rawDate,
      datum: row.datum,
      vreme: row.vreme
    });
    return false;
  }

  const today = new Date();

  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const result = d >= start;

  if (row.id === 30402) {
    console.log("[Screen4] TEST DATUMA:", {
      id: row.id,
      rawDate,
      parsed: d.toString(),
      today: start.toString(),
      future: result
    });
  }

  return result;
}

function resolveFutureRows(data) {
  console.log("[Screen4] RAW futureMatches:", data.futureMatches?.length);
  console.log("[Screen4] PRVI futureMatch:", data.futureMatches?.[0]);
  console.log("[Screen4] DATUMI:", (data.futureMatches || []).slice(0, 10).map(r => ({ datum: r.datum, date: r.date, match_date: r.match_date })));
  const teamMap = buildAliasMap(
    data.teamAliases,
    "alias"
  );

  const leagueMap = buildAliasMap(
    data.leagueAliases,
    "alias"
  );

  const teamStats = indexByTeam(
    data.teamStats
  );

  const formStats = indexByTeam(
    data.formStats
  );

  const homeAwayStats =
    indexByTeam(
      data.homeAwayStats
    );

  const goalStats =
    indexByTeamLeague(
      data.goalStats
    );

  const opponentStats =
    indexByTeamLeague(
      data.opponentStats
    );

  const recencyStats =
    indexByTeamLeague(
      data.recencyStats
    );

  const leagueStats = new Map(
    data.leagueStats.map(
      r => [
        String(r.league_id),
        r
      ]
    )
  );

  const primary = new Map(
    data.primaryLeagues.map(
      r => [
        String(r.team_id),
        r
      ]
    )
  );

  const h2h = new Map(
    data.h2hStats.map(
      r => [
        h2hKey(
          r.team_a_id,
          r.team_b_id,
          r.league_id
        ),
        r
      ]
    )
  );

  return data.futureMatches
    .filter(isFutureMatch)
    .map(row => {
      const leagueName =
        row.liga ??
        row.league ??
        "";

      const countryId =
        row.country_id ??
        row.countryId ??
        null;

      const league = resolveLeague(
        leagueName,
        leagueMap,
        countryId
      );

      const homeName =
        row.home ??
        row.home_team ??
        row.domacin ??
        "";

      const awayName =
        row.away ??
        row.away_team ??
        row.gost ??
        "";

      const homeAlias =
        resolveTeam(
          teamMap.get(
            norm(homeName)
          ) || [],
          league.id,
          countryId
        );

      const awayAlias =
        resolveTeam(
          teamMap.get(
            norm(awayName)
          ) || [],
          league.id,
          countryId
        );

      const issues = [];

      if (!league.id) {
        issues.push(
          league.reason
        );
      }

      if (!homeAlias) {
        issues.push(
          `Domaćin nije mapiran: ${homeName}`
        );
      }

      if (!awayAlias) {
        issues.push(
          `Gost nije mapiran: ${awayName}`
        );
      }

      const homeId =
        homeAlias?.team_id ?? null;

      const awayId =
        awayAlias?.team_id ?? null;

      const hs =
        homeId
          ? teamStats.get(
              String(homeId)
            )
          : null;

      const as =
        awayId
          ? teamStats.get(
              String(awayId)
            )
          : null;

      if (
        homeId &&
        hs &&
        league.id &&
        String(hs.league_id) !==
          String(league.id)
      ) {
        issues.push(
          "Domaćin nema statistiku za ovu ligu"
        );
      }

      if (
        awayId &&
        as &&
        league.id &&
        String(as.league_id) !==
          String(league.id)
      ) {
        issues.push(
          "Gost nema statistiku za ovu ligu"
        );
      }

      if (homeId && !hs) {
        issues.push(
          "Nema statistike domaćina"
        );
      }

      if (awayId && !as) {
        issues.push(
          "Nema statistike gosta"
        );
      }

      return {
        row,
        id: row.id,

        date: parseDate(
          row.datum ??
          row.date ??
          row.match_date ??
          row.vreme ??
          row.kickoff ??
          row.kickoff_at ??
          row.start_time
        ),

        time:
          row.vreme ??
          row.time ??
          row.match_time ??
          "",

        leagueName,
        leagueId: league.id,
        leagueRow: league.row,

        homeName,
        awayName,

        homeId,
        awayId,

        homeAlias,
        awayAlias,

        ready: issues.length === 0,
        issues,

        stats: {
          league:
            league.id
              ? leagueStats.get(
                  String(league.id)
                )
              : null,

          home: hs,
          away: as,

          homeForm:
            homeId
              ? formStats.get(
                  String(homeId)
                )
              : null,

          awayForm:
            awayId
              ? formStats.get(
                  String(awayId)
                )
              : null,

          homeAwayHome:
            homeId
              ? homeAwayStats.get(
                  String(homeId)
                )
              : null,

          homeAwayAway:
            awayId
              ? homeAwayStats.get(
                  String(awayId)
                )
              : null,

          homeGoal:
            homeId && league.id
              ? goalStats.get(
                  key2(
                    homeId,
                    league.id
                  )
                )
              : null,

          awayGoal:
            awayId && league.id
              ? goalStats.get(
                  key2(
                    awayId,
                    league.id
                  )
                )
              : null,

          homeOpp:
            homeId && league.id
              ? opponentStats.get(
                  key2(
                    homeId,
                    league.id
                  )
                )
              : null,

          awayOpp:
            awayId && league.id
              ? opponentStats.get(
                  key2(
                    awayId,
                    league.id
                  )
                )
              : null,

          homeRec:
            homeId && league.id
              ? recencyStats.get(
                  key2(
                    homeId,
                    league.id
                  )
                )
              : null,

          awayRec:
            awayId && league.id
              ? recencyStats.get(
                  key2(
                    awayId,
                    league.id
                  )
                )
              : null,

          primaryHome:
            homeId
              ? primary.get(
                  String(homeId)
                )
              : null,

          primaryAway:
            awayId
              ? primary.get(
                  String(awayId)
                )
              : null,

          h2h:
            homeId &&
            awayId &&
            league.id
              ? h2h.get(
                  h2hKey(
                    homeId,
                    awayId,
                    league.id
                  )
                )
              : null
        }
      };
    })
    .sort((a, b) => {
      const da =
        a.date?.getTime() ?? 0;

      const db =
        b.date?.getTime() ?? 0;

      if (da !== db) {
        return da - db;
      }

      return String(a.time)
        .localeCompare(
          String(b.time)
        );
    });
}

function expectedGoals(match) {
  const s = match.stats;

  const league = s.league;
  const home = s.home;
  const away = s.away;

  if (!league || !home || !away) {
    return null;
  }

  const leagueHome =
    Math.max(
      .65,
      num(
        league.avg_home_goals,
        1.35
      )
    );

  const leagueAway =
    Math.max(
      .55,
      num(
        league.avg_away_goals,
        1.10
      )
    );

  const homeGF =
    shrinkRate(
      home.home_goals_for,
      home.home_matches,
      leagueHome
    );

  const homeGA =
    shrinkRate(
      home.home_goals_against,
      home.home_matches,
      leagueAway
    );

  const awayGF =
    shrinkRate(
      away.away_goals_for,
      away.away_matches,
      leagueAway
    );

  const awayGA =
    shrinkRate(
      away.away_goals_against,
      away.away_matches,
      leagueHome
    );

  let lambdaHome =
    Math.sqrt(
      Math.max(
        .08,
        homeGF * awayGA
      )
    );

  let lambdaAway =
    Math.sqrt(
      Math.max(
        .08,
        awayGF * homeGA
      )
    );

  const hf = s.homeForm;
  const af = s.awayForm;

  const ha = s.homeAwayHome;
  const aa = s.homeAwayAway;

  const hr = s.homeRec;
  const ar = s.awayRec;

  const homeRecentAttack =
    avg([
      ha?.home5_matches
        ? num(ha.home5_goals_for) /
          num(ha.home5_matches)
        : NaN,

      ha?.home10_matches
        ? num(ha.home10_goals_for) /
          num(ha.home10_matches)
        : NaN,

      hf?.last5_matches
        ? num(hf.last5_gf) /
          num(hf.last5_matches)
        : NaN,

      hf?.last10_matches
        ? num(hf.last10_gf) /
          num(hf.last10_matches)
        : NaN,

      hr?.home_effective_matches
        ? num(hr.home_weighted_gf)
        : NaN
    ], homeGF);

  const homeRecentDefense =
    avg([
      ha?.home5_matches
        ? num(ha.home5_goals_against) /
          num(ha.home5_matches)
        : NaN,

      ha?.home10_matches
        ? num(ha.home10_goals_against) /
          num(ha.home10_matches)
        : NaN,

      hf?.last5_matches
        ? num(hf.last5_ga) /
          num(hf.last5_matches)
        : NaN,

      hf?.last10_matches
        ? num(hf.last10_ga) /
          num(hf.last10_matches)
        : NaN,

      hr?.home_effective_matches
        ? num(hr.home_weighted_ga)
        : NaN
    ], homeGA);

  const awayRecentAttack =
    avg([
      aa?.away5_matches
        ? num(aa.away5_goals_for) /
          num(aa.away5_matches)
        : NaN,

      aa?.away10_matches
        ? num(aa.away10_goals_for) /
          num(aa.away10_matches)
        : NaN,

      af?.last5_matches
        ? num(af.last5_gf) /
          num(af.last5_matches)
        : NaN,

      af?.last10_matches
        ? num(af.last10_gf) /
          num(af.last10_matches)
        : NaN,

      ar?.away_effective_matches
        ? num(ar.away_weighted_gf)
        : NaN
    ], awayGF);

  const awayRecentDefense =
    avg([
      aa?.away5_matches
        ? num(aa.away5_goals_against) /
          num(aa.away5_matches)
        : NaN,

      aa?.away10_matches
        ? num(aa.away10_goals_against) /
          num(aa.away10_matches)
        : NaN,

      af?.last5_matches
        ? num(af.last5_ga) /
          num(af.last5_matches)
        : NaN,

      af?.last10_matches
        ? num(af.last10_ga) /
          num(af.last10_matches)
        : NaN,

      ar?.away_effective_matches
        ? num(ar.away_weighted_ga)
        : NaN
    ], awayGA);

  const homeAttackRatio =
    clamp(
      homeRecentAttack /
        Math.max(.25, homeGF),
      .82,
      1.18
    );

  const homeDefenseRatio =
    clamp(
      homeRecentDefense /
        Math.max(.25, homeGA),
      .82,
      1.18
    );

  const awayAttackRatio =
    clamp(
      awayRecentAttack /
        Math.max(.25, awayGF),
      .82,
      1.18
    );

  const awayDefenseRatio =
    clamp(
      awayRecentDefense /
        Math.max(.25, awayGA),
      .82,
      1.18
    );

  lambdaHome *= clamp(
    1 +
      .10 * (homeAttackRatio - 1) -
      .08 * (awayDefenseRatio - 1),
    .86,
    1.14
  );

  lambdaAway *= clamp(
    1 +
      .10 * (awayAttackRatio - 1) -
      .08 * (homeDefenseRatio - 1),
    .86,
    1.14
  );

  const homePPG =
    num(
      ha?.home10_ppg,
      num(home.home_ppg)
    );

  const awayPPG =
    num(
      aa?.away10_ppg,
      num(away.away_ppg)
    );

  const ppgDiff =
    clamp(
      homePPG - awayPPG,
      -2.5,
      2.5
    );

  lambdaHome *= clamp(
    1 + .025 * ppgDiff,
    .92,
    1.08
  );

  lambdaAway *= clamp(
    1 - .025 * ppgDiff,
    .92,
    1.08
  );

  const oppDiff =
    clamp(
      num(
        s.homeOpp?.strength_index,
        .5
      ) -
      num(
        s.awayOpp?.strength_index,
        .5
      ),
      -1,
      1
    );

  lambdaHome *= clamp(
    1 + .025 * oppDiff,
    .95,
    1.05
  );

  lambdaAway *= clamp(
    1 - .025 * oppDiff,
    .95,
    1.05
  );

  return {
    home: clamp(
      lambdaHome,
      .20,
      3.60
    ),

    away: clamp(
      lambdaAway,
      .15,
      3.30
    )
  };
}

function makePrediction(match) {
  if (!match.ready) {
    return null;
  }

  const rates =
    expectedGoals(match);

  if (!rates) {
    return null;
  }

  let probs =
    probabilitiesFromMatrix(
      scoreMatrix(
        rates.home,
        rates.away
      )
    );

  const s = match.stats;

  const empiricalGG =
    avg([
      pct(
        s.homeGoal?.home_btts_pct,
        NaN
      ),

      pct(
        s.awayGoal?.away_btts_pct,
        NaN
      ),

      pct(
        s.homeForm?.last10_gg_pct,
        NaN
      ),

      pct(
        s.awayForm?.last10_gg_pct,
        NaN
      ),

      pct(
        s.league?.gg_pct,
        NaN
      )
    ], probs.gg);

  const empiricalO25 =
    avg([
      pct(
        s.homeForm?.last10_over25_pct,
        NaN
      ),

      pct(
        s.awayForm?.last10_over25_pct,
        NaN
      ),

      pct(
        s.homeForm?.last5_over25_pct,
        NaN
      ),

      pct(
        s.awayForm?.last5_over25_pct,
        NaN
      ),

      pct(
        s.league?.over25_pct,
        NaN
      )
    ], probs.over25);

  const dataQuality =
    clamp(
      avg([
        num(
          s.home?.matches_played
        ) / 25,

        num(
          s.away?.matches_played
        ) / 25,

        num(
          s.homeForm?.last10_matches
        ) / 10,

        num(
          s.awayForm?.last10_matches
        ) / 10
      ]),
      0,
      1
    );

  const empiricalWeight =
    .18 + .15 * dataQuality;

  probs.gg =
    clamp(
      (1 - empiricalWeight) *
        probs.gg +
      empiricalWeight *
        empiricalGG,
      .01,
      .99
    );

  probs.ng = 1 - probs.gg;

  probs.over25 =
    clamp(
      (1 - empiricalWeight) *
        probs.over25 +
      empiricalWeight *
        empiricalO25,
      .01,
      .99
    );

  probs.under25 =
    1 - probs.over25;

  const h = s.h2h;

  if (
    h &&
    num(h.matches_played) >= 2
  ) {
    const isAHome =
      String(h.team_a_id) ===
      String(match.homeId);

    const h2hHome =
      pct(
        isAHome
          ? h.team_a_win_pct
          : h.team_b_win_pct,
        NaN
      );

    const h2hDraw =
      pct(
        h.draw_pct,
        NaN
      );

    const h2hAway =
      pct(
        isAHome
          ? h.team_b_win_pct
          : h.team_a_win_pct,
        NaN
      );

    if (
      [
        h2hHome,
        h2hDraw,
        h2hAway
      ].every(Number.isFinite)
    ) {
      const w =
        clamp(
          num(h.matches_played) /
            5 *
            .05,
          .02,
          .05
        );

      probs.home =
        probs.home * (1 - w) +
        h2hHome * w;

      probs.draw =
        probs.draw * (1 - w) +
        h2hDraw * w;

      probs.away =
        probs.away * (1 - w) +
        h2hAway * w;

      const sum =
        probs.home +
        probs.draw +
        probs.away;

      probs.home /= sum;
      probs.draw /= sum;
      probs.away /= sum;
    }
  }

  const markets = [
    {
      key: "1",
      label: "1",
      probability: probs.home,
      odd: getOdd(match.row, "1")
    },

    {
      key: "X",
      label: "X",
      probability: probs.draw,
      odd: getOdd(match.row, "X")
    },

    {
      key: "2",
      label: "2",
      probability: probs.away,
      odd: getOdd(match.row, "2")
    },

    {
      key: "GG",
      label: "GG",
      probability: probs.gg,
      odd: getOdd(match.row, "GG")
    },

    {
      key: "NG",
      label: "NG",
      probability: probs.ng,
      odd: getOdd(match.row, "NG")
    },

    {
      key: "O1.5",
      label: "O 1.5",
      probability: probs.over15,
      odd: getOdd(match.row, "O15")
    },

    {
      key: "O2.5",
      label: "O 2.5",
      probability: probs.over25,
      odd: getOdd(match.row, "O25")
    },

    {
      key: "U2.5",
      label: "U 2.5",
      probability: probs.under25,
      odd: getOdd(match.row, "U25")
    },

    {
      key: "O3.5",
      label: "O 3.5",
      probability: probs.over35,
      odd: getOdd(match.row, "O35")
    }
  ].map(m => {
    let marketProbability = null;

    if (
      m.key === "1" ||
      m.key === "X" ||
      m.key === "2"
    ) {
      const odds = [
        getOdd(match.row, "1"),
        getOdd(match.row, "X"),
        getOdd(match.row, "2")
      ];

      const d = devig(odds);

      marketProbability =
        d
          ? d[
              ["1", "X", "2"]
                .indexOf(m.key)
            ]
          : m.odd
            ? 1 / m.odd
            : null;
    }

    else if (
      m.key === "GG" ||
      m.key === "NG"
    ) {
      const d = devig([
        getOdd(match.row, "GG"),
        getOdd(match.row, "NG")
      ]);

      marketProbability =
        d
          ? d[
              m.key === "GG"
                ? 0
                : 1
            ]
          : m.odd
            ? 1 / m.odd
            : null;
    }

    else if (
      m.key === "O2.5" ||
      m.key === "U2.5"
    ) {
      const d = devig([
        getOdd(match.row, "O25"),
        getOdd(match.row, "U25")
      ]);

      marketProbability =
        d
          ? d[
              m.key === "O2.5"
                ? 0
                : 1
            ]
          : m.odd
            ? 1 / m.odd
            : null;
    }

    else {
      marketProbability =
        m.odd
          ? 1 / m.odd
          : null;
    }

    const edge =
      marketProbability !== null
        ? m.probability -
          marketProbability
        : null;

    const ev =
      m.odd
        ? m.probability *
            m.odd -
          1
        : null;

    const sample =
      clamp(
        avg([
          num(
            s.home?.matches_played
          ) / 25,

          num(
            s.away?.matches_played
          ) / 25,

          num(
            s.homeForm?.last10_matches
          ) / 10,

          num(
            s.awayForm?.last10_matches
          ) / 10
        ]),
        0,
        1
      );

    const edgeScore =
      edge === null
        ? .45
        : clamp(
            (edge + .04) /
              .18,
            0,
            1
          );

    const probScore =
      clamp(
        (m.probability - .45) /
          .40,
        0,
        1
      );

    const confidence =
      Math.round(
        100 *
        clamp(
          .68 * probScore +
          .17 * edgeScore +
          .15 * sample,
          0,
          1
        )
      );

    const qualityScore =
      m.probability * 100 +
      (edge ?? 0) * 45 +
      (ev ?? 0) * 20 +
      confidence * .10;

    return {
      ...m,
      marketProbability,
      edge,
      ev,
      confidence,
      qualityScore
    };
  });

  const withOdds =
    markets.filter(
      m => m.odd
    );

  const sorted =
    [...withOdds].sort(
      (a, b) =>
        b.qualityScore -
        a.qualityScore
    );

  const best =
    sorted[0] ||
    [...markets].sort(
      (a, b) =>
        b.probability -
        a.probability
    )[0];

  const status =
    best.probability >= .65
      ? "SIGURNO"
      : best.probability >= .57
        ? "DOBAR IZBOR"
        : "OPREZ";

  return {
    ...match,
    rates,
    probabilities: probs,
    candidates: sorted,
    best,
    status,
    dataQuality
  };
}

function strategyLabel(strategy) {
  if (strategy === "safe") {
    return "SIGURNI";
  }

  if (strategy === "balanced") {
    return "BALANS";
  }

  return "VALUE";
}

function strategyDescription(strategy) {
  if (strategy === "safe") {
    return "Prioritet je najveća verovatnoća prolaza.";
  }

  if (strategy === "balanced") {
    return "Balans verovatnoće, kvote i prednosti modela.";
  }

  return "Veći naglasak na razlici modela i tržišne kvote.";
}

function ticketCandidateScore(
  candidate,
  strategy
) {
  const p =
    candidate.probability;

  const edge =
    num(candidate.edge);

  const ev =
    num(candidate.ev);

  const confidence =
    num(candidate.confidence) /
    100;

  if (strategy === "safe") {
    if (p < .62) {
      return -Infinity;
    }

    return (
      p * 100 +
      confidence * 10 +
      edge * 12
    );
  }

  if (strategy === "balanced") {
    if (p < .55) {
      return -Infinity;
    }

    return (
      p * 72 +
      confidence * 13 +
      edge * 65 +
      ev * 22
    );
  }

  if (
    p < .50 ||
    ev < .03
  ) {
    return -Infinity;
  }

  return (
    p * 45 +
    confidence * 8 +
    edge * 105 +
    ev * 65
  );
}

function buildTicket(
  predictions,
  size,
  strategy
) {
  const candidates = [];

  for (const prediction of predictions) {
    for (const candidate of (
      prediction.candidates || []
    )) {
      const score =
        ticketCandidateScore(
          candidate,
          strategy
        );

      if (!Number.isFinite(score)) {
        continue;
      }

      candidates.push({
        ...candidate,

        matchId:
          prediction.id,

        home:
          prediction.homeName,

        away:
          prediction.awayName,

        leagueName:
          prediction.leagueName,

        date:
          prediction.date,

        time:
          prediction.time,

        ticketScore:
          score
      });
    }
  }

  candidates.sort(
    (a, b) =>
      b.ticketScore -
      a.ticketScore
  );

  const selected = [];
  const usedMatches = new Set();
  const usedTeams = new Set();

  /*
   * Prvi prolaz:
   * pokušavamo da ne ponavljamo isti tim
   * ako imamo dovoljno drugih mečeva.
   */
  for (const candidate of candidates) {
    if (
      selected.length >= size
    ) {
      break;
    }

    if (
      usedMatches.has(
        String(candidate.matchId)
      )
    ) {
      continue;
    }

    const homeKey =
      String(candidate.home);

    const awayKey =
      String(candidate.away);

    if (
      usedTeams.has(homeKey) ||
      usedTeams.has(awayKey)
    ) {
      if (
        candidates.length -
          selected.length >
        size * 2
      ) {
        continue;
      }
    }

    selected.push(candidate);

    usedMatches.add(
      String(candidate.matchId)
    );

    usedTeams.add(homeKey);
    usedTeams.add(awayKey);
  }

  /*
   * Drugi prolaz:
   * ako zbog diversifikacije nema dovoljno
   * parova, popunjavamo do traženog broja.
   */
  if (
    selected.length < size
  ) {
    for (const candidate of candidates) {
      if (
        selected.length >= size
      ) {
        break;
      }

      if (
        usedMatches.has(
          String(candidate.matchId)
        )
      ) {
        continue;
      }

      selected.push(candidate);

      usedMatches.add(
        String(candidate.matchId)
      );
    }
  }

  const averageProbability =
    avg(
      selected.map(
        x => x.probability
      )
    );

  const averageEdge =
    avg(
      selected.map(
        x => num(x.edge)
      ),
      0
    );

  const totalOdds =
    selected.length
      ? selected.reduce(
          (acc, x) =>
            acc *
            num(x.odd, 1),
          1
        )
      : 0;

  return {
    size,
    strategy,

    picks:
      selected,

    requested:
      size,

    averageProbability,
    averageEdge,
    totalOdds,

    complete:
      selected.length >= size
  };
}

function formatDate(date) {
  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    "sr-RS",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );
}

export default function Screen4() {
  const [resolved, setResolved] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [tab, setTab] =
    useState("predictions");

  const [search, setSearch] =
    useState("");

  const [leagueFilter, setLeagueFilter] =
    useState("ALL");

  const [ticketSize, setTicketSize] =
    useState(10);

  const [strategy, setStrategy] =
    useState("balanced");

  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await loadDatabase();

        const rows =
          resolveFutureRows(data);

        setResolved(rows);
      } catch (e) {
        setError(
          e?.message ||
          "Greška pri učitavanju podataka."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [
    load,
    refreshKey
  ]);

  const predictions =
    useMemo(
      () =>
        resolved
          .map(makePrediction)
          .filter(Boolean),
      [resolved]
    );

  useEffect(() => {
    if (!predictions.length) return;

    savePredictionHistory(predictions);
  }, [predictions]);

  const mappingIssues =
    useMemo(
      () =>
        resolved.filter(
          x => !x.ready
        ),
      [resolved]
    );

  const leagues =
    useMemo(
      () =>
        [
          ...new Set(
            predictions
              .map(
                x => x.leagueName
              )
              .filter(Boolean)
          )
        ].sort(
          (a, b) =>
            String(a).localeCompare(
              String(b)
            )
        ),
      [predictions]
    );

  const filteredPredictions =
    useMemo(() => {
      const q = norm(search);

      return predictions.filter(
        prediction => {
          const textOk =
            !q ||
            norm(
              prediction.homeName
            ).includes(q) ||
            norm(
              prediction.awayName
            ).includes(q) ||
            norm(
              prediction.leagueName
            ).includes(q);

          const leagueOk =
            leagueFilter === "ALL" ||
            prediction.leagueName ===
              leagueFilter;

          return (
            textOk &&
            leagueOk
          );
        }
      );
    }, [
      predictions,
      search,
      leagueFilter
    ]);

  const ticket =
    useMemo(
      () =>
        buildTicket(
          predictions,
          ticketSize,
          strategy
        ),
      [
        predictions,
        ticketSize,
        strategy
      ]
    );

  const withOddsCount =
    useMemo(
      () =>
        predictions.filter(
          p =>
            p.candidates?.length > 0
        ).length,
      [predictions]
    );

  if (loading) {
    return (
      <div className="s4">
        <style>{CSS}</style>

        <div className="s4-loading">
          <div>
            <div className="s4-spinner" />

            <div
              style={{
                marginTop: 12,
                textAlign: "center"
              }}
            >
              Učitavam predikcioni Data Center…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="s4">
      <style>{CSS}</style>

      <div className="s4-shell">

        {/* HEADER */}

        <div className="s4-header">
          <div>
            <h1 className="s4-title">
              PREDIKCIONI DATA CENTER
            </h1>

            <p className="s4-subtitle">
              {MODEL_VERSION}
              {" · "}
              future_matches
              {" → "}
              aliases
              {" → "}
              Supabase statistike
              {" → "}
              Poisson / Dixon-Coles
            </p>
          </div>

          <div className="s4-actions">
            <button
              className="s4-btn"
              onClick={() =>
                setRefreshKey(
                  x => x + 1
                )
              }
              disabled={loading}
            >
              ↻ Osveži
            </button>
          </div>
        </div>

        {error && (
          <div className="s4-error">
            {error}
          </div>
        )}

        {/* TABS */}

        <div className="s4-tabs">
          <button
            className={`s4-tab ${
              tab === "predictions"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setTab("predictions")
            }
          >
            PREDIKCIJE
          </button>

          <button
            className={`s4-tab ${
              tab === "tickets"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setTab("tickets")
            }
          >
            TIKETI
          </button>
        </div>

        {/* GLOBAL STATS */}

        <div className="s4-stats">

          <div className="s4-stat">
            <div className="s4-stat-label">
              Future mečevi
            </div>

            <div className="s4-stat-value">
              {resolved.length}
            </div>
          </div>

          <div className="s4-stat">
            <div className="s4-stat-label">
              Spremni
            </div>

            <div className="s4-stat-value">
              {predictions.length}
            </div>
          </div>

          <div className="s4-stat">
            <div className="s4-stat-label">
              Nemapirani
            </div>

            <div className="s4-stat-value">
              {mappingIssues.length}
            </div>
          </div>

          <div className="s4-stat">
            <div className="s4-stat-label">
              Sa kvotom
            </div>

            <div className="s4-stat-value">
              {withOddsCount}
            </div>
          </div>

          <div className="s4-stat">
            <div className="s4-stat-label">
              Model
            </div>

            <div
              className="s4-stat-value"
              style={{
                fontSize: 15,
                marginTop: 10
              }}
            >
              {MODEL_VERSION}
            </div>
          </div>

        </div>

        {/* ============================= */}
        {/* PREDIKCIJE                     */}
        {/* ============================= */}

        {tab === "predictions" && (
          <>
            <div className="s4-toolbar">

              <input
                className="s4-input"
                value={search}
                onChange={e =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Pretraži tim ili ligu…"
              />

              <select
                className="s4-select"
                value={leagueFilter}
                onChange={e =>
                  setLeagueFilter(
                    e.target.value
                  )
                }
              >
                <option value="ALL">
                  Sve lige
                </option>

                {leagues.map(
                  league => (
                    <option
                      key={league}
                      value={league}
                    >
                      {league}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="s4-panel">

              {filteredPredictions.length === 0 ? (
                <div className="s4-empty">
                  Nema spremnih predikcija
                  za izabrani filter.
                </div>
              ) : (

                <table className="s4-table">

                  <thead>
                    <tr>
                      <th>Meč</th>
                      <th>Liga</th>
                      <th>Predlog</th>
                      <th>Model</th>
                      <th>Kvota</th>
                      <th>Prednost</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredPredictions.map(
                      prediction => (
                        <tr
                          key={String(
                            prediction.id
                          )}
                        >

                          <td>
                            <div className="s4-match">
                              {prediction.homeName}
                              {" – "}
                              {prediction.awayName}
                            </div>

                            <div className="s4-meta">
                              {formatDate(
                                prediction.date
                              )}

                              {prediction.time
                                ? ` · ${prediction.time}`
                                : ""}
                            </div>
                          </td>

                          <td className="s4-muted">
                            {prediction.leagueName}
                          </td>

                          <td>
                            <span className="s4-pick">
                              {prediction.best?.label ||
                                "—"}
                            </span>
                          </td>

                          <td className="s4-prob">
                            {fmtPct(
                              prediction.best
                                ?.probability || 0
                            )}
                          </td>

                          <td>
                            {prediction.best?.odd
                              ? fmtOdd(
                                  prediction.best.odd
                                )
                              : "—"}
                          </td>

                          <td
                            className={
                              num(
                                prediction.best?.edge
                              ) >= 0
                                ? "s4-positive"
                                : "s4-danger"
                            }
                          >
                            {prediction.best?.edge !==
                              null &&
                            prediction.best?.edge !==
                              undefined
                              ? fmtEdge(
                                  prediction.best.edge
                                )
                              : "—"}
                          </td>

                          <td>
                            <span
                              className={`s4-chip ${
                                prediction.status ===
                                "SIGURNO"
                                  ? "safe"
                                  : prediction.status ===
                                      "DOBAR IZBOR"
                                    ? "balanced"
                                    : "value"
                              }`}
                            >
                              {prediction.status}
                            </span>
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>
                </table>
              )}

            </div>

            {/* MAPPING PROBLEMS */}

            {mappingIssues.length > 0 && (
              <div className="s4-mapbox">

                <h3>
                  ⚠ Mečevi koji nisu spremni
                </h3>

                {mappingIssues
                  .slice(0, 30)
                  .map(
                    (match, index) => (
                      <div
                        className="s4-mapitem"
                        key={`${match.id}-${index}`}
                      >

                        <strong>
                          {match.homeName}
                          {" – "}
                          {match.awayName}
                        </strong>

                        <span className="s4-muted">
                          {match.leagueName}
                        </span>

                        <span className="s4-warning">
                          {match.issues.join(
                            " · "
                          )}
                        </span>

                      </div>
                    )
                  )}

                {mappingIssues.length > 30 && (
                  <div className="s4-meta">
                    Prikazano 30 od{" "}
                    {mappingIssues.length}
                    {" "}problema.
                  </div>
                )}

              </div>
            )}

          </>
        )}

        {/* ============================= */}
        {/* TIKETI                         */}
        {/* ============================= */}

        {tab === "tickets" && (
          <>

            {/* IZBOR TIKETA */}

            <div className="s4-ticket-controls">

              <div>
                <div className="s4-control-title">
                  Broj parova
                </div>

                <div className="s4-size-group">

                  {TICKET_SIZES.map(
                    size => (
                      <button
                        key={size}
                        className={`s4-btn s4-size ${
                          ticketSize === size
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setTicketSize(size)
                        }
                      >
                        {size}
                      </button>
                    )
                  )}

                </div>
              </div>

              <div>
                <div className="s4-control-title">
                  Strategija
                </div>

                <div className="s4-strategy-group">

                  {[
                    "safe",
                    "balanced",
                    "value"
                  ].map(
                    item => (
                      <button
                        key={item}
                        className={`s4-btn s4-strategy ${
                          strategy === item
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setStrategy(item)
                        }
                      >
                        {strategyLabel(
                          item
                        )}
                      </button>
                    )
                  )}

                </div>
              </div>

            </div>

            {/* SUMMARY */}

            <div className="s4-ticket-summary">

              <div className="s4-stat">
                <div className="s4-stat-label">
                  Izabrano
                </div>

                <div className="s4-stat-value">
                  {ticket.picks.length}
                  /
                  {ticket.requested}
                </div>
              </div>

              <div className="s4-stat">
                <div className="s4-stat-label">
                  Prosek modela
                </div>

                <div className="s4-stat-value">
                  {fmtPct(
                    ticket.averageProbability
                  )}
                </div>
              </div>

              <div className="s4-stat">
                <div className="s4-stat-label">
                  Prosek prednosti
                </div>

                <div className="s4-stat-value">
                  {fmtEdge(
                    ticket.averageEdge
                  )}
                </div>
              </div>

              <div className="s4-stat">
                <div className="s4-stat-label">
                  Ukupna kvota
                </div>

                <div className="s4-stat-value">
                  {ticket.totalOdds
                    ? ticket.totalOdds.toFixed(2)
                    : "—"}
                </div>
              </div>

            </div>

            {/* WARNING */}

            {!ticket.complete &&
              ticket.picks.length > 0 && (
                <div className="s4-warning-ticket">
                  ⚠ Za strategiju{" "}
                  <strong>
                    {strategyLabel(
                      strategy
                    )}
                  </strong>{" "}
                  trenutno nema dovoljno
                  kvalifikovanih parova.
                  Model neće namerno ubacivati
                  slabe predloge samo da bi
                  popunio tiket.
                </div>
              )}

            {/* TICKET */}

            <div className="s4-ticket">

              <div className="s4-ticket-head">

                <div>
                  <div className="s4-ticket-title">
                    TIKET {ticket.size}
                    {" · "}
                    {strategyLabel(
                      strategy
                    )}
                  </div>

                  <div className="s4-ticket-note">
                    {strategyDescription(
                      strategy
                    )}
                  </div>
                </div>

                <div className="s4-ticket-head-right">

                  <span
                    className={`s4-chip ${
                      strategy
                    }`}
                  >
                    {strategyLabel(
                      strategy
                    )}
                  </span>

                  <div className="s4-ticket-count">
                    {ticket.picks.length}
                    {" / "}
                    {ticket.size}
                    {" parova"}
                  </div>

                </div>

              </div>

              {/* DVE KOLONE PAROVA */}

              <div className="s4-ticket-grid">

                {ticket.picks.map(
                  (pick, index) => (
                    <div
                      className="s4-pick-card"
                      key={`${pick.matchId}-${pick.key}`}
                    >

                      <div className="s4-pick-number">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </div>

                      <div className="s4-pick-main">

                        <div className="s4-pick-match">
                          {pick.home}
                          {" – "}
                          {pick.away}
                        </div>

                        <div className="s4-pick-league">
                          {pick.leagueName}
                          {" · "}
                          {formatDate(
                            pick.date
                          )}

                          {pick.time
                            ? ` · ${pick.time}`
                            : ""}
                        </div>

                      </div>

                      <div className="s4-pick-right">

                        <div className="s4-pick-market">
                          {pick.label}
                        </div>

                        <div className="s4-pick-odd">
                          kvota{" "}
                          {fmtOdd(
                            pick.odd
                          )}
                        </div>

                        <div className="s4-pick-prob">
                          {fmtPct(
                            pick.probability
                          )}
                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>

              {ticket.picks.length === 0 && (
                <div className="s4-empty">
                  Nema dovoljno kvalifikovanih
                  predloga sa kvotama za ovu
                  strategiju.
                </div>
              )}

              {/* FOOTER TIKETA */}

              <div className="s4-ticket-foot">

                <span>
                  Parovi:{" "}
                  <strong>
                    {ticket.picks.length}
                  </strong>
                </span>

                <span>
                  Prosek modela:{" "}
                  <strong>
                    {fmtPct(
                      ticket.averageProbability
                    )}
                  </strong>
                </span>

                <span>
                  Prosek prednosti:{" "}
                  <strong>
                    {fmtEdge(
                      ticket.averageEdge
                    )}
                  </strong>
                </span>

                <span>
                  Ukupna kvota:{" "}
                  <strong>
                    {ticket.totalOdds
                      ? ticket.totalOdds.toFixed(2)
                      : "—"}
                  </strong>
                </span>

              </div>

              <div className="s4-explain">
                Na tiketu se prikazuju samo
                najvažnije informacije:
                meč, tip, kvota i verovatnoća
                modela. Tehnički detalji ostaju
                u predikcionom prikazu kako bi
                tiket ostao pregledan.
              </div>

            </div>

            <div className="s4-details">

              <div className="s4-detail-row">
                <span>
                  Model: {MODEL_VERSION}
                </span>

                <span>
                  Mečevi: future_matches
                </span>

                <span>
                  Timovi: team_aliases
                </span>

                <span>
                  Lige: league_aliases
                </span>

                <span>
                  Statistike: Supabase DB
                </span>
              </div>

            </div>

          </>
        )}

      </div>
    </div>
  );
}
