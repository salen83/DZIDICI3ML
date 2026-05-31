import React, { useState, useContext, useRef, useCallback, useEffect } from 'react';
import './Screen1.css';
import { MatchesContext } from "../MatchesContext";
import { useLeagueMap } from "../LeagueMapContext";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";
import { convertSofaToSyncJSONRaw } from "./ScreenJson";
import { useSofa } from "../SofaContext";
import countryAliasToISO from "../utils/countryAliasToISO";

import { supabase } from "../supabase";
import { mapMatchesToIds } from "../services/mapMatchesToIds";
import { syncMappedSofaToScreen1 } from "../services/syncMappedSofaToScreen1";

export default function Screen1() {
  const { rows, setRows } = useContext(MatchesContext);
  const { leagueMap } = useLeagueMap();
  const { teamMap } = useNormalisedTeamMap();
  const { sofaRows } = useSofa();
const saveMappedSofaMatchToScreen1Table = async () => {
  await syncMappedSofaToScreen1({
    sofaRows,
    teamMap,
    leagueMap,
    supabase
  });
};

  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({row:null, col:null});
  const [debugLogs, setDebugLogs] = useState([]);

  const addLog = (msg) => {
    setDebugLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  const rowHeight = 28;
  const buffer = 15;
  const containerHeight = 600;

  const totalRows = rows?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight)/rowHeight) + buffer);
  const visibleRows = rows?.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => setScrollTop(e.target.scrollTop), []);

  const normalizeDate = (val) => {
    if (!val) return '';
    if (!isNaN(val)) {
      const date = new Date((val - 25569) * 86400 * 1000);
      return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
    }
    return String(val);
  };

const sortRowsByDateDesc = (rowsToSort) =>
  [...rowsToSort].sort((a, b) => {
    const dateA = a?.datum ? a.datum.split('.').reverse().join('-') : '';
    const dateB = b?.datum ? b.datum.split('.').reverse().join('-') : '';
    return dateB.localeCompare(dateA);
  });

  // =========================
  // 🔹 INIT IZ INDEXEDDB
  // =========================
useEffect(() => {
  (async () => {
    try {

const { data, error } = await supabase
  .from("screen1_matches")
  .select("*")
  .order("match_date", { ascending: false });
      if (error) {
        console.error("❌ Supabase error:", error);
        return;
      }

      if (data) {
const formatted = data.map((r, i) => ({
  rb: i + 1,
  datum: r.match_date || "",
  vreme: r.match_time || "",
  liga: r.league || "",
  home: r.home || "",
  away: r.away || "",
  country: countryAliasToISO(r.country),
  ft: r.ft || "",
  ht: r.ht || "",
  sh: r.sh || ""
}));

        setRows(sortRowsByDateDesc(formatted));
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
    }
  })();
}, [setRows]);

const handleMapIds = async () => {
  await mapMatchesToIds({ supabase, addLog });
};

  const isRowComplete = (row) => {
    return (
      row.datum &&
      row.vreme &&
      row.liga &&
      row.home &&
      row.away &&
      row.ft &&
      row.ht &&
      row.sh
    );
  };

  const addNewRow = async () => {
    const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', ft:'', ht:'', sh:'', _new:true };
    const newRows = [newRow, ...(rows||[])];
    newRows.forEach((r,i)=>r.rb=i+1);
    setRows(newRows);


    if (tableWrapperRef.current) tableWrapperRef.current.scrollTop = 0;
    setScrollTop(0);
  };

  const deleteRow = async (index) => {
    const copy = [...rows];
    copy.splice(index,1);
    copy.forEach((r,i)=>r.rb=i+1);
    setRows(copy);
  };

  const deleteAllRows = async () => {
    setRows([]);
  };

  const handleEditStart = (rowIdx, colKey) => setEditing({row: rowIdx, col: colKey});
  const handleEditEnd = () => setEditing({row:null, col:null});

  const handleCellChange = async (rowIdx,key,value) => {
    const copy = [...rows];
    copy[rowIdx] = { ...copy[rowIdx], [key]: value };
    const editedRow = copy[rowIdx];

    if (isRowComplete(editedRow)) {
      delete editedRow._new;
      const sorted = sortRowsByDateDesc(copy);
      sorted.forEach((r,i)=>r.rb=i+1);
      setRows(sorted);
    } else {
      setRows(copy);
    }
  };

  const getFontSize = (text,maxWidth,base=11,min=7) => {
    let size = base;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${size}px Arial`;
    while(ctx.measureText(text).width > maxWidth && size>min) { size -= 1; ctx.font = `${size}px Arial`; }
    return size;
  };

  return (
    <div className="screen1-container">
      <button className="btn-small" onClick={deleteAllRows}>Izbrisi sve</button>
      <div className="screen1-topbar">
        <button onClick={addNewRow}>Dodaj novi mec</button>
        <button onClick={handleMapIds}>Map IDs</button>
        <button onClick={() => console.log(debugLogs)}>Prikaži debug log</button>
        <button onClick={saveMappedSofaMatchToScreen1Table}>
  Test Screen1 Insert
</button>
      </div>

      <div className="screen1-table-wrapper" style={{height:containerHeight, overflowY:'auto'}} ref={tableWrapperRef} onScroll={handleScroll}>
        <div style={{height: startIndex*rowHeight}}></div>

        {visibleRows?.map((r,i)=>{
          const idx = startIndex+i;
          const isEditing = editing.row===idx;
          const isNew = r._new === true;

          return (
            <div key={idx} className="screen1-row" style={{ height: rowHeight, backgroundColor: r._syncedChanged ? 'yellow' : 'transparent' }}>
              <div className="col info">
                <div style={{display:'flex', flexDirection:'row', gap:'3px'}}>
                  {(isNew || (isEditing && editing.col==='datum')) ?
                    <input className="edit-input" value={r.datum} onChange={e=>handleCellChange(idx,'datum',e.target.value)} onBlur={handleEditEnd} autoFocus /> :
                    <div className="info-text" onClick={()=>handleEditStart(idx,'datum')}>{r.datum}</div>
                  }
                  {(isNew || (isEditing && editing.col==='vreme')) ?
                    <input className="edit-input" value={r.vreme} onChange={e=>handleCellChange(idx,'vreme',e.target.value)} onBlur={handleEditEnd} /> :
                    <div className="info-text" onClick={()=>handleEditStart(idx,'vreme')}>{r.vreme}</div>
                  }
                </div>

                {(isNew || (isEditing && editing.col==='liga')) ?
                  <input className="edit-input" value={r.liga} onChange={e=>handleCellChange(idx,'liga',e.target.value)} onBlur={handleEditEnd} /> :
                  <div className="info-center" onClick={()=>handleEditStart(idx,'liga')} style={{fontWeight:'bold', fontSize:getFontSize(r.liga,80)}}>{r.liga}</div>
                }
              </div>

              <div className="col teams" style={{fontWeight:'bold', fontSize:getFontSize(`${r.home} - ${r.away}`,110)}}>
                {(isNew || (isEditing && editing.col==='home')) ?
                  <input className="edit-input" value={r.home} onChange={e=>handleCellChange(idx,'home',e.target.value)} onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'home')}>{r.home}</span>
                }
                <span> - </span>
                {(isNew || (isEditing && editing.col==='away')) ?
                  <input className="edit-input" value={r.away} onChange={e=>handleCellChange(idx,'away',e.target.value)} onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'away')}>{r.away}</span>
                }
              </div>

              <div className="col results" style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                <div style={{display:'flex', flexDirection:'row', gap:'3px'}}>
                  {(isNew || (isEditing && editing.col==='ht')) ?
                    <input className="edit-input" value={r.ht} onChange={e=>handleCellChange(idx,'ht',e.target.value)} onBlur={handleEditEnd} /> :
                    <div className="results-text" onClick={()=>handleEditStart(idx,'ht')} style={{fontSize:9}}>{r.ht}</div>
                  }
                  <span>-</span>
                  {(isNew || (isEditing && editing.col==='sh')) ?
                    <input className="edit-input" value={r.sh} onChange={e=>handleCellChange(idx,'sh',e.target.value)} onBlur={handleEditEnd} /> :
                    <div className="results-text" onClick={()=>handleEditStart(idx,'sh')} style={{fontSize:9}}>{r.sh}</div>
                  }
                </div>

                {(isNew || (isEditing && editing.col==='ft')) ?
                  <input className="edit-input" value={r.ft} onChange={e=>handleCellChange(idx,'ft',e.target.value)} onBlur={handleEditEnd} /> :
                  <div className="results-center" onClick={()=>handleEditStart(idx,'ft')} style={{fontWeight:'bold', fontSize:12}}>{r.ft}</div>
                }
              </div>

              <div className="col delete" style={{display:'flex', gap:'4px'}}>
                <button onClick={()=>deleteRow(idx)}>x</button>
              </div>
            </div>
          );
        })}

        <div style={{height:(totalRows-endIndex)*rowHeight}}></div>
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto', background: '#eee', marginTop: 10, padding: 5 }}>
        {debugLogs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
