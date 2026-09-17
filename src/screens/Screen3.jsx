import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './Screen3.css';
import { MatchesContext } from "../MatchesContext";

import { supabase } from "../supabase";

export default function Screen3() {
  const { futureMatches, setFutureMatches } = useContext(MatchesContext);
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({row:null, col:null});
  const [collapsedLeagues, setCollapsedLeagues] = useState({});

  const [aliasCheckOpen, setAliasCheckOpen] = useState(false);
  const [aliasCheckLoading, setAliasCheckLoading] = useState(false);
  const [aliasCheckResult, setAliasCheckResult] = useState(null);

  const rowHeight = 40;
  const buffer = 15;
  const containerHeight = 600;

// load from Supabase
useEffect(() => {
async function loadMatches() {
  let allData = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("future_matches")
      .select("*")
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Future matches load error:", error);
      return;
    }

    allData = [...allData, ...(data || [])];

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  console.log("===== FUTURE MATCHES FROM SUPABASE =====");
  console.log("UKUPAN BROJ MECEVA:", allData.length);

  const leagueCounts = allData.reduce((acc, match) => {
    const liga = match.liga || "Nedefinisana liga";
    acc[liga] = (acc[liga] || 0) + 1;
    return acc;
  }, {});

  console.table(leagueCounts);
  console.log("LIGE:", Object.keys(leagueCounts));

  setFutureMatches(allData);
}

  loadMatches();
}, [setFutureMatches]);

  const totalRows = futureMatches?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight)/rowHeight) + buffer);
  const visibleRows = futureMatches?.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => setScrollTop(e.target.scrollTop), []);

  const normalizeDate = (val) => {
    if (!val) return '';
    if (!isNaN(val)) {
      const date = new Date((val - 25569) * 86400 * 1000);
      return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
    }
    const str = String(val).trim();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) return str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d,m,y]=str.split('/');
      return `${d}.${m}.${y}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y,m,d]=str.split('-');
      return `${d}.${m}.${y}`;
    }
    return str;
  };

// ===== SUPABASE SYNC (LEAGUES + TEAMS) =====
// ===== SUPABASE SYNC + ALIAS MAPPING =====
const syncLeaguesAndTeams = async (rows) => {
  const leagueSet = new Set();
  const teamSet = new Set();

  const leagues = [];
  const teams = [];

  rows.forEach(r => {
    // LEAGUES
    const leagueName = String(r.liga || "").trim();

    if (leagueName && !leagueSet.has(leagueName)) {
      leagueSet.add(leagueName);
      leagues.push({
        name: leagueName,
        country_id: null,
        country: null
      });
    }

    // TEAMS (HOME)
    const homeName = String(r.home || "").trim();
    const homeKey = `${homeName}|screen3`;

    if (homeName && !teamSet.has(homeKey)) {
      teamSet.add(homeKey);
      teams.push({
        name: homeName,
        country_id: null,
        source: "screen3"
      });
    }

    // TEAMS (AWAY)
    const awayName = String(r.away || "").trim();
    const awayKey = `${awayName}|screen3`;

    if (awayName && !teamSet.has(awayKey)) {
      teamSet.add(awayKey);
      teams.push({
        name: awayName,
        country_id: null,
        source: "screen3"
      });
    }
  });

  // Zadržavamo postojeći sync Mozzart naziva u lokalne tabele.
  // =========================================================
  // ALIAS MAPPING
  // Originalni Mozzart home/away/liga se NE MENJAJU.
  // Dodajemo samo SofaScore ID-jeve.
  // =========================================================

  const { data: leagueAliases, error: leagueAliasError } = await supabase
    .from("league_aliases")
    .select("alias, league_id, source")
    .eq("source", "mozzart");

  if (leagueAliasError) {
    throw leagueAliasError;
  }

  // team_aliases može imati više od 1000 redova, pa ih učitavamo stranicu po stranicu.
  const teamPageSize = 1000;
  let teamFrom = 0;
  let teamAliases = [];

  while (true) {
    const { data: teamPage, error: teamAliasError } = await supabase
      .from("team_aliases")
      .select("alias, team_id, league_id")
      .range(teamFrom, teamFrom + teamPageSize - 1);

    if (teamAliasError) {
      throw teamAliasError;
    }

    teamAliases = [...teamAliases, ...(teamPage || [])];
        console.log("SYNC: team aliases učitani:", teamAliases.length);

    if (!teamPage || teamPage.length < teamPageSize) {
      break;
    }

    teamFrom += teamPageSize;
  }

  console.log("Učitano team_aliases:", teamAliases.length);

  console.log("===== RAW TEAM ALIASES TEST =====");
  console.log(
    (teamAliases || []).filter(row =>
      String(row.alias || "").toLowerCase().includes("widzew") ||
      String(row.alias || "").toLowerCase().includes("polonia bytom") ||
      String(row.alias || "").toLowerCase().includes("south melbourne") ||
      String(row.alias || "").toLowerCase() === "lions"
    )
  );

  const normalizeAlias = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

  // ---------------------------------------------------------
  // LEAGUE MAP
  // ---------------------------------------------------------
  const leagueMap = new Map();

  for (const row of leagueAliases || []) {
    const key = normalizeAlias(row.alias);

    if (!key || row.league_id == null) continue;

    if (!leagueMap.has(key)) {
      leagueMap.set(key, new Set());
    }

    leagueMap.get(key).add(Number(row.league_id));
  }

  // ---------------------------------------------------------
  // TEAM MAP
  // key = normalized alias + league_id
  // ---------------------------------------------------------
  const teamMap = new Map();

  for (const row of teamAliases || []) {
    if (row.team_id == null) continue;

    const aliasKey = normalizeAlias(row.alias);
    if (!aliasKey) continue;

    const leagueId =
      row.league_id != null ? Number(row.league_id) : null;

    const key = `${aliasKey}|${leagueId ?? "NULL"}`;

    if (!teamMap.has(key)) {
      teamMap.set(key, new Set());
    }

    teamMap.get(key).add(Number(row.team_id));
  }

  console.log("===== TEAM MAP TEST =====");
  console.log("widzew lodz ii|281:", teamMap.get("widzew lodz ii|281"));
  console.log("polonia bytom|281:", teamMap.get("polonia bytom|281"));
  console.log("south melbourne|1786:", teamMap.get("south melbourne|1786"));
  console.log("lions|1786:", teamMap.get("lions|1786"));

  const resolveLeagueIds = (leagueName) => {
    const key = normalizeAlias(leagueName);
    const ids = leagueMap.get(key);

    if (!ids) {
      return [];
    }

    return [...ids];
  };

  // Određuje konkretnu SofaScore ligu kada jedan Mozzart naziv
  // obuhvata više SofaScore liga.
  const resolveLeagueId = (leagueName, homeTeamId = null, awayTeamId = null) => {
    const candidateLeagueIds = resolveLeagueIds(leagueName);

    // Normalan slučaj: jedan Mozzart naziv -> jedna Sofa liga.
    if (candidateLeagueIds.length === 1) {
      return candidateLeagueIds[0];
    }

    // Ako nema jednoznačne lige, pokušavamo preko oba team ID-ja.
    if (
      candidateLeagueIds.length > 1 &&
      homeTeamId != null &&
      awayTeamId != null
    ) {
      const matchingLeagueIds = candidateLeagueIds.filter((leagueId) => {
        let homeMatches = false;
        let awayMatches = false;

        for (const [key, ids] of teamMap.entries()) {
          if (key.endsWith(`|${Number(leagueId)}`)) {
            if (ids.has(Number(homeTeamId))) {
              homeMatches = true;
            }

            if (ids.has(Number(awayTeamId))) {
              awayMatches = true;
            }
          }

          if (homeMatches && awayMatches) {
            break;
          }
        }

        return homeMatches && awayMatches;
      });

      if (matchingLeagueIds.length === 1) {
        return matchingLeagueIds[0];
      }
    }

    return null;
  };

  const resolveTeamId = (teamName, leagueId) => {
    const nameKey = normalizeAlias(teamName);

    if (!nameKey) {
      return null;
    }

    // Prvo pokušavamo striktno po ligi.
    if (leagueId != null) {
      const leagueKey = `${nameKey}|${Number(leagueId)}`;
      const leagueIds = teamMap.get(leagueKey);

      if (leagueIds && leagueIds.size === 1) {
        return [...leagueIds][0];
      }
    }

    // Ako nema league-specific aliasa, dozvoljavamo samo
    // potpuno jednoznačan alias kroz sve lige.
    const matches = [];

    for (const [key, ids] of teamMap.entries()) {
      if (!key.startsWith(`${nameKey}|`)) continue;

      for (const id of ids) {
        matches.push(id);
      }
    }

    const uniqueIds = [...new Set(matches)];

    return uniqueIds.length === 1 ? uniqueIds[0] : null;
  };

  // =========================================================
  // SOFASCORE EVENT OVERRIDE
  //
  // team_aliases nije uvek dovoljan:
  // npr. Mozzart "Vitebsk" -> 3351,
  // dok stvarni event može biti "ML Vitebsk" -> 381792.
  //
  // Zato, kada znamo ligu + datum, proveravamo
  // sofa_league_events i stvarni event ima prednost.
  // =========================================================

  const parseFutureDate = (value) => {
    const str = String(value || "").trim();

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
      const [d, m, y] = str.split(".");
      return `${y}-${m}-${d}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    return null;
  };

  // Prvo napravimo osnovno alias mapiranje.
  // Ovo koristimo kao "sidro" za pronalaženje pravog SofaScore eventa.
  console.log("SYNC: kreće baseRows");

  let baseRows;
  try {
    baseRows = rows.map(row => {
    let homeTeamId = resolveTeamId(row.home, null);
    let awayTeamId = resolveTeamId(row.away, null);

    let leagueId = resolveLeagueId(
      row.liga,
      homeTeamId,
      awayTeamId
    );

    if (leagueId != null) {
      const strictHomeTeamId = resolveTeamId(row.home, leagueId);
      const strictAwayTeamId = resolveTeamId(row.away, leagueId);

      if (strictHomeTeamId != null) {
        homeTeamId = strictHomeTeamId;
      }

      if (strictAwayTeamId != null) {
        awayTeamId = strictAwayTeamId;
      }
    }

    return {
      ...row,
      league_id: leagueId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId
    };
  });

  } catch (err) {
    console.error("SYNC: BASE ROWS ERROR:", err);
    console.error("SYNC: BASE ROWS ERROR message:", err?.message);
    console.error("SYNC: BASE ROWS ERROR stack:", err?.stack);
    throw err;
  }

  console.log("SYNC: baseRows OK:", baseRows.length);

  // =========================================================
  // Učitavamo samo potrebne SofaScore evente:
  // league_id + datumi koji postoje u ovom importu.
  // =========================================================

  // =========================================================
  // SofaScore eventi - OPTIMIZOVANO
  // =========================================================
  // Umesto league x datum (do 1140 requestova),
  // učitavamo sve potrebne lige za jedan datum u jednom
  // batch-u. Za ovaj import to je oko 10-20 requestova.
  // =========================================================

  const requiredLeagueIds = [
    ...new Set(
      baseRows
        .map(r => Number(r.league_id))
        .filter(Number.isFinite)
    )
  ];

  const requiredDates = [
    ...new Set(
      baseRows
        .map(r => {
          const fromDatum = parseFutureDate(r.datum);
          if (fromDatum) return fromDatum;

          const vreme = String(r.vreme || "").trim();
          const m = vreme.match(
            /^(\\d{1,2})\\.\\s*(\\d{1,2})\\.\\s*(\\d{4})/
          );

          if (m) {
            const [, d, mo, y] = m;
            return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          }

          return null;
        })
        .filter(Boolean)
    )
  ];

  console.log(
    "SOFA OPT: potrebne lige:",
    requiredLeagueIds.length
  );
  console.log(
    "SOFA OPT: potrebni datumi:",
    requiredDates
  );

  let sofaEvents = [];

  // Držimo batch ispod uobičajenih URL/PostgREST ograničenja.
  const leagueChunkSize = 50;
  const eventPageSize = 1000;

  for (const matchDate of requiredDates) {
    for (
      let i = 0;
      i < requiredLeagueIds.length;
      i += leagueChunkSize
    ) {
      const leagueChunk = requiredLeagueIds.slice(
        i,
        i + leagueChunkSize
      );

      let from = 0;

      while (true) {
        console.log(
          `SOFA OPT: datum=${matchDate}, ` +
          `lige=${i + 1}-${Math.min(
            i + leagueChunk.length,
            requiredLeagueIds.length
          )}, from=${from}`
        );

        const { data, error } = await supabase
          .from("sofa_league_events")
          .select(`
            league_id,
            season_id,
            round,
            event_id,
            start_timestamp,
            match_date,
            match_time,
            home_team_id,
            home_team,
            home_short_name,
            away_team_id,
            away_team,
            away_short_name,
            home_score,
            away_score,
            status,
            status_description
          `)
          .in("league_id", leagueChunk)
          .eq("match_date", matchDate)
          .range(from, from + eventPageSize - 1);

        if (error) {
          console.error(
            "Sofa league events load error:",
            error
          );
          break;
        }

        sofaEvents.push(...(data || []));

        if (!data || data.length < eventPageSize) {
          break;
        }

        from += eventPageSize;
      }
    }
  }

  console.log("===== SOFASCORE EVENT MATCHING =====");
  console.log(
    "Potrebne lige:",
    requiredLeagueIds.length
  );
  console.log(
    "Potrebni datumi:",
    requiredDates
  );
  console.log(
    "Učitano SofaScore eventa:",
    sofaEvents.length
  );

  const normalizeTeamForMatch = (value) =>
    normalizeAlias(value)
      .replace(/\b(fc|fk|sc|ac|cf|cd|ca|club|deportivo)\b/g, "")
      .replace(/\b(football|futbol|futbolski|women|w|u19|u20|u21|u23)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const teamNameSimilar = (a, b) => {
    const aa = normalizeTeamForMatch(a);
    const bb = normalizeTeamForMatch(b);

    if (!aa || !bb) return false;

    if (aa === bb) return true;

    // Jedan naziv može sadržati dodatak koji drugi nema:
    // "ML Vitebsk" vs "Vitebsk"
    if (aa.includes(bb) || bb.includes(aa)) {
      return true;
    }

    const aWords = new Set(aa.split(" ").filter(Boolean));
    const bWords = new Set(bb.split(" ").filter(Boolean));

    const common = [...aWords].filter(word => bWords.has(word));

    return common.length >= 1 &&
      Math.min(aWords.size, bWords.size) <= common.length + 1;
  };

  const getEventDate = (row) => {
    const fromDatum = parseFutureDate(row.datum);
    if (fromDatum) return fromDatum;

    const vreme = String(row.vreme || "").trim();
    const m = vreme.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);

    if (m) {
      const [, d, mo, y] = m;
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }

    return null;
  };

  const findSofaEvent = (row) => {
    const leagueId = Number(row.league_id);
    const matchDate = getEventDate(row);

    if (!Number.isFinite(leagueId) || !matchDate) {
      return null;
    }

    const candidates = sofaEvents.filter(event =>
      Number(event.league_id) === leagueId &&
      String(event.match_date || "") === matchDate
    );

    if (!candidates.length) {
      return null;
    }

    const homeId =
      row.home_team_id != null ? Number(row.home_team_id) : null;

    const awayId =
      row.away_team_id != null ? Number(row.away_team_id) : null;

    // =========================================================
    // 1. NAJJAČI SIGNAL:
    // oba postojeća ID-ja moraju da odgovaraju ISTOM eventu.
    // =========================================================
    if (homeId != null && awayId != null) {
      const exact = candidates.filter(event =>
        Number(event.home_team_id) === homeId &&
        Number(event.away_team_id) === awayId
      );

      if (exact.length === 1) {
        return exact[0];
      }
    }

    // =========================================================
    // 2. Jedan ID + naziv drugog tima.
    //
    // VAŽNO:
    // jedan ID SAM više nije dovoljan.
    // =========================================================
    if (homeId != null) {
      const homeAnchored = candidates.filter(event =>
        Number(event.home_team_id) === homeId &&
        teamNameSimilar(row.away, event.away_team)
      );

      if (homeAnchored.length === 1) {
        return homeAnchored[0];
      }
    }

    if (awayId != null) {
      const awayAnchored = candidates.filter(event =>
        Number(event.away_team_id) === awayId &&
        teamNameSimilar(row.home, event.home_team)
      );

      if (awayAnchored.length === 1) {
        return awayAnchored[0];
      }
    }

    // =========================================================
    // 3. Oba naziva moraju odgovarati ISTOM eventu.
    // =========================================================
    const direct = candidates.filter(event =>
      teamNameSimilar(row.home, event.home_team) &&
      teamNameSimilar(row.away, event.away_team)
    );

    if (direct.length === 1) {
      return direct[0];
    }

    // Ako je Mozzart uneo obrnut redosled.
    const reversed = candidates.filter(event =>
      teamNameSimilar(row.home, event.away_team) &&
      teamNameSimilar(row.away, event.home_team)
    );

    if (reversed.length === 1) {
      return reversed[0];
    }

    // =========================================================
    // 4. Nema dovoljno dokaza -> NE diramo postojeće ID-jeve.
    // =========================================================
    return null;
  };

  let mappedLeagues = 0;
  let mappedHomeTeams = 0;
  let mappedAwayTeams = 0;
  let sofaEventOverrides = 0;

  const enrichedRows = baseRows.map(row => {
    const event = findSofaEvent(row);

    let finalHomeTeamId = row.home_team_id;
    let finalAwayTeamId = row.away_team_id;

    if (event) {
      const eventHomeId = event.home_team_id != null
        ? Number(event.home_team_id)
        : null;

      const eventAwayId = event.away_team_id != null
        ? Number(event.away_team_id)
        : null;

      const existingHomeId = row.home_team_id != null
        ? Number(row.home_team_id)
        : null;

      const existingAwayId = row.away_team_id != null
        ? Number(row.away_team_id)
        : null;

      // Direktno poklapanje domaćina.
      if (
        existingHomeId != null &&
        existingHomeId === eventHomeId
      ) {
        finalHomeTeamId = eventHomeId;
        finalAwayTeamId = eventAwayId;
      }

      // Direktno poklapanje gosta.
      else if (
        existingAwayId != null &&
        existingAwayId === eventAwayId
      ) {
        finalHomeTeamId = eventHomeId;
        finalAwayTeamId = eventAwayId;
      }

      // Obrnuto poklapanje - event ima timove u suprotnom smeru.
      else if (
        existingHomeId != null &&
        existingHomeId === eventAwayId
      ) {
        finalHomeTeamId = eventAwayId;
        finalAwayTeamId = eventHomeId;
      }

      else if (
        existingAwayId != null &&
        existingAwayId === eventHomeId
      ) {
        finalHomeTeamId = eventAwayId;
        finalAwayTeamId = eventHomeId;
      }

      // Ako nema postojećeg ID-ja, koristimo nazive
      // samo kada je event pronađen jednoznačno.
      else {
        const direct =
          teamNameSimilar(row.home, event.home_team) &&
          teamNameSimilar(row.away, event.away_team);

        const reversed =
          teamNameSimilar(row.home, event.away_team) &&
          teamNameSimilar(row.away, event.home_team);

        if (direct) {
          finalHomeTeamId = eventHomeId;
          finalAwayTeamId = eventAwayId;
        } else if (reversed) {
          finalHomeTeamId = eventAwayId;
          finalAwayTeamId = eventHomeId;
        }
      }

      if (
        finalHomeTeamId !== row.home_team_id ||
        finalAwayTeamId !== row.away_team_id
      ) {
        sofaEventOverrides++;

        console.log(
          "[SofaScore override]",
          {
            datum: row.datum,
            liga: row.liga,
            home: row.home,
            away: row.away,
            oldHomeId: row.home_team_id,
            oldAwayId: row.away_team_id,
            newHomeId: finalHomeTeamId,
            newAwayId: finalAwayTeamId,
            sofaHome: event.home_team,
            sofaAway: event.away_team,
            sofaHomeId: event.home_team_id,
            sofaAwayId: event.away_team_id,
            round: event.round,
            eventId: event.event_id
          }
        );
      }
    }

    if (row.league_id != null) mappedLeagues++;
    if (finalHomeTeamId != null) mappedHomeTeams++;
    if (finalAwayTeamId != null) mappedAwayTeams++;

    return {
      ...row,
      // Originalni Mozzart naziv ostaje netaknut.
      league_id: row.league_id,
      home_team_id: finalHomeTeamId,
      away_team_id: finalAwayTeamId
    };
  });

  console.log("===== FUTURE MATCH ALIAS MAPPING =====");
  console.log("Ukupno novih mečeva:", enrichedRows.length);
  console.log("Mapirane lige:", mappedLeagues);
  console.log("Mapirani domaćini:", mappedHomeTeams);
  console.log("Mapirani gosti:", mappedAwayTeams);
  console.log(
    "SofaScore event override:",
    sofaEventOverrides
  );

  const unresolved = enrichedRows.filter(
    row =>
      row.league_id == null ||
      row.home_team_id == null ||
      row.away_team_id == null
  );

  console.log(
    "Mečevi sa nepotpunim mapiranjem:",
    unresolved.length
  );

  if (unresolved.length) {
    console.table(
      unresolved.slice(0, 100).map(row => ({
        datum: row.datum,
        liga: row.liga,
        home: row.home,
        away: row.away,
        league_id: row.league_id,
        home_team_id: row.home_team_id,
        away_team_id: row.away_team_id
      }))
    );
  }

  return enrichedRows;
};

  const sortRowsByDateDesc = (rowsToSort) => [...rowsToSort].sort((a,b)=>{
    const dA = (a.datum || '').split('.').reverse().join('-') + ' ' + (a.vreme || '00:00');
    const dB = (b.datum || '').split('.').reverse().join('-') + ' ' + (b.vreme || '00:00');
    return dB.localeCompare(dA);
  });

  // ===== IMPORT =====
const importExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("=== SCREEN3 IMPORT START ===");
    console.log("Fajl:", file.name, "veličina:", file.size);

    const reader = new FileReader();
reader.onload = async (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

let newRows = data.map((r) => ({
  rb: 0,
  datum: normalizeDate(r['Datum'] ?? r['datum'] ?? ''),
  vreme: String(r['Time'] ?? r['Vreme'] ?? ''),
  liga: r['Liga'] ?? '',
  home: r['Home'] ?? '',
  away: r['Away'] ?? '',

  odd1: r['1'] ?? '',
  oddX: r['X'] ?? '',
  odd2: r['2'] ?? '',
  odd2p: r['2+'] ?? '',
  odd3p: r['3+'] ?? '',
  oddGG: r['GG'] ?? '',
  oddNG: r['NG'] ?? '',

  _new:true
}));

console.log("IMPORT: newRows napravljeni:", newRows.length);

    // ===== SUPABASE SYNC ON IMPORT =====
try {
  newRows = await syncLeaguesAndTeams(newRows);
} catch (err) {
  console.error("Supabase sync failed:", err);
}

console.log("IMPORT: syncLeaguesAndTeams završen, redova:", newRows.length);

const allRows = sortRowsByDateDesc([...(futureMatches || []), ...newRows]);
allRows.forEach((r,i)=>r.rb=i+1);

const { data: insertedRows, error } = await supabase
  .from("future_matches")
  .insert(
  newRows.map(({ _new, ...row }) => row)
)
  .select();

console.log("Inserted:", insertedRows);
console.error("Insert error:", error);

setFutureMatches(allRows);
    };
    reader.readAsBinaryString(file);
  };

const checkAliases = async () => {
  setAliasCheckOpen(true);
  setAliasCheckLoading(true);
  setAliasCheckResult(null);

  try {
    // =========================================================
    // 1. Sve različite lige iz future_matches
    // =========================================================

    const leagueNames = [
      ...new Set(
        (futureMatches || [])
          .map(r => String(r.liga || '').trim())
          .filter(Boolean)
      )
    ];

    // =========================================================
    // 2. League aliases - samo Mozzart
    // =========================================================

    const { data: leagueAliases, error: leagueError } = await supabase
      .from("league_aliases")
      .select("*")
      .eq("source", "mozzart");

    if (leagueError) {
      throw leagueError;
    }
      // =========================================================
      // 2b. SofaScore lige
      //
      // Uzimamo samo league_id vrednosti koje nam stvarno trebaju.
      // Ne učitavamo svih 5700+ sofa liga.
      // =========================================================

      const requiredLeagueIds = [
        ...new Set(
          (leagueAliases || [])
            .map(row => Number(row.league_id))
            .filter(Number.isFinite)
        )
      ];

      const sofaLeagueMap = new Map();

      const sofaPageSize = 1000;

      for (let i = 0; i < requiredLeagueIds.length; i += sofaPageSize) {
        const idChunk = requiredLeagueIds.slice(i, i + sofaPageSize);

        const { data: sofaLeagues, error: sofaLeagueError } = await supabase
          .from("sofa_leagues")
          .select("id, name")
          .in("id", idChunk);

        if (sofaLeagueError) {
          throw sofaLeagueError;
        }

        (sofaLeagues || []).forEach(row => {
          if (row.id == null) return;

          sofaLeagueMap.set(Number(row.id), row);
        });
      }

      console.log(
        "===== SOFA LEAGUES LOADED ====="
      );
      console.log(
        "Potrebno league_id:",
        requiredLeagueIds.length
      );
      console.log(
        "Pronađeno sofa liga:",
        sofaLeagueMap.size
      );
    // =========================================================
    // 3. Svi team aliases
    // =========================================================

      let teamAliases = [];
      let teamFrom = 0;
      const teamPageSize = 1000;

      while (true) {
        const { data: teamPage, error: teamError } = await supabase
          .from("team_aliases")
          .select("*")
          .range(teamFrom, teamFrom + teamPageSize - 1);

        if (teamError) {
          throw teamError;
        }

        teamAliases = [...teamAliases, ...(teamPage || [])];

        if (!teamPage || teamPage.length < teamPageSize) {
          break;
        }

        teamFrom += teamPageSize;
      }

      console.log("===== TEAM ALIASES LOADED =====");
      console.log("Ukupno team aliases:", teamAliases.length);
      console.log(
        "Švedska 4 / 10641:",
        teamAliases.filter(row => Number(row.league_id) === 10641)
      );
      // =========================================================
      // 4. Mapa liga:
      //
      // alias -> SVI league_alias zapisi
      //
      // BITNO:
      // Isti Mozzart alias može imati više SofaScore league_id-jeva.
      // Npr. "Češka 3" -> CFL + MSFL.
      // =========================================================

      const leagueAliasMap = new Map();

      (leagueAliases || []).forEach(row => {
        const key = String(row.alias || '').trim();

        if (!key) return;

        if (!leagueAliasMap.has(key)) {
          leagueAliasMap.set(key, []);
        }

        leagueAliasMap.get(key).push(row);
      });

    // =========================================================
    // 5. Mapa timova:
    //
    // league_id + alias -> team_alias zapis
    //
    // BITNO:
    // isti tim može postojati u više liga,
    // ali samo odgovarajući league_id važi.
    // =========================================================

    const teamAliasMap = new Map();

    (teamAliases || []).forEach(row => {
      const alias = String(row.alias || '').trim();

      if (!alias || row.league_id == null) return;

      const key = `${row.league_id}|||${alias}`;

      teamAliasMap.set(key, row);
    });

    // =========================================================
    // 6. Grupisanje mečeva po ligi
    // =========================================================

    const matchesByLeague = {};

    (futureMatches || []).forEach(match => {
      const league = String(match.liga || '').trim();

      if (!league) return;

      if (!matchesByLeague[league]) {
        matchesByLeague[league] = [];
      }

      matchesByLeague[league].push(match);
    });

    // =========================================================
    // 7. Provera liga + timova
    // =========================================================

    const results = [];

      Object.entries(matchesByLeague).forEach(([leagueName, matches]) => {

        const leagueAliasesForName = leagueAliasMap.get(leagueName) || [];

        // -------------------------------------------------------
        // Liga NE postoji u league_aliases
        // -------------------------------------------------------

        if (leagueAliasesForName.length === 0) {

          const teams = [
            ...new Set(
              matches
                .flatMap(m => [m.home, m.away])
                .map(t => String(t || '').trim())
                .filter(Boolean)
            )
          ];

          results.push({
            leagueName,
            leagueId: null,
            leagueIds: [],
            leagueExists: false,

            teams: teams.map(team => ({
              name: team,
              exists: false,
              teamId: null,
              leagueId: null
            })),

            totalMatches: matches.length
          });

          return;
        }

        // -------------------------------------------------------
        // Liga postoji
        //
        // Jedan Mozzart alias može imati više SofaScore liga.
        //
        // Npr:
        // Češka 3 -> 9386 (CFL)
        // Češka 3 -> 9387 (MSFL)
        //
        // Tim je validan ako postoji u BILO KOM od ovih
        // eksplicitno mapiranih league_id-jeva.
        // -------------------------------------------------------

        const leagueIds = [
          ...new Set(
            leagueAliasesForName
              .map(row => Number(row.league_id))
              .filter(Number.isFinite)
          )
        ];

        const sofaLeagueNames = leagueIds
          .map(id => sofaLeagueMap.get(id)?.name)
          .filter(Boolean);

        const teams = [
          ...new Set(
            matches
              .flatMap(m => [m.home, m.away])
              .map(t => String(t || '').trim())
              .filter(Boolean)
          )
        ];

        const teamResults = teams.map(teamName => {

          // -----------------------------------------------------
          // Tražimo tim samo unutar league_id-jeva koji su
          // eksplicitno mapirani na OVU Mozzart ligu.
          // -----------------------------------------------------

          const matchingAliases = leagueIds
            .map(leagueId => {
              const key = `${leagueId}|||${teamName}`;
              const teamAlias = teamAliasMap.get(key);

              if (!teamAlias) return null;

              return {
                teamAlias,
                leagueId
              };
            })
            .filter(Boolean);

          const matched = matchingAliases[0] || null;

          return {
            name: teamName,
            exists: !!matched,
            teamId: matched?.teamAlias?.team_id ?? null,
            leagueId: matched?.leagueId ?? null
          };
        });

        results.push({
          leagueName,

          // Zadržavamo leagueId zbog kompatibilnosti,
          // ali sada je to prvi mapping.
          leagueId: leagueIds[0] ?? null,

          // SVI mappingi za ovu Mozzart ligu.
          leagueIds,

          leagueExists: true,

          // SVI league_alias zapisi.
          leagueAlias: leagueAliasesForName,

          // SVI odgovarajući SofaScore nazivi.
          sofaLeagueNames,

          // Zadržavamo i staro polje za kompatibilnost.
          sofaLeagueName: sofaLeagueNames[0] ?? null,

          teams: teamResults,
          totalMatches: matches.length
        });
      });

    // =========================================================
    // 8. Statistika
    // =========================================================

    const totalLeagues = results.length;

    const missingLeagues = results.filter(
      r => !r.leagueExists
    );

    const leaguesWithMissingTeams = results.filter(
      r =>
        r.leagueExists &&
        r.teams.some(t => !t.exists)
    );

    const completeLeagues = results.filter(
      r =>
        r.leagueExists &&
        r.teams.length > 0 &&
        r.teams.every(t => t.exists)
    );

    const missingTeams = results.reduce(
      (sum, r) =>
        sum + r.teams.filter(t => !t.exists).length,
      0
    );

    const existingTeams = results.reduce(
      (sum, r) =>
        sum + r.teams.filter(t => t.exists).length,
      0
    );

    setAliasCheckResult({
      results,
      totalLeagues,
      missingLeagues,
      leaguesWithMissingTeams,
      completeLeagues,
      missingTeams,
      existingTeams
    });

  } catch (error) {

    console.error("Alias check error:", error);

    setAliasCheckResult({
      error:
        error?.message ||
        "Greška prilikom provere aliasa."
    });

  } finally {
    setAliasCheckLoading(false);
  }
};
  const downloadAliasReport = () => {
    if (!aliasCheckResult || aliasCheckResult.error) return;

    const lines = [];

    lines.push("PROVERA ALIASA");
    lines.push("==============================");
    lines.push(`Ukupno liga: ${aliasCheckResult.totalLeagues}`);
    lines.push(`Kompletno: ${aliasCheckResult.completeLeagues.length}`);
    lines.push(`Nedostaju timovi: ${aliasCheckResult.leaguesWithMissingTeams.length}`);
    lines.push(`Nedostaju lige: ${aliasCheckResult.missingLeagues.length}`);
    lines.push(`Timova OK: ${aliasCheckResult.existingTeams}`);
    lines.push(`Nedostaju timovi: ${aliasCheckResult.missingTeams}`);
    lines.push("");
    lines.push("==============================");
    lines.push("");

    aliasCheckResult.results.forEach(result => {
      const missingTeams = result.teams.filter(team => !team.exists);
      const allOk =
        result.leagueExists &&
        missingTeams.length === 0;

      lines.push(
        `${allOk ? "✓" : result.leagueExists ? "⚠️" : "✗"} ${result.leagueName}`
      );

        if (result.leagueExists) {

          lines.push(
            `league_id: ${result.leagueIds?.join(", ") || result.leagueId}`
          );

          if (result.sofaLeagueNames?.length) {
            lines.push(
              `SofaScore lige: ${result.sofaLeagueNames.join(", ")}`
            );
          }

        } else {
        lines.push("Liga nema mapiranje u league_aliases za source mozzart.");
      }

      result.teams.forEach(team => {
        lines.push(
          `  ${team.exists ? "✓" : "✗"} ${team.name}${
            team.exists ? ` — team_id: ${team.teamId}` : ""
          }`
        );
      });

      lines.push("");
    });

    const content = lines.join("\n");

    const blob = new Blob(
      ["\uFEFF" + content],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `provera-aliasa-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

const deleteRow = async (index) => {

  const row = futureMatches[index];

  const { error } = await supabase
    .from("future_matches")
    .delete()
    .eq("id", row.id);

  if(error){
    console.error("Delete error:", error);
    return;
  }

  setFutureMatches(prev =>
    prev.filter((_,i)=>i !== index)
  );
};

const deleteAllRows = async () => {

  if(!window.confirm("Da li ste sigurni da želite da obrišete sve mečeve?"))
    return;

  const { error } = await supabase
    .from("future_matches")
    .delete()
    .neq("id",0);

  if(error){
    console.error("Delete all error:", error);
    return;
  }

  setFutureMatches([]);
};

  const handleEditStart = (rowIdx, colKey) => setEditing({row: rowIdx, col: colKey});
  const handleEditEnd = () => setEditing({row:null, col:null});
  const toggleLeague = (liga) => {
  setCollapsedLeagues(prev => ({
    ...prev,
    [liga]: !prev[liga]
  }));
};

  const handleCellChange = (rowIdx,key,value) => {
    const copy = [...futureMatches];
    copy[rowIdx] = { ...copy[rowIdx], [key]: value };
    delete copy[rowIdx]._new;
    const sorted = sortRowsByDateDesc(copy);
    sorted.forEach((r,i)=>r.rb=i+1);
    setFutureMatches(sorted);
  };

  // funkcija za prilagodjavanje fonta timova da ne prelazi kolonu
  const getTeamFontSize = (text,maxWidth,base=13,min=7) => {
    let size = base;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${size}px Arial`;
    while(ctx.measureText(text).width > maxWidth && size>min) { size -= 1; ctx.font = `${size}px Arial`; }
    return size;
  };
  const groupedMatches = (futureMatches || []).reduce((acc, match) => {
  const key = match.liga || "Nedefinisana liga";
  if (!acc[key]) acc[key] = [];
  acc[key].push(match);
  return acc;
}, {});

  return (
    <div className="screen3-container">
<div className="screen3-topbar">
  <input
    type="file"
    accept=".xls,.xlsx"
    onChange={importExcel}
  />

  <button onClick={checkAliases}>
    Proveri aliase
  </button>

  <button onClick={deleteAllRows}>
    Obriši sve
  </button>
</div>
      <div
  className="screen3-table-wrapper"
  style={{
    height: containerHeight,
    overflowY: 'auto',
    overflowX: 'auto'
  }}
  ref={tableWrapperRef}
  onScroll={handleScroll}
>
        <div style={{height: startIndex*rowHeight}}></div>


{Object.entries(groupedMatches).map(([liga, matches]) => {
  const isCollapsed = collapsedLeagues[liga];

  return (
    <div key={liga} className="league-block">

      <div
        className="league-header"
        onClick={() => toggleLeague(liga)}
      >
        <span>{isCollapsed ? "▶" : "▼"}</span>

        <span style={{ marginLeft: 8, fontWeight: "bold" }}>
          {liga}
        </span>

        <span style={{ marginLeft: 10, opacity: 0.6 }}>
          ({matches.length})
        </span>
      </div>

{!isCollapsed && (
          <>
           <div
  className="s3-col odds league-odds-header"
  style={{ marginLeft: "140px" }}
>
              <span>1</span>
              <span>X</span>
              <span>2</span>
              <span>2+</span>
              <span>3+</span>
              <span>GG</span>
              <span>NG</span>
            </div>

            {matches.map((r) => {
        const idx = futureMatches.indexOf(r);

        const teamText = `${r.home} - ${r.away}`;
        const teamFontSize = getTeamFontSize(teamText, 140, 13, 7);

        const rowBgColor = idx % 2 === 0 ? "#e6f0fa" : "#ffffff";

return (
  <div
    key={idx}
    className="screen3-row"
    style={{ height: rowHeight, backgroundColor: rowBgColor }}
  >
    <div className="s3-col rb">{r.rb}</div>

    <div className="s3-col info" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: "9px", opacity: 0.8, marginBottom: "3px" }}>
        {r.datum} {r.vreme}
      </div>

      <div style={{ fontWeight: "bold", display: "flex", flexDirection: "column", lineHeight: "15px" }}>
        <span>{r.home}</span>
        <span>{r.away}</span>
      </div>
    </div>

<div className="s3-col odds">
  <span>{r.odd1}</span>
  <span>{r.oddX}</span>
  <span>{r.odd2}</span>
  <span>{r.odd2p}</span>
  <span>{r.odd3p}</span>
  <span>{r.oddGG}</span>
  <span>{r.oddNG}</span>
</div>

    <div className="s3-col delete">
      <button onClick={() => deleteRow(idx)}>x</button>
    </div>
  </div>
);
})}
          </>
        )}

    </div>
  );
})}
        </div>

        {aliasCheckOpen && (
          <div className="alias-check-overlay">

            <div className="alias-check-panel">

              <div className="alias-check-header">
                <h2>Provera aliasa</h2>

                <button
                  className="alias-check-close"
                  onClick={() => setAliasCheckOpen(false)}
                >
                  ×
                </button>
              </div>

              {aliasCheckLoading && (
                <div className="alias-check-loading">
                  Proveravam lige i timove...
                </div>
              )}

              {!aliasCheckLoading &&
                aliasCheckResult?.error && (
                  <div className="alias-check-error">
                    {aliasCheckResult.error}
                  </div>
                )}

              {!aliasCheckLoading &&
                aliasCheckResult &&
                !aliasCheckResult.error && (
                  <>

                    <div className="alias-check-summary">

                      <div className="alias-summary-box">
                        <strong>
                          {aliasCheckResult.totalLeagues}
                        </strong>
                        <span>Ukupno liga</span>
                      </div>

                      <div className="alias-summary-box">
                        <strong>
                          {aliasCheckResult.completeLeagues.length}
                        </strong>
                        <span>Kompletno</span>
                      </div>

                      <div className="alias-summary-box warning">
                        <strong>
                          {aliasCheckResult.leaguesWithMissingTeams.length}
                        </strong>
                        <span>Nedostaju timovi</span>
                      </div>

                      <div className="alias-summary-box danger">
                        <strong>
                          {aliasCheckResult.missingLeagues.length}
                        </strong>
                        <span>Nedostaju lige</span>
                      </div>

                      <div className="alias-summary-box">
                        <strong>
                          {aliasCheckResult.existingTeams}
                        </strong>
                        <span>Timova OK</span>
                      </div>

                      <div className="alias-summary-box danger">
                        <strong>
                          {aliasCheckResult.missingTeams}
                        </strong>
                        <span>Nedostaju timovi</span>
                      </div>

                    </div>

                    <div className="alias-check-results">

                      {aliasCheckResult.results.map((result) => {

                        const missingTeams =
                          result.teams.filter(
                            team => !team.exists
                          );

                        const allOk =
                          result.leagueExists &&
                          missingTeams.length === 0;

                        return (
                          <div
                            key={result.leagueName}
                            className={`alias-league-result ${
                              allOk
                                ? "alias-ok"
                                : result.leagueExists
                                  ? "alias-warning"
                                  : "alias-danger"
                            }`}
                          >

                            <div className="alias-league-title">

                              <span className="alias-status-icon">
                                {allOk
                                  ? "✅"
                                  : result.leagueExists
                                    ? "⚠️"
                                    : "❌"}
                              </span>

                                <strong>
                                  {result.leagueName}
                                </strong>

                                  {result.leagueExists && (
                                    <>
                                      {result.sofaLeagueNames?.length > 0 && (
                                        <span
                                          className="alias-league-id"
                                          style={{ marginLeft: 10 }}
                                        >
                                          {result.sofaLeagueNames.join(", ")}
                                        </span>
                                      )}

                                      <span
                                        className="alias-league-id"
                                        style={{ marginLeft: 10 }}
                                      >
                                        league_id:{" "}
                                        {result.leagueIds?.join(", ") ||
                                          result.leagueId}
                                      </span>
                                    </>
                                  )}

                            </div>

                            {!result.leagueExists && (
                              <div className="alias-missing-league">
                                ❌ Liga nema mapiranje u
                                <strong> league_aliases </strong>
                                za source <strong>mozzart</strong>.
                              </div>
                            )}

                            <div className="alias-team-list">

                              {result.teams.map(team => (
                                <div
                                  key={team.name}
                                  className={
                                    team.exists
                                      ? "alias-team-ok"
                                      : "alias-team-missing"
                                  }
                                >

                                  <span>
                                    {team.exists ? "✓" : "✗"}
                                  </span>

                                  <span>
                                    {team.name}
                                  </span>

                                    {team.exists && (
                                      <span className="alias-team-id">
                                        team_id: {team.teamId}
                                        {team.leagueId != null &&
                                          ` — league_id: ${team.leagueId}`}
                                      </span>
                                    )}

                                </div>
                              ))}

                            </div>

                            {allOk && (
                              <div className="alias-all-ok">
                                Liga i svi timovi imaju odgovarajuće
                                mapiranje za ovu ligu.
                              </div>
                            )}

                          </div>
                        );
                      })}

                    </div>

                  </>
                )}

              {!aliasCheckLoading && (
                <div className="alias-check-footer">

                  <button onClick={checkAliases}>
                    Ponovi proveru
                  </button>

                    <button onClick={downloadAliasReport}>
                      Preuzmi izveštaj
                    </button>

                  <button
                    onClick={() => setAliasCheckOpen(false)}
                  >
                    Zatvori
                  </button>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    );
  }
