import React, { useState, useContext, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './Screen1.css';
import { MatchesContext } from "../MatchesContext";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export default function Screen1() {
  const { rows, setRows } = useContext(MatchesContext);
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({row:null, col:null});
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

  const getExcelDate = row => row?.['Datum'] ?? row?.['datum'] ?? row?.['DATE'] ?? row?.['Date'] ?? row?.['date'] ?? '';

  const sortRowsByDateDesc = (rowsToSort) => [...rowsToSort].sort((a,b)=>{
    const dateA = a.datum.split('.').reverse().join('-');
    const dateB = b.datum.split('.').reverse().join('-');
    return dateB.localeCompare(dateA);
  });

  const importExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
      const newRows = dataRows.map((r,i)=>({
        rb: (rows?.length || 0) + i + 1,
        datum: normalizeDate(getExcelDate(r)),
        vreme: String(r['Time'] ?? ''),
        liga: r['Liga'] ?? '',
        home: r['Home'] ?? '',
        away: r['Away'] ?? '',
        ft: r['FT'] ?? '',
        ht: r['HT'] ?? '',
        sh: r['SH'] ?? '',
      }));
      const allRows = sortRowsByDateDesc([...(rows||[]), ...newRows]);
      allRows.forEach((r,i)=>r.rb=i+1);
      setRows(allRows);
      localStorage.setItem('rows', JSON.stringify(allRows));
    };
    reader.readAsArrayBuffer(file);
  };

  const saveJSON = async () => {
    if (!rows || rows.length===0) { alert("Nema mečeva za export"); return; }
    try {
      const filename = `matches_${Date.now()}.json`;
      await Filesystem.writeFile({
        path: filename,
        data: JSON.stringify(rows,null,2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      alert(`JSON fajl sačuvan: ${filename}`);
    } catch(e) { console.error(e); alert("Greška pri čuvanju JSON fajla"); }
  };

  const addNewRow = () => {
    const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', ft:'', ht:'', sh:'' };
    const newRows = [newRow, ...(rows||[])];
    newRows.forEach((r,i)=>r.rb=i+1);
    setRows(newRows);
    localStorage.setItem('rows', JSON.stringify(newRows));
  };

  const deleteRow = (index) => {
    const copy = [...rows];
    copy.splice(index,1);
    copy.forEach((r,i)=>r.rb=i+1);
    setRows(copy);
    localStorage.setItem('rows', JSON.stringify(copy));
  };

  const handleEditStart = (rowIdx, colKey) => setEditing({row: rowIdx, col: colKey});
  const handleEditEnd = () => setEditing({row:null, col:null});
  const handleCellChange = (rowIdx,key,value) => {
    const copy = [...rows];
    copy[rowIdx][key] = value;
    const sorted = sortRowsByDateDesc(copy);
    sorted.forEach((r,i)=>r.rb=i+1);
    setRows(sorted);
    localStorage.setItem('rows', JSON.stringify(sorted));
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
      <div className="screen1-topbar">
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={addNewRow}>Dodaj novi mec</button>
        <button onClick={saveJSON}>📤 Export JSON</button>
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

          return (
            <div key={idx} className="screen1-row" style={{height:rowHeight, backgroundColor: r.liga?'#f2f9ff':'transparent'}}>
              <div className="col rb">{r.rb}</div>

              {/* INFO: datum + vreme u jednoj liniji, liga ispod */}
              <div className="col info">
                <div style={{display:'flex', flexDirection:'row', gap:'3px'}}>
                  {isEditing && editing.col==='datum' ?
                    <input autoFocus className="edit-input" value={r.datum}
                      onChange={e=>handleCellChange(idx,'datum',e.target.value)}
                      onBlur={handleEditEnd} /> :
                    <div className="info-text" onClick={()=>handleEditStart(idx,'datum')}>
                      {r.datum}
                    </div>
                  }

                  {isEditing && editing.col==='vreme' ?
                    <input autoFocus className="edit-input" value={r.vreme}
                      onChange={e=>handleCellChange(idx,'vreme',e.target.value)}
                      onBlur={handleEditEnd} /> :
                    <div className="info-text" onClick={()=>handleEditStart(idx,'vreme')}>
                      {r.vreme}
                    </div>
                  }
                </div>

                {isEditing && editing.col==='liga' ?
                  <input autoFocus className="edit-input" value={r.liga}
                    onChange={e=>handleCellChange(idx,'liga',e.target.value)}
                    onBlur={handleEditEnd} /> :
                  <div className="info-center" onClick={()=>handleEditStart(idx,'liga')}
                    style={{fontWeight:'bold', fontSize:getFontSize(r.liga,80)}}>
                    {r.liga}
                  </div>
                }
              </div>

              {/* TEAMS */}
              <div className="col teams" style={{fontWeight:'bold', fontSize:getFontSize(`${r.home} - ${r.away}`,110)}}>
                {isEditing && editing.col==='home' ?
                  <input autoFocus className="edit-input" value={r.home}
                    onChange={e=>handleCellChange(idx,'home',e.target.value)}
                    onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'home')}>{r.home}</span>
                }
                <span> - </span>
                {isEditing && editing.col==='away' ?
                  <input autoFocus className="edit-input" value={r.away}
                    onChange={e=>handleCellChange(idx,'away',e.target.value)}
                    onBlur={handleEditEnd} /> :
                  <span onClick={()=>handleEditStart(idx,'away')}>{r.away}</span>
                }
              </div>

              {/* RESULTS: HT/SH u istoj liniji iznad FT */}
              <div className="col results" style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                <div style={{display:'flex', flexDirection:'row', gap:'3px'}}>
                  {isEditing && editing.col==='ht' ?
                    <input autoFocus className="edit-input" value={r.ht}
                      onChange={e=>handleCellChange(idx,'ht',e.target.value)}
                      onBlur={handleEditEnd} /> :
                    <div className="results-text" onClick={()=>handleEditStart(idx,'ht')} style={{fontSize:9}}>
                      {r.ht}
                    </div>
                  }
                  <span>-</span>
                  {isEditing && editing.col==='sh' ?
                    <input autoFocus className="edit-input" value={r.sh}
                      onChange={e=>handleCellChange(idx,'sh',e.target.value)}
                      onBlur={handleEditEnd} /> :
                    <div className="results-text" onClick={()=>handleEditStart(idx,'sh')} style={{fontSize:9}}>
                      {r.sh}
                    </div>
                  }
                </div>
                {isEditing && editing.col==='ft' ?
                  <input autoFocus className="edit-input" value={r.ft}
                    onChange={e=>handleCellChange(idx,'ft',e.target.value)}
                    onBlur={handleEditEnd} /> :
                  <div className="results-center" onClick={()=>handleEditStart(idx,'ft')} style={{fontWeight:'bold', fontSize:12}}>
                    {r.ft}
                  </div>
                }
              </div>

              <div className="col delete"><button onClick={()=>deleteRow(idx)}>x</button></div>
            </div>
          );
        })}
        <div style={{height:(totalRows-endIndex)*rowHeight}}></div>
      </div>
    </div>
  );
}
