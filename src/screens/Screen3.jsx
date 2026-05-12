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

  const rowHeight = 40;
  const buffer = 15;
  const containerHeight = 600;

  // load from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("futureMatches") || "[]");
    setFutureMatches(saved);
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
const syncLeaguesAndTeams = async (rows) => {
  const leagueSet = new Set();
  const teamSet = new Set();

  const leagues = [];
  const teams = [];

  rows.forEach(r => {
    // LEAGUES
    if (r.liga && !leagueSet.has(r.liga)) {
      leagueSet.add(r.liga);
      leagues.push({
        name: r.liga,
        country_id: null,
        country: null
      });
    }

    // TEAMS (HOME)
    const homeKey = `${r.home}|screen3`;
    if (r.home && !teamSet.has(homeKey)) {
      teamSet.add(homeKey);
      teams.push({
        name: r.home,
        country_id: null,
        source: "screen3"
      });
    }

    // TEAMS (AWAY)
    const awayKey = `${r.away}|screen3`;
    if (r.away && !teamSet.has(awayKey)) {
      teamSet.add(awayKey);
      teams.push({
        name: r.away,
        country_id: null,
        source: "screen3"
      });
    }
  });

  // UPSERT LEAGUES
  if (leagues.length) {
    const { error } = await supabase
      .from("leagues")
      .upsert(leagues, { onConflict: "name" });

    if (error) {
      console.error("Leagues sync error:", error);
    }
  }

  // UPSERT TEAMS
  if (teams.length) {
    const { error } = await supabase
      .from("teams")
      .upsert(teams, { onConflict: "name,source" });

    if (error) {
      console.error("Teams sync error:", error);
    }
  }
};

  const sortRowsByDateDesc = (rowsToSort) => [...rowsToSort].sort((a,b)=>{
    const dA = (a.datum || '').split('.').reverse().join('-') + ' ' + (a.vreme || '00:00');
    const dB = (b.datum || '').split('.').reverse().join('-') + ' ' + (b.vreme || '00:00');
    return dB.localeCompare(dA);
  });

  // ===== IMPORT =====
  const importExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

const newRows = data.map((r) => ({
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

// ===== SUPABASE SYNC ON IMPORT =====
(async () => {
  try {
    await syncLeaguesAndTeams(newRows);
  } catch (err) {
    console.error("Supabase sync failed:", err);
  }
})();

      const allRows = sortRowsByDateDesc([...(futureMatches || []), ...newRows]);
      allRows.forEach((r,i)=>r.rb=i+1);
      setFutureMatches(allRows);
      localStorage.setItem('futureMatches', JSON.stringify(allRows));
    };
    reader.readAsBinaryString(file);
  };

  const addNewRow = () => {
    const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', _new:true };
    const newRows = [newRow, ...(futureMatches||[])];
    newRows.forEach((r,i)=>r.rb=i+1);
    setFutureMatches(newRows);
    localStorage.setItem('futureMatches', JSON.stringify(newRows));
  };

  const deleteRow = (index) => {
    const copy = [...futureMatches];
    copy.splice(index,1);
    copy.forEach((r,i)=>r.rb=i+1);
    setFutureMatches(copy);
    localStorage.setItem('futureMatches', JSON.stringify(copy));
  };

  const deleteAllRows = () => {
    if(window.confirm("Da li ste sigurni da želite da obrišete sve mečeve?")) {
      setFutureMatches([]);
      localStorage.setItem('futureMatches', JSON.stringify([]));
    }
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
    localStorage.setItem('futureMatches', JSON.stringify(sorted));
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
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={addNewRow}>Dodaj novi mec</button>
        <button onClick={deleteAllRows}>Obriši sve</button>
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
    </div>
  );
}
