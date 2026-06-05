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
  country_iso: r.country_iso || "",
  source: r.source || "",
});

// ================= COMPONENT =================
export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();

  const [logs, setLogs] = useState([]);
  const [newLeague, setNewLeague] = useState("");
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);
const [scrollTop, setScrollTop] = useState(0);
 const [blockedLeagues, setBlockedLeagues] = useState([]);

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

useEffect(() => {
   const blocked = JSON.parse(
localStorage.getItem("blockedSofaLeagues") || "[]"
    );
   setBlockedLeagues(blocked);
  }, []);
  const log = (m) => {
    console.log("[SOFA]", m);
    setLogs((p) => [...p.slice(-80), m]);
  };
// ================= DODAJ ZENSKU LIGU =================
  const addWomensLeague = async () => {
    if (!newLeague.trim()) return;

    const { error } = await supabase
      .from("womens_leagues")
      .insert([{ league_name: newLeague.trim() }]);

    if (error) {
      log("GRESKA: " + error.message);
    } else {
      log("Dodata liga: " + newLeague);
      setNewLeague("");
    }
  };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let countryNameToId = {};
// ================= IMPORT =================

const handleImport = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    log(`RAW rows: ${json.length}`);

const { data: countriesData } = await supabase
  .from("countries")
  .select("id,name");

countryNameToId = {};

countriesData?.forEach(c => {
  countryNameToId[c.name.trim()] = c.id;
});
    // =========================
    // 1. GLOBAL DEDUPE (KRITIČNO)
    // =========================
    const map = new Map();

    for (const r of json) {
if (blockedLeagues.includes(r.league)) continue;
const countryRaw = (r.country || "").trim();
const key = `${(r.home||"").trim()}-${(r.away||"").trim()}-${r.date}-${r.time}`;

      if (!map.has(key)) {
        map.set(key, {
          source: "sofa",
          match_date: r.date || "",
          match_time: r.time || "",

          raw_home: r.home || "",
          raw_away: r.away || "",
          raw_league: r.league || "",

          ht: r.ht || "",
          sh: r.sh || "",
          ft: r.ft || "",
          extratime: r.et || "",
          penalties: r.pen || "",

country_id: countryNameToId[countryRaw] ?? null,
country_iso: countryAliasToISO(countryRaw) || "",

          home_team_id: null,
          away_team_id: null,
          league_id: null
        });
      }
    }

    const rows = Array.from(map.values());

    log(`UNIQUE rows: ${rows.length}`);

    // =========================
    // 2. SMALL CHUNKS (STABILNO)
    // =========================
    const CHUNK = 100;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);

      log(`Uploading ${i + 1}-${i + batch.length}`);

      let retry = 0;
      let success = false;

      while (!success && retry < 3) {
        const { error } = await supabase
          .from("matches")
          .upsert(batch, {
            onConflict: "source,raw_home,raw_away,match_date,match_time"
          });

        if (!error) {
          success = true;
        } else {
          console.log("BATCH ERROR:", error);
          retry++;
          log(`Retry ${retry}...`);
          await sleep(800 * retry);
        }
      }

      if (!success) {
        throw new Error("Batch failed after retries");
      }
    }

    log(`DONE: ${rows.length} matches imported`);

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
<div style={{ marginTop: 10 }}>
    <input
      placeholder="Unesi naziv zenske lige"
      value={newLeague}
      onChange={(e) => setNewLeague(e.target.value)}
    />
    <button onClick={addWomensLeague}>
      ➕ Dodaj žensku ligu
    </button>
  </div>

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
