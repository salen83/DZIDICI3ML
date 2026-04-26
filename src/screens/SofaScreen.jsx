import React, { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import "./SofaScreen.css";
import { useSofa } from "../SofaContext";
import { supabase } from "../supabase";

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
  source: r.source || "",
});

// ================= COMPONENT =================
export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();

  const [logs, setLogs] = useState([]);
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);
const [scrollTop, setScrollTop] = useState(0);

const rowHeight = 32;
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
// ================= IMPORT =================
const handleImport = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    console.log(json[0]);

// ================= NORMALIZACIJA =================

// 1. UNIQUE liste
const teamsSet = new Set();
const leaguesSet = new Set();
const countriesSet = new Set();

json.forEach((r) => {
  if (r.Domacin) teamsSet.add(r.Domacin);
  if (r.Gost) teamsSet.add(r.Gost);
  if (r.Liga) leaguesSet.add(r.Liga);
  if (r.Country) countriesSet.add(r.Country);
});

// 2. INSERT (ignore duplicates)
await supabase.from("teams").upsert(
  Array.from(teamsSet).map((name) => ({
    name,
    source: "sofa"
  })),
  { onConflict: "name", ignoreDuplicates: true }
);

await supabase.from("leagues").upsert(
  Array.from(leaguesSet).map((name) => ({ name })),
  { onConflict: "name" }
);

await supabase.from("countries").upsert(
  Array.from(countriesSet).map((name) => ({ name })),
  { onConflict: "name" }
);

// 3. UZMI ID MAP
const { data: teamsData } = await supabase.from("teams").select("id,name");
const { data: leaguesData } = await supabase.from("leagues").select("id,name");
const { data: countriesData } = await supabase.from("countries").select("id,name");

const teamMap = {};
const leagueMap = {};
const countryMap = {};

teamsData.forEach(t => teamMap[t.name] = t.id);
leaguesData.forEach(l => leagueMap[l.name] = l.id);
countriesData.forEach(c => countryMap[c.name] = c.id);

// 4. MATCHES
const normalized = json.map((r) => ({
  id: `${r.Domacin}-${r.Gost}-${r.Datum}-${r.Vreme}`,
  datum: r.Datum || "",
  vreme: r.Vreme || "",

  home_id: teamMap[r.Domacin] || null,
  away_id: teamMap[r.Gost] || null,
  league_id: leagueMap[r.Liga] || null,
  country_id: countryMap[r.Country] || null,

  // za UI
  liga: r.Liga || "",
  home: r.Domacin || "",
  away: r.Gost || "",
  country: r.Country || "",

  ht: r["Prvo poluvreme"] || "",
  sh: r["Drugo poluvreme"] || "",
  ft: r.Ft || "",
  extratime: r.Produzeci || "",
  penalties: r.Penali || "",
}));

setSofaRows(normalized);
log("IMPORT: " + normalized.length);

// 5. INSERT MATCHES
const { error } = await supabase.from("matches").upsert(
  normalized.map(r => ({
    source: "sofa",

    match_date: r.datum,
    match_time: r.vreme,

    raw_home: r.home,
    raw_away: r.away,
    raw_league: r.liga,
    country_id: r.country_id,

    home_team_id: r.home_id,
    away_team_id: r.away_id,
    league_id: r.league_id,

    ht: r.ht,
    sh: r.sh,
    ft: r.ft,
    extratime: r.extratime,
    penalties: r.penalties
  }))
);

if (error) console.log("INSERT ERROR:", error);

  } catch (err) {
    log("IMPORT ERROR: " + err.message);
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
const { data: countriesData } = await supabase
  .from("countries")
  .select("id,name");

const countryMap = {};
countriesData.forEach(c => {
  countryMap[c.id] = c.name;
});

const normalized = allData.map(r => ({
  ...safeRow(r),
  country: countryMap[r.country_id] || ""
}));

setSofaRows(normalized);
      log("Loaded from DB: " + normalized.length);
    }

  } catch (e) {
    console.log(e);
  }
})();
}, []);
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
          <div className="sofa-col country">Country</div>
          <div className="sofa-col source">Source</div>
          <div className="sofa-col teams">Home-Away</div>
          <div className="sofa-col results">1H</div>
          <div className="sofa-col results">2H</div>
          <div className="sofa-col results">FT</div>
          <div className="sofa-col results">ET</div>
          <div className="sofa-col results">Pen</div>
          <div className="sofa-col delete"></div>
        </div>
<div style={{ height: startIndex * rowHeight }} />

        {/* ROWS */}
        {visibleRows.map((r, i) => {
  const index = startIndex + i;
  return (
          <div key={`${r.id}-${index}`} className="sofa-row">

            {/* RB */}
            <div className="sofa-col rb">
              {index + 1}
            </div>

            {/* INFO */}
            <div className="sofa-col info">
              <div className="info-top">
                <span>{r.datum}</span>
                <span>{r.vreme}</span>
              </div>
              <div className="info-bottom">
              <span className="liga-cell" title={r.liga}>
  {r.liga}
</span>
              </div>
            </div>
           <div className="sofa-col source">
  {r.source}
</div>

            {/* COUNTRY */}
            <div className="sofa-col country">
              <input value={r.country} onChange={(e)=>updateCell(index,"country",e.target.value)} />
            </div>

            {/* TEAMS */}
            <div className="sofa-col teams">
              <input value={r.home} onChange={(e)=>updateCell(index,"home",e.target.value)} />
              {" - "}
              <input value={r.away} onChange={(e)=>updateCell(index,"away",e.target.value)} />
            </div>

            {/* RESULTS */}
            <div className="sofa-col results">
              <input value={r.ht} onChange={(e)=>updateCell(index,"ht",e.target.value)} />
            </div>

            <div className="sofa-col results">
              <input value={r.sh} onChange={(e)=>updateCell(index,"sh",e.target.value)} />
            </div>

            <div className="sofa-col results">
              <input value={r.ft} onChange={(e)=>updateCell(index,"ft",e.target.value)} />
            </div>

            <div className="sofa-col results">
              <input value={r.extratime} onChange={(e)=>updateCell(index,"extratime",e.target.value)} />
            </div>

            <div className="sofa-col results">
              <input value={r.penalties} onChange={(e)=>updateCell(index,"penalties",e.target.value)} />
            </div>

            <div className="sofa-col delete">
              <button onClick={()=>deleteRow(index)}>x</button>
            </div>

          </div>
);
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
