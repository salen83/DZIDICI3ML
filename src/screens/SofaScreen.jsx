import React, { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import "./SofaScreen.css";
import { useSofa } from "../SofaContext";
import { supabase } from "../supabase";
import countryAliasToISO from "../utils/countryAliasToISO";

// ================= SAFE ROW =================
const safeRow = (r) => ({
id: r.id ?? `${r.raw_home}-${r.raw_away}-${r.match_date}-${r.match_time}`,
datum: r.match_date || "",
vreme: r.match_time || "",
liga: r.raw_league || "",
home: r.raw_home || "",
away: r.raw_away || "",
  ht: r.ht || "",
  sh: r.sh || "",
  ft: r.ft || "",
  extratime: r.extratime || "",
  penalties: r.penalties || "",
country: r.country_name || "",
country_id: r.country_id || null,
country_iso: r.country_iso || "",
source: r.source || "",
});

// ================= COMPONENT =================
export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();

  const [logs, setLogs] = useState([]);
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);
const [scrollTop, setScrollTop] = useState(0);
const [collapsedLeagues, setCollapsedLeagues] = useState({});

const rowHeight = 45;
const containerHeight = 600;
const buffer = 10;

const total = sofaRows.length;
const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
const endIndex = Math.min(total, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);

const visibleRows = sofaRows.slice(startIndex, endIndex);

const handleScroll = (e) => {
  setScrollTop(e.target.scrollTop);
};

  const log = (m) => {
    console.log("[SOFA]", m);
    setLogs((p) => [...p.slice(-80), m]);
  };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let countryNameToId = {};

const normalizeMatchPart = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};
// ================= IMPORT =================

const handleImport = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

const newcastleDebug = json.find(
  r =>
    String(r.Home || "").trim() === "Newcastle United WFC" ||
    String(r.Away || "").trim() === "Newcastle United WFC"
);

console.log("=== NEWCASTLE DEBUG ===", newcastleDebug);

console.log("=== NEWCASTLE TEAM IDS ===", {
  home: newcastleDebug?.["Home Team ID"],
  away: newcastleDebug?.["Away Team ID"],
  homeSnake: newcastleDebug?.home_team_id,
  awaySnake: newcastleDebug?.away_team_id,
  homeCamel: newcastleDebug?.homeTeamId,
  awayCamel: newcastleDebug?.awayTeamId,
});

    log(`RAW rows: ${json.length}`);

console.log("SOFA FIRST ROW:", json[0]);
console.log("SOFA COLUMNS:", Object.keys(json[0] || {}));

console.log(
  "SOFA AWAY TEAM ID TEST:",
  json.slice(0, 10).map((r, i) => ({
    row: i,
    awayTeamIdExact: r["Away Team ID"],
    away_team_id: r.away_team_id,
    AwayTeamID: r.AwayTeamID,
    awayTeamId: r.awayTeamId,
  }))
);

    // =========================================
    // 1. UCITAJ SVE DOZVOLJENE LEAGUE ID
    // =========================================
      let leagueAliases = [];
      let leagueAliasFrom = 0;
      const leagueAliasPageSize = 1000;

      while (true) {
        const { data: leagueAliasPage, error: leagueAliasError } =
          await supabase
            .from("league_aliases")
            .select("league_id")
            .range(
              leagueAliasFrom,
              leagueAliasFrom + leagueAliasPageSize - 1
            );

        if (leagueAliasError) {
          throw new Error(
            "GRESKA pri ucitavanju league_aliases: " +
            leagueAliasError.message
          );
        }

        if (!leagueAliasPage || leagueAliasPage.length === 0) {
          break;
        }

        leagueAliases = [...leagueAliases, ...leagueAliasPage];

        if (leagueAliasPage.length < leagueAliasPageSize) {
          break;
        }

        leagueAliasFrom += leagueAliasPageSize;
      }

      // Set = jedinstveni league_id
      // Ako isti league_id ima vise aliasa,
      // ovde se pojavljuje samo jednom.
      const allowedLeagueIds = new Set(
        (leagueAliases || [])
          .map(x => Number(x.league_id))
          .filter(Number.isFinite)
      );

      log(`league_aliases rows: ${leagueAliases.length}`);
      log(`Allowed unique League IDs: ${allowedLeagueIds.size}`);

    // =========================================
    // 2. GLOBAL DEDUPE
    // =========================================

    const map = new Map();

    let filteredOut = 0;
    let blockedOut = 0;
    let accepted = 0;

    for (const r of json) {

      // =======================================
      // LEAGUE ID IZ SOFASCORE EXCELA
      // =======================================

      const leagueIdRaw =
        r["League ID"] ??
        r.league_id ??
        r.LeagueID ??
        r.leagueId ??
        null;

      const leagueId = Number(leagueIdRaw);

      // Ako nema validan League ID -> odbaci
      if (!Number.isFinite(leagueId)) {
        filteredOut++;
        continue;
      }

      // =======================================
      // FILTER PREKO league_aliases
      // =======================================

      if (!allowedLeagueIds.has(leagueId)) {
        filteredOut++;
        continue;
      }

      // =======================================
      // OSTALI PODACI
      // =======================================

      const league =
        r.Liga ||
        r.league ||
        r.League ||
        r["League Name"] ||
        "";

      const home =
        r.Domacin ||
        r.home ||
        r.Home ||
        r["Home team"] ||
        r["Home Team"] ||
        "";

      const away =
        r.Gost ||
        r.away ||
        r.Away ||
        r["Away team"] ||
        r["Away Team"] ||
        "";

      const date =
        r.Datum ||
        r.date ||
        r.Date ||
        r.match_date ||
        "";

      const time =
        r.Vreme ||
        r.time ||
        r.Time ||
        r.match_time ||
        "";

      // =======================================
      // COUNTRY ID
      // =======================================

      const countryIdRaw =
        r["Country ID"] ??
        r.country_id ??
        r.CountryID ??
        r.countryId ??
        null;

      const countryId = Number(countryIdRaw);

      // =======================================
      // TEAM ID
      // =======================================

      const homeTeamIdRaw =
        r["Home Team ID"] ??
        r.home_team_id ??
        r.HomeTeamID ??
        r.homeTeamId ??
        null;

      const awayTeamIdRaw =
        r["Away Team ID"] ??
        r.away_team_id ??
        r.AwayTeamID ??
        r.awayTeamId ??
        null;

      const homeTeamId = Number(homeTeamIdRaw);
      const awayTeamId = Number(awayTeamIdRaw);

        // =======================================
        // DEBUG PROBLEMATICNIH TIMOVA IZ EXCELA
        // =======================================
        const problematicTeams = [
          "Persik Kediri",
          "FC Jurong",
          "Burapha United",
          "Pattaya United",
          "Hải Phòng",
          "Hưng Yên FC",
          "Newcastle United WFC",
          "Inter",
          "Melaka FC",
          "Phnom Penh Crown",
          "Pfk Aral",
          "Bukhoro Davlat Universiteti",
          "Respublika Football Academy",
          "Metallurg Bekabad",
          "PFC Shurtan",
          "FC Kattaqorgon",
          "PFC Terdu",
          "FC Yaypan Fergana",
          "Pakhtakor Tashkent II",
          "Lochin",
          "Argentinos Juniors",
          "Platense",
          "FK Smederevo 1924",
          "FK Bor 1919",
          "CE Europa",
          "SE AEM",
          "Bushrod Queens",
          "Determine Girls",
          "Rayon Sports FC",
          "Mathare United",
          "CD Alba Fundación Femenino",
          "Levante UD",
          "Logroño United",
          "Cacereño Femenino",
          "Alhama Club de Fútbol",
          "Villarreal CF",
          "El Porvenir",
          "Estudiantes de La Plata"
        ];

        if (
          problematicTeams.includes(String(home).trim()) ||
          problematicTeams.includes(String(away).trim())
        ) {
          console.log("!!! PROBLEM TEAM IZ EXCELA !!!", {
            home,
            away,
            league_id: leagueId,
            homeTeamIdRaw,
            awayTeamIdRaw,
            homeTeamIdColumn: r["Home Team ID"],
            awayTeamIdColumn: r["Away Team ID"],
            home_team_id: r.home_team_id,
            away_team_id: r.away_team_id,
            HomeTeamID: r.HomeTeamID,
            AwayTeamID: r.AwayTeamID,
            homeTeamId: r.homeTeamId,
            awayTeamId: r.awayTeamId,
            date,
            time,
            fullRow: r
          });
        }

if (!Number.isFinite(homeTeamId) || !Number.isFinite(awayTeamId)) {
  console.log("SOFA INVALID TEAM ID:", {
    league_id: leagueId,
    home: home,
    away: away,
    homeTeamIdRaw,
    awayTeamIdRaw,
    homeTeamId,
    awayTeamId,
    date,
    time,
  });
}
      // =======================================
      // COUNTRY NAME
      // =======================================

      const countryRaw =
        (
          r.Country ||
          r.country ||
          r["Country Name"] ||
          ""
        ).trim();

// =======================================
// UNIQUE MATCH KEY
// =======================================
//
// NE koristimo team_id kao deo kljuca.
//
// Razlog:
// Sofa Excel moze imati isti mec vise puta,
// a kod nemapiranih timova team_id je NULL.
//
// Prirodni kljuc utakmice je:
// league + home naziv + away naziv + datum + vreme.
//

const normalizeMatchPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const key = [
  leagueId,
  normalizeMatchPart(home),
  normalizeMatchPart(away),
  date,
  time
].join("|");

// =======================================
// MERGE DUPLICATA
// =======================================
//
// Ako isti mec postoji vise puta u Excelu,
// NE odbacujemo drugi red.
//
// Umesto toga spajamo rezultate.
// Tako red bez rezultata + red sa rezultatom
// postaju jedan kompletan mec.
//

const existing = map.get(key);

if (existing) {
  const resultFields = [
    "ht",
    "sh",
    "ft",
    "extratime",
    "penalties"
  ];

  for (const field of resultFields) {
    if (
      (!existing[field] || existing[field] === "") &&
      r[
        field === "ht" ? "1H" :
        field === "sh" ? "2H" :
        field === "ft" ? "90 MIN" :
        field === "extratime" ? "Produzeci" :
        "Penali"
      ]
    ) {
      existing[field] =
        r[
          field === "ht" ? "1H" :
          field === "sh" ? "2H" :
          field === "ft" ? "90 MIN" :
          field === "extratime" ? "Produzeci" :
          "Penali"
        ];
    }
  }

  // Ako prvi red nije imao ID,
  // a drugi ga ima, uzmi ID iz drugog reda.
  if (
    !Number.isFinite(existing.home_team_id) &&
    Number.isFinite(homeTeamId)
  ) {
    existing.home_team_id = homeTeamId;
  }

  if (
    !Number.isFinite(existing.away_team_id) &&
    Number.isFinite(awayTeamId)
  ) {
    existing.away_team_id = awayTeamId;
  }

  continue;
}

      map.set(key, {
        source: "sofa",

        match_date: date,
        match_time: time,

        raw_home: home,
        raw_away: away,
        raw_league: league,

ht:
  r["1H"] ??
  r.ht ??
  "",

sh:
  r["2H"] ??
  r.sh ??
  "",

ft:
  r["90 MIN"] ??
  r.ft ??
  "",

extratime:
  r["Produzeci"] ??
  r.et ??
  "",

penalties:
  r["Penali"] ??
  r.pen ??
  "",

        // =====================================
        // ID-JEVI IZ SOFASCORE EXCELA
        // =====================================

        country_id:
          Number.isFinite(countryId)
            ? countryId
            : null,

        country_iso:
          countryAliasToISO(countryRaw) || "",

        home_team_id:
          Number.isFinite(homeTeamId)
            ? homeTeamId
            : null,

        away_team_id:
          Number.isFinite(awayTeamId)
            ? awayTeamId
            : null,

        league_id: leagueId
      });

      accepted++;
    }

    const rows = Array.from(map.values());

    log(`FILTERED OUT: ${filteredOut}`);
    log(`BLOCKED: ${blockedOut}`);
    log(`ACCEPTED: ${accepted}`);
    log(`UNIQUE rows: ${rows.length}`);

console.log(
  "SOFA ROWS TEAM ID TEST:",
  rows
    .filter(r =>
      Number.isFinite(r.home_team_id) ||
      Number.isFinite(r.away_team_id)
    )
    .map((r, i) => ({
      row: i,
      league_id: r.league_id,
      home_team_id: r.home_team_id,
      away_team_id: r.away_team_id,
      raw_home: r.raw_home,
      raw_away: r.raw_away,
      match_date: r.match_date,
      match_time: r.match_time
    }))
);
// =========================================
// 3. UPLOAD U CHUNK-OVIMA
// =========================================
//
// Pre upisa ucitavamo postojece Sofa meceve
// i trazimo ih po prirodnom kljucu:
//
// source + league_id + raw_home + raw_away
// + match_date + match_time
//
// Ovo je posebno vazno za nemapirane timove
// gde su home_team_id / away_team_id NULL.
//

const { data: existingSofaRows, error: existingSofaError } =
  await supabase
    .from("matches")
    .select(`
      id,
      source,
      league_id,
      raw_home,
      raw_away,
      match_date,
      match_time,
      home_team_id,
      away_team_id,
      ht,
      sh,
      ft,
      extratime,
      penalties
    `)
    .eq("source", "sofa");

if (existingSofaError) {
  throw new Error(
    "GRESKA pri ucitavanju postojecih Sofa meceva: " +
    existingSofaError.message
  );
}

// =========================================
// MAPA POSTOJECIH MECEVA
// =========================================

const existingMap = new Map();

for (const r of existingSofaRows || []) {
  const existingKey = [
    Number(r.league_id),
    normalizeMatchPart(r.raw_home),
    normalizeMatchPart(r.raw_away),
    r.match_date || "",
    r.match_time || ""
  ].join("|");

  existingMap.set(existingKey, r);
}

log(`Existing Sofa matches: ${existingMap.size}`);

// =========================================
// PRIPREMA NOVIH REDOVA
// =========================================

const rowsToUpsert = [];

for (const row of rows) {

  const rowKey = [
    Number(row.league_id),
    normalizeMatchPart(row.raw_home),
    normalizeMatchPart(row.raw_away),
    row.match_date || "",
    row.match_time || ""
  ].join("|");

  const existing = existingMap.get(rowKey);

  if (existing) {

    // =====================================
    // POSTOJECA UTAKMICA -> UPDATE
    // =====================================

    rowsToUpsert.push({
      ...row,
      id: existing.id
    });

  } else {

    // =====================================
    // NOVA UTAKMICA -> INSERT
    // =====================================

    rowsToUpsert.push({
      ...row
    });
  }
}

// =========================================
// CHUNK UPLOAD
// =========================================

const CHUNK = 100;

for (let i = 0; i < rowsToUpsert.length; i += CHUNK) {

  const batch = rowsToUpsert.slice(i, i + CHUNK);

console.log("=== BATCH DEBUG ===", {
  from: i + 1,
  to: i + batch.length,
  count: batch.length,
  atalanta: batch.find(
    r =>
      r.raw_home === "Cittadella" &&
      r.raw_away === "Atalanta U23"
  )
});

  console.log(
    "SOFA BATCH:",
    batch.map(r => ({
      id: r.id || null,
      league_id: r.league_id,
      home_team_id: r.home_team_id,
      away_team_id: r.away_team_id,
      raw_home: r.raw_home,
      raw_away: r.raw_away,
      ht: r.ht,
      sh: r.sh,
      ft: r.ft
    }))
  );

  log(
    `Uploading ${i + 1}-${i + batch.length}`
  );

  let retry = 0;
  let success = false;

  while (!success && retry < 3) {

console.log("!!! PROVERA FINAL BATCH !!!", {
  from: i + 1,
  to: i + batch.length,
  count: batch.length,
  atalanta: batch.find(
    r =>
      r.raw_away === "Atalanta U23" ||
      r.raw_home === "Atalanta U23"
  )
});

console.log("!!! SALJEM SUPABASE !!!", batch.find(
  r =>
    r.raw_away === "Atalanta U23" ||
    r.raw_home === "Atalanta U23"
));

console.table(
  batch.map(r => ({
    id: r.id,
    league_id: r.league_id,
    raw_home: r.raw_home,
    raw_away: r.raw_away,
    home_team_id: r.home_team_id,
    away_team_id: r.away_team_id,
    match_date: r.match_date,
    match_time: r.match_time
  }))
);
    const { error } = await supabase
      .from("matches")
      .upsert(batch, {
        onConflict: "id"
      });

    if (!error) {
console.log("!!! UPSERT PROSAO !!!", {
  error,
  atalanta: batch.find(
    r =>
      r.raw_away === "Atalanta U23" ||
      r.raw_home === "Atalanta U23"
  )
});

const debugRow = batch.find(
  r =>
    r.raw_home === "Cittadella" &&
    r.raw_away === "Atalanta U23"
);

if (debugRow?.id) {
  const { data: verifyRow, error: verifyError } =
    await supabase
      .from("matches")
      .select(`
        id,
        league_id,
        home_team_id,
        away_team_id,
        raw_home,
        raw_away,
        match_date,
        match_time
      `)
      .eq("id", debugRow.id)
      .single();

  console.log("=== ATALANTA SUPABASE VERIFY ===", {
    sent: {
      id: debugRow.id,
      league_id: debugRow.league_id,
      home_team_id: debugRow.home_team_id,
      away_team_id: debugRow.away_team_id,
      raw_home: debugRow.raw_home,
      raw_away: debugRow.raw_away,
      match_date: debugRow.match_date,
      match_time: debugRow.match_time
    },
    received: verifyRow,
    error: verifyError
  });
}

success = true;

    } else {

      console.log(
        "BATCH ERROR:",
        error
      );

      retry++;

      log(`Retry ${retry}...`);

      await sleep(800 * retry);
    }
  }

  if (!success) {
    throw new Error(
      "Batch failed after retries"
    );
  }
}

log(
  `DONE: ${rowsToUpsert.length} matches imported`
);

  } catch (err) {

    console.error("SOFA IMPORT ERROR:", err);

    log(
      "IMPORT ERROR: " +
      (err?.message || String(err))
    );

  } finally {

    // Omogucava ponovni import istog fajla
    e.target.value = "";
  }
};

  // ================= LOAD =================
useEffect(() => {
  let alive = true;

(async () => {
  try {
    let allData = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("source", "sofa")
        .range(from, from + pageSize - 1);

      if (error) {
        console.log("LOAD ERROR:", error);
        break;
      }

      if (!data || data.length === 0) break;

      allData = [...allData, ...data];

      if (data.length < pageSize) break;

      from += pageSize;
    }

    if (alive) {
const { data: countriesData, error } = await supabase
  .from("sofa_countries")
  .select("id,name");
const countryMap = {};
countriesData.forEach(c => {
  countryMap[c.id] = c.name;
});

const normalized = allData.map(r => ({
  ...safeRow(r),
  country: countryMap[r.country_id] || "",
  country_iso: r.country_iso || ""
}));

setSofaRows(normalized);
      log("Loaded from DB: " + normalized.length);
    }

  } catch (e) {
    console.log(e);
  }
})();
}, []);

// ================= LEAGUE GROUPING =================

const toggleLeague = (liga) => {
  setCollapsedLeagues(prev => ({
    ...prev,
    [liga]: !prev[liga]
  }));
};


const groupedRows = sofaRows.reduce((acc, row) => {

  const key = `${row.liga}|${row.country_id}`;

  if (!acc[key]) {
    acc[key] = {
      liga: row.liga || "Nedefinisana liga",
      country: row.country || "",
      country_id: row.country_id,
      matches: []
    };
  }

  acc[key].matches.push(row);

  return acc;

}, {});
  // ================= UPDATE =================
  const updateCell = (index, key, value) => {
    const copy = [...sofaRows];
    copy[index] = { ...copy[index], [key]: value };

setSofaRows(copy);
// saveSofaRows(copy); // disabled (Firestore removed)
  };

  // ================= DELETE =================
  const deleteRow = (index) => {
    const copy = [...sofaRows];
    copy.splice(index, 1);

setSofaRows(copy);
// saveSofaRows(copy); // disabled (Firestore removed)
  };

  if (!Array.isArray(sofaRows)) return <div>Loading...</div>;

  return (
    <div className="screen1-container">

      <button onClick={onClose}>⬅ Exit</button>
      <button onClick={() => fileInputRef.current.click()}>
  📥 Import Excel
</button>

<input
  type="file"
  accept=".xlsx, .xls"
  ref={fileInputRef}
  style={{ display: "none" }}
  onChange={handleImport}
/>
     <div
  className="sofa-table-wrapper"
  style={{ height: containerHeight, overflowY: "auto" }}
  ref={tableRef}
  onScroll={handleScroll}
>

        {/* HEADER */}
        <div className="sofa-row header">
          <div className="sofa-col rb">#</div>
          <div className="sofa-col info">Info</div>
          <div className="sofa-col results">1H</div>
          <div className="sofa-col results">2H</div>
          <div className="sofa-col results">FT</div>
          <div className="sofa-col results">ET</div>
          <div className="sofa-col results">Pen</div>
          <div className="sofa-col delete"></div>
        </div>
<div style={{ height: startIndex * rowHeight }} />

{/* GROUPED ROWS */}

{Object.entries(groupedRows).map(([key, group]) => {

const collapsed = collapsedLeagues[key];

return (

<div key={key}>

<div
className="sofa-league-header"
onClick={() => toggleLeague(key)}
>

<span>
{collapsed ? "▶" : "▼"}
</span>

<span style={{marginLeft:8,fontWeight:"bold"}}>
{group.liga}
</span>

<span style={{marginLeft:12}}>
{group.country} ({group.country_id})
</span>

<span style={{marginLeft:8,opacity:0.6}}>
({group.matches.length})
</span>

</div>

{!collapsed && group.matches.map((r,index)=>{

return (

<div
  key={`${key}-${r.id}-${index}`}
  className="sofa-row"
>


<div className="sofa-col rb">
{index+1}
</div>

<div
className="sofa-col info"
style={{
display:"flex",
flexDirection:"column",
justifyContent:"center"
}}
>

<div style={{
fontSize:"9px",
opacity:0.8,
marginBottom:"3px"
}}>
{r.datum} {r.vreme}
</div>

<div style={{
fontWeight:"bold",
display:"flex",
flexDirection:"column",
lineHeight:"15px"
}}>
<span>{r.home}</span>
<span>{r.away}</span>
</div>

</div>

<div className="sofa-col results">
{r.ht}
</div>

<div className="sofa-col results">
{r.sh}
</div>

<div className="sofa-col results">
{r.ft}
</div>

<div className="sofa-col results">
{r.extratime}
</div>

<div className="sofa-col results">
{r.penalties}
</div>


<div className="sofa-col delete">

<button onClick={()=>deleteRow(index)}>
x
</button>

</div>


</div>

)


})}


</div>

)

})}

      </div>
<div style={{ height: (total - endIndex) * rowHeight }} />

      {/* LOGS */}
      <div style={{ fontSize: 11, maxHeight: 120, overflow: "auto", marginTop: 10 }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>

    </div>
  );
}
