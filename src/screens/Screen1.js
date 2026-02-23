import React, { useState, useContext, useRef, useCallback, useEffect } from 'react';        
import * as XLSX from 'xlsx';
import './Screen1.css';
import { MatchesContext } from "../MatchesContext";
import { useMapScreen } from "../MapScreenContext";
import { useLeagueTeam } from "../LeagueTeamContext";
import { useLeagueMap } from "../LeagueMapContext";
import { useNormalisedTeamMap } from "../NormalisedTeamMapContext";
import { convertSofaToSyncJSONRaw } from "./ScreenJson";
import { useSofa } from "../SofaContext";

export default function Screen1() {
  const { rows, setRows } = useContext(MatchesContext);
  const { setMapData } = useMapScreen();
  const { leagueTeamData, setLeagueTeamData } = useLeagueTeam();
  const { leagueMap } = useLeagueMap();
const { teamMap } = useNormalisedTeamMap();
const { sofaRows } = useSofa();
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({row:null, col:null});
  const [debugLogs, setDebugLogs] = useState([]);

const addLog = (msg) => {
  setDebugLogs(prev => [...prev, msg]);
  console.log(msg); // i dalje ide i u browser konzolu
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

  const sortRowsByDateDesc = (rowsToSort) => [...rowsToSort].sort((a,b)=>{
    const dateA = a.datum.split('.').reverse().join('-');
    const dateB = b.datum.split('.').reverse().join('-');
    return dateB.localeCompare(dateA);
  });

  // =========================
  // 🔥 puni MapScreen i LeagueTeamScreen
  // =========================
  const updateMapAndLeagueTeam = (allRows) => {
    // 1️⃣ MapScreen
    setMapData(prev => {
      const next = { ...prev };
      allRows.forEach(r => {
        if (!r.liga) return;
        const key = r.liga.toLowerCase().trim();
        if (!next[key]) {
          next[key] = {
            screen1: r.liga,
            sofa: "",
            screen1Teams: [],
            sofaTeams: []
          };
        }
        if (r.home && !next[key].screen1Teams.includes(r.home)) next[key].screen1Teams.push(r.home);
        if (r.away && !next[key].screen1Teams.includes(r.away)) next[key].screen1Teams.push(r.away);
      });
      return next;
    });

    // 2️⃣ LeagueTeamScreen sa screen1 i sofa kolonom
    const newLeagueData = { ...leagueTeamData };
    allRows.forEach(r => {
      if (!r.liga) return;
      const key = r.liga.toLowerCase().trim();
      if (!newLeagueData[key]) {
        newLeagueData[key] = {
          screen1: r.liga,
          sofa: "",
          screen1Teams: [],
          sofaTeams: []
        };
      }
      if (r.home && !newLeagueData[key].screen1Teams.includes(r.home))
        newLeagueData[key].screen1Teams.push(r.home);
      if (r.away && !newLeagueData[key].screen1Teams.includes(r.away))
        newLeagueData[key].screen1Teams.push(r.away);
    });
    setLeagueTeamData(newLeagueData);
  };

  // =========================
  // 🔥 AUTOMATSKI prati svaku promenu u Screen1
  // =========================
  useEffect(() => {
    if (!rows) return;
    updateMapAndLeagueTeam(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const importExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    const newRows = dataRows.reduce((acc, r) => {
  const datum = normalizeDate(r['Datum'] ?? '');
  const vreme = String(r['Time'] ?? '');
  const liga = r['Liga'] ?? '';
  const home = r['Home'] ?? '';
  const away = r['Away'] ?? '';
  const ft = r['FT'] ?? '';
  const ht = r['HT'] ?? '';
  const sh = r['SH'] ?? '';

  // provera da li vec postoji isti mec
  const exists = rows?.some(existing =>
    existing.datum === datum &&
    String(existing.vreme) === vreme &&
    existing.liga?.toLowerCase().trim() === liga?.toLowerCase().trim() &&
    existing.home?.toLowerCase().trim() === home?.toLowerCase().trim() &&
    existing.away?.toLowerCase().trim() === away?.toLowerCase().trim()
  );

  if (!exists) {
    acc.push({ rb: 0, datum, vreme, liga, home, away, ft, ht, sh });
  }

  return acc;
}, []);
      const allRows = sortRowsByDateDesc([...(rows||[]), ...newRows]);
      allRows.forEach((r,i)=>r.rb=i+1);
      setRows(allRows);
      localStorage.setItem('rows', JSON.stringify(allRows));

  };
    reader.readAsArrayBuffer(file);
  };
const syncWithSofaScreen = async () => {
  try {
    addLog("🔹 Pokrenut syncWithSofaScreen");

const syncJson = convertSofaToSyncJSONRaw(sofaRows, teamMap, leagueMap);
addLog(`🔹 Učitano iz SofaContext: ${syncJson.length} mečeva`);

    const updatedRows = rows.map(row => {
      const match = syncJson.find(s =>
        s.datum === row.datum &&
        String(s.vreme) === String(row.vreme) &&
        s.liga === row.liga &&
        s.home === row.home &&
        s.away === row.away
      );

      if (!match) {
        addLog(`❌ Nije pronađen match za: ${row.home} - ${row.away}`);
        return row;
      }

      const sofaFT = match.ft ?? '';
      const sofaSH = match.sh ?? '';

      if (row.ft === sofaFT && row.sh === sofaSH) {
        addLog(`✅ Rezultati isti za: ${row.home} - ${row.away}`);
        return { ...row, _syncedChanged: false };
      }

      addLog(`⚠️ Rezultati se razlikuju za: ${row.home} - ${row.away}, update na ${sofaFT}:${sofaSH}`);
      return { ...row, ft: sofaFT, sh: sofaSH, _syncedChanged: true };
    });

    setRows(updatedRows);
    localStorage.setItem('rows', JSON.stringify(updatedRows));
    addLog("🔹 Sync završen");

  } catch (err) {
    addLog(`❌ Greška u sync: ${err}`);
  }
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
  const addNewRow = () => {
  const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', ft:'', ht:'', sh:'', _new:true };
    const newRows = [newRow, ...(rows||[])];
    newRows.forEach((r,i)=>r.rb=i+1);
    setRows(newRows);
    localStorage.setItem('rows', JSON.stringify(newRows));

    updateMapAndLeagueTeam(newRows);

    if (tableWrapperRef.current) tableWrapperRef.current.scrollTop = 0;
    setScrollTop(0);
  };

  const deleteRow = (index) => {
    const copy = [...rows];
    copy.splice(index,1);
    copy.forEach((r,i)=>r.rb=i+1);
    setRows(copy);
    localStorage.setItem('rows', JSON.stringify(copy));
  };
  const deleteAllRows = () => {
    setRows([]);
    localStorage.removeItem('rows');
  };

  const handleEditStart = (rowIdx, colKey) => setEditing({row: rowIdx, col: colKey});
  const handleEditEnd = () => setEditing({row:null, col:null});

  const handleCellChange = (rowIdx,key,value) => {
    const copy = [...rows];
    copy[rowIdx] = { ...copy[rowIdx], [key]: value};

    const editedRow = copy[rowIdx];

    if (isRowComplete(editedRow)) {
      delete editedRow._new;

      const sorted = sortRowsByDateDesc(copy);
      sorted.forEach((r,i)=>r.rb=i+1);

      setRows(sorted);
      localStorage.setItem('rows', JSON.stringify(sorted));
    } else {
      setRows(copy);
      localStorage.setItem('rows', JSON.stringify(copy));
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
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={addNewRow}>Dodaj novi mec</button>
        <button onClick={syncWithSofaScreen}>Sync SofaScreen</button>
        <button onClick={() => console.log(debugLogs)}>Prikaži debug log</button>
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
