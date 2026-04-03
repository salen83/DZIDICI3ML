import React, { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import "./SofaScreen.css";
import { useSofa } from "../SofaContext";
import { useLeagueTeam } from "../LeagueTeamContext";
import { saveSofaRows, loadSofaRows } from "../db"; // IndexedDB funkcije

export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();
const { setLeagueTeamData } = useLeagueTeam();

  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({ row: null, col: null });
  const [importLogs, setImportLogs] = useState([]);

  const debugImport = (...args) => {
    const msg = args.join(' ');
    console.log("[SOFA IMPORT]", msg);
    setImportLogs(prev => [...prev, msg]);
  };

  const rowHeight = 28;
  const buffer = 15;
  const containerHeight = 600;

  const totalRows = sofaRows?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);
  const visibleRows = sofaRows?.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => setScrollTop(e.target.scrollTop), []);

  /* ================= DATE SISTEM ================= */
  const normalizeDate = (val) => {
    if (!val) return '';
    if (!isNaN(val)) {
      const date = new Date((val - 25569) * 86400 * 1000);
      return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
    }
    return String(val);
  };

/* ================= DATE SISTEM ================= */
const parseDate = (d) => {
  if (!d) return new Date(0);           // fallback za prazne vrednosti

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(d);                 // direktno konvertuje ISO datum
  }

  // fallback za ostale formate (nije striktno potrebno ako Excel uvek daje ISO)
  return new Date(0);
};

// sortiranje od novijih ka starijim
const sortRowsByDateDesc = useCallback(
  (rowsToSort) => [...rowsToSort].sort((a, b) => parseDate(b.datum) - parseDate(a.datum)),
  [] // nema spoljašnjih zavisnosti
);


 const isRowComplete = (row) => (
    row.datum && row.vreme && row.liga && row.home && row.away &&
    row.ft && row.ht && row.sh
  );

  /* ================= LEAGUE TEAM ================= */
const updateLeagueTeam = useCallback((allRows) => {
  setLeagueTeamData(prev => {
    const newLeagueData = { ...prev };
    allRows.forEach(r => {
      if (!r.liga) return;
      const key = r.liga.toLowerCase().trim();
      if (!newLeagueData[key]) newLeagueData[key] = { screen1: "", sofa: r.liga, screen1Teams: [], sofaTeams: [] };
      if (r.home && !newLeagueData[key].sofaTeams.includes(r.home)) newLeagueData[key].sofaTeams.push(r.home);
      if (r.away && !newLeagueData[key].sofaTeams.includes(r.away)) newLeagueData[key].sofaTeams.push(r.away);
    });
    return newLeagueData;
  });
}, [setLeagueTeamData]);

  useEffect(() => {
    if (!sofaRows) return;
    updateLeagueTeam(sofaRows);
}, [sofaRows, updateLeagueTeam]);

// ================= INIT IZ INDEXEDDB =================
useEffect(() => {
    (async () => {
        const loaded = await loadSofaRows();
        if (loaded?.length) setSofaRows(sortRowsByDateDesc(loaded));
    })();
}, [setSofaRows, sortRowsByDateDesc]);

  /* ================= IMPORT EXCEL ================= */
  const importExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    debugImport("Import pokrenut, fajl:", file.name, "velicina:", file.size, "bytes");

    const reader = new FileReader();
    debugImport("Reader kreiran");

    reader.onload = async (e) => {
      debugImport("FileReader onload, byteLength:", e.target.result.byteLength);

      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

      debugImport("Excel parsiran u JSON, redova:", dataRows.length);
      debugImport("Prvi redovi iz Excela:", dataRows.slice(0,5));

      const newRows = dataRows.map(r => ({
        rb: 0,
        datum: normalizeDate(r['Datum'] ?? ''),
        vreme: String(r['Time'] ?? r['Vreme'] ?? ''),
        liga: r['Liga'] ?? '',
        home: r['Domacin'] ?? '',
        away: r['Gost'] ?? '',
        ft: r['Ft'] ?? '',
        ht: r['Prvo poluvreme'] ?? '',
        sh: r['Drugo poluvreme'] ?? '',
        et: r['Produzeci'] ?? '',
        pen: r['Penali'] ?? '',
country: r['Country'] ?? ''
      }));

      debugImport("Kreiran newRows array, redova:", newRows.length, "primer prvih 5:", newRows.slice(0,5));

const allRows = sortRowsByDateDesc([...(sofaRows || []), ...newRows]);

debugImport("allRows ukupno:", allRows.length, "primer prvih 5:", allRows.slice(0,5));

allRows.forEach((r,i)=>r.rb=i+1);

// React state update samo jednom
setSofaRows(allRows);

// snimanje u IndexedDB
await saveSofaRows(allRows);

debugImport("IndexedDB update zavrsen, total rows:", allRows.length);
    };

    reader.readAsArrayBuffer(file);
    debugImport("Reader.readAsArrayBuffer pokrenut");
  };

  /* ================= EDIT SISTEM ================= */
  const handleEditStart = (rowIdx, colKey) => setEditing({row: rowIdx, col: colKey});
  const handleEditEnd = () => setEditing({row:null, col:null});

  const handleCellChange = async (rowIdx,key,value) => {
    const copy = [...sofaRows];
    copy[rowIdx] = { ...copy[rowIdx], [key]: value };
    const editedRow = copy[rowIdx];

    if (isRowComplete(editedRow)) {
      delete editedRow._new;
      const sorted = sortRowsByDateDesc(copy);
      sorted.forEach((r,i)=>r.rb=i+1);
      setSofaRows(sorted);
      await saveSofaRows(sorted);
    } else {
      setSofaRows(copy);
      await saveSofaRows(copy);
    }
  };

  const addNewRow = async () => {
    const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', ft:'', ht:'', sh:'', et:'', pen:'', country:'', _new:true };
    const newRows = [newRow, ...(sofaRows||[])];
    newRows.forEach((r,i)=>r.rb=i+1);
    setSofaRows(newRows);
    await saveSofaRows(newRows);
    if (tableWrapperRef.current) tableWrapperRef.current.scrollTop = 0;
    setScrollTop(0);
  };

  const deleteRow = async (index) => {
    const copy = [...sofaRows];
    copy.splice(index,1);
    copy.forEach((r,i)=>r.rb=i+1);
    setSofaRows(copy);
    await saveSofaRows(copy);
  };

  const deleteAllRows = async () => {
    setSofaRows([]);
    await saveSofaRows([]);
  };

  /* ================= RENDER ================= */
  return (
    <div className="screen1-container">
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button onClick={onClose}>⬅ Izadji</button>
        <button className="btn-small" onClick={deleteAllRows}>Izbrisi sve</button>
      </div>

      <div className="screen1-topbar">
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={addNewRow}>Dodaj novi mec</button>
      </div>

      <div
        className="screen1-table-wrapper"
        style={{height:containerHeight, overflowY:'auto'}}
        ref={tableWrapperRef}
        onScroll={handleScroll}
      >
        <div style={{height: startIndex*rowHeight}}></div>
        {visibleRows?.map((r,i)=>{
          const idx = startIndex+i;
          const isEditing = editing.row===idx;
          const isNew = r._new === true;

          return (
            <div key={idx} className="screen1-row" style={{ height: rowHeight }}>
              <div className="col info">
                <div style={{display:'flex', gap:'3px'}}>
                  {(isNew || (isEditing && editing.col==='datum')) ?
                    <input className="edit-input" value={r.datum} onChange={e=>handleCellChange(idx,'datum',e.target.value)} onBlur={handleEditEnd} autoFocus /> :
                    <div onClick={()=>handleEditStart(idx,'datum')}>{r.datum}</div>
                  }
                  {(isNew || (isEditing && editing.col==='vreme')) ?
                    <input className="edit-input" value={r.vreme} onChange={e=>handleCellChange(idx,'vreme',e.target.value)} onBlur={handleEditEnd} /> :
                    <div onClick={()=>handleEditStart(idx,'vreme')}>{r.vreme}</div>
                  }
                </div>
                {(isNew || (isEditing && editing.col==='liga')) ?
                  <input className="edit-input" value={r.liga} onChange={e=>handleCellChange(idx,'liga',e.target.value)} onBlur={handleEditEnd} /> :
                  <div onClick={()=>handleEditStart(idx,'liga')} style={{fontWeight:'bold'}}>{r.liga}</div>
                }
              </div>

              <div className="col teams">
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

              <div className="col small">
                {(isNew || (isEditing && editing.col==='ht')) ?
                  <input className="edit-input" value={r.ht} onChange={e=>handleCellChange(idx,'ht',e.target.value)} onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'ht')}>{r.ht}</span>
                }
              </div>
              <div className="col small">
                {(isNew || (isEditing && editing.col==='sh')) ?
                  <input className="edit-input" value={r.sh} onChange={e=>handleCellChange(idx,'sh',e.target.value)} onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'sh')}>{r.sh}</span>
                }
              </div>
              <div className="col small">
                {(isNew || (isEditing && editing.col==='ft')) ?
                  <input className="edit-input" value={r.ft} onChange={e=>handleCellChange(idx,'ft',e.target.value)} onBlur={handleEditEnd} /> :
                  <strong onClick={()=>handleEditStart(idx,'ft')}>{r.ft}</strong>
                }
              </div>
              <div className="col small">
                {(isNew || (isEditing && editing.col==='et')) ?
                  <input className="edit-input" value={r.et} onChange={e=>handleCellChange(idx,'et',e.target.value)} onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'et')}>{r.et}</span>
                }
              </div>
              <div className="col small">
                {(isNew || (isEditing && editing.col==='pen')) ?
                  <input className="edit-input" value={r.pen} onChange={e=>handleCellChange(idx,'pen',e.target.value)} onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'pen')}>{r.pen}</span>
                }
              </div>
          <div className="col small">
  {(isNew || (isEditing && editing.col==='country')) ?
    <input className="edit-input" value={r.country} onChange={e=>handleCellChange(idx,'country',e.target.value)} onBlur={handleEditEnd} /> :
    <span onClick={()=>handleEditStart(idx,'country')}>{r.country}</span>
  }
</div>

              <div className="col delete">
                <button onClick={()=>deleteRow(idx)}>x</button>
              </div>
            </div>
          );
        })}
        <div style={{height:(totalRows-endIndex)*rowHeight}}></div>

        <div style={{
          position: 'sticky',
          bottom: 0,
          marginTop:'10px',
          padding:'5px',
          border:'1px solid #ccc',
          maxHeight:150,
          overflowY:'auto',
          fontSize:'12px',
          background:'#f9f9f9',
          zIndex: 10
        }}>
          {importLogs.map((log,i) => <div key={i}>{log}</div>)}
        </div>
      </div>
    </div>
  );
}
