import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './Screen3.css';
import { MatchesContext } from "../MatchesContext";

export default function Screen3() {
  const { futureMatches, setFutureMatches } = useContext(MatchesContext);
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({row:null, col:null});

  const rowHeight = 28;
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
        _new:true
      }));

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

  return (
    <div className="screen3-container">
      <div className="screen3-topbar">
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={addNewRow}>Dodaj novi mec</button>
        <button onClick={deleteAllRows}>Obriši sve</button>
      </div>

      <div className="screen3-table-wrapper" style={{height:containerHeight, overflowY:'auto'}} ref={tableWrapperRef} onScroll={handleScroll}>
        <div style={{height: startIndex*rowHeight}}></div>

        {visibleRows?.map((r,i)=>{
          const idx = startIndex+i;
          const isEditing = editing.row===idx;
          const isNew = r._new === true;

          const teamText = `${r.home} - ${r.away}`;
          const teamFontSize = getTeamFontSize(teamText, 140, 13, 7);

          const rowBgColor = idx % 2 === 0 ? '#e6f0fa' : '#ffffff';

          return (
            <div key={idx} className="screen3-row" style={{height:rowHeight, backgroundColor: rowBgColor}}>
              <div className="s3-col rb">{r.rb}</div>

              <div className="s3-col info">
                <div style={{display:'flex', flexDirection:'row', gap:'2px'}}>
                  {(isNew || (isEditing && editing.col==='datum')) ?
                    <input className="s3-edit-input" value={r.datum} onChange={e=>handleCellChange(idx,'datum',e.target.value)} onBlur={handleEditEnd}/> :
                    <div className="s3-info-text" onClick={()=>handleEditStart(idx,'datum')} style={{fontSize:'9px'}}>{r.datum}</div>
                  }

                  {(isNew || (isEditing && editing.col==='vreme')) ?
                    <input className="s3-edit-input" value={r.vreme} onChange={e=>handleCellChange(idx,'vreme',e.target.value)} onBlur={handleEditEnd}/> :
                    <div className="s3-info-text" onClick={()=>handleEditStart(idx,'vreme')} style={{fontSize:'9px'}}>{r.vreme}</div>
                  }
                </div>

                {(isNew || (isEditing && editing.col==='liga')) ?
                  <input className="s3-edit-input" value={r.liga} onChange={e=>handleCellChange(idx,'liga',e.target.value)} onBlur={handleEditEnd}/> :
                  <div className="s3-info-center" onClick={()=>handleEditStart(idx,'liga')} style={{fontWeight:'bold', fontSize:'13px'}}>{r.liga}</div>
                }
              </div>

              <div className="s3-col teams" style={{fontWeight:'bold', fontSize:`${teamFontSize}px`}}>
                {(isNew || (isEditing && editing.col==='home')) ?
                  <input className="s3-edit-input" value={r.home} onChange={e=>handleCellChange(idx,'home',e.target.value)} onBlur={handleEditEnd}/> :
                  <span onClick={()=>handleEditStart(idx,'home')}>{r.home}</span>
                }
                <span> - </span>
                {(isNew || (isEditing && editing.col==='away')) ?
                  <input className="s3-edit-input" value={r.away} onChange={e=>handleCellChange(idx,'away',e.target.value)} onBlur={handleEditEnd}/> :
                  <span onClick={()=>handleEditStart(idx,'away')}>{r.away}</span>
                }
              </div>

              <div className="s3-col delete"><button onClick={()=>deleteRow(idx)}>x</button></div>
            </div>
          );
        })}

        <div style={{height:(totalRows-endIndex)*rowHeight}}></div>
      </div>
    </div>
  );
}
