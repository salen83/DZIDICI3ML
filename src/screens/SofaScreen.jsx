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
  const [newLeague, setNewLeague] = useState("");
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);
const [scrollTop, setScrollTop] = useState(0);
 const [blockedLeagues, setBlockedLeagues] = useState([]);
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

console.log("SOFA FIRST ROW:", json[0]);
console.log("SOFA COLUMNS:", Object.keys(json[0] || {}));

const { data: countriesData, error } = await supabase
  .from("sofa_countries")
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

  const league =
    r.Liga || r.league || r.League || "";

  if (blockedLeagues.includes(league)) continue;

  const home =
    r.Domacin || r.home || r.Home || r["Home team"] || "";

  const away =
    r.Gost || r.away || r.Away || r["Away team"] || "";

  const date =
    r.Datum || r.date || r.Date || r.match_date || "";

  const time =
    r.Vreme || r.time || r.Time || r.match_time || "";

  const countryRaw =
    (r.Country || r.country || "").trim();

  const key = `${home}-${away}-${date}-${time}`;

  if (!map.has(key)) {

    map.set(key, {
      source: "sofa",

      match_date: date,
      match_time: time,

      raw_home: home,
      raw_away: away,
      raw_league: league,

      ht: r["Prvo poluvreme"] || r.ht || "",
      sh: r["Drugo poluvreme"] || r.sh || "",
      ft: r.FT || r.ft || "",
      extratime: r.Produzeci || r.et || "",
      penalties: r.Penali || r.pen || "",

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
key={r.id}
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
