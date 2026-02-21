import React, { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import "./SofaScreen.css";
import { useSofa } from "../SofaContext";
import { useLeagueTeam } from "../LeagueTeamContext";

export default function SofaScreen({ onClose }) {

  const { sofaRows, setSofaRows } = useSofa();
  const { leagueTeamData, setLeagueTeamData } = useLeagueTeam();

  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({ row: null, col: null });

  const rowHeight = 28;
  const buffer = 15;
  const containerHeight = 600;

  const totalRows = sofaRows?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);
  const visibleRows = sofaRows?.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => setScrollTop(e.target.scrollTop), []);

  /* ================= DATE SISTEM ISTI KAO SCREEN1 ================= */

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

  /* ================= MAP / LEAGUE TEAM (BEZ NORMALIZACIJE) ================= */

  const updateLeagueTeam = (allRows) => {
    const newLeagueData = { ...leagueTeamData };

    allRows.forEach(r => {
      if (!r.liga) return;
      const key = r.liga.toLowerCase().trim();

      if (!newLeagueData[key]) {
        newLeagueData[key] = {
          screen1: "",
          sofa: r.liga,
          screen1Teams: [],
          sofaTeams: []
        };
      }

      if (r.home && !newLeagueData[key].sofaTeams.includes(r.home))
        newLeagueData[key].sofaTeams.push(r.home);

      if (r.away && !newLeagueData[key].sofaTeams.includes(r.away))
        newLeagueData[key].sofaTeams.push(r.away);
    });

    setLeagueTeamData(newLeagueData);
  };

  useEffect(() => {
    if (!sofaRows) return;
    updateLeagueTeam(sofaRows);
    // eslint-disable-next-line
  }, [sofaRows]);

  /* ================= IMPORT ================= */

  const importExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {

      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

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
pen: r['Penali'] ?? ''
      }));

      const allRows = sortRowsByDateDesc([...(sofaRows || []), ...newRows]);
      allRows.forEach((r,i)=>r.rb=i+1);

      setSofaRows(allRows);
      localStorage.setItem('sofaRows', JSON.stringify(allRows));
    };

    reader.readAsArrayBuffer(file);
  };

  /* ================= EDIT SISTEM ISTI KAO SCREEN1 ================= */

  const handleEditStart = (rowIdx, colKey) => setEditing({row: rowIdx, col: colKey});
  const handleEditEnd = () => setEditing({row:null, col:null});

  const handleCellChange = (rowIdx,key,value) => {

    const copy = [...sofaRows];
    copy[rowIdx] = { ...copy[rowIdx], [key]: value };

    const editedRow = copy[rowIdx];

    if (isRowComplete(editedRow)) {
      delete editedRow._new;
      const sorted = sortRowsByDateDesc(copy);
      sorted.forEach((r,i)=>r.rb=i+1);
      setSofaRows(sorted);
      localStorage.setItem('sofaRows', JSON.stringify(sorted));
    } else {
      setSofaRows(copy);
      localStorage.setItem('sofaRows', JSON.stringify(copy));
    }
  };

  const addNewRow = () => {
    const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', ft:'', ht:'', sh:'', et:'', pen:'', _new:true };
    const newRows = [newRow, ...(sofaRows||[])];
    newRows.forEach((r,i)=>r.rb=i+1);
    setSofaRows(newRows);
    localStorage.setItem('sofaRows', JSON.stringify(newRows));

    if (tableWrapperRef.current) tableWrapperRef.current.scrollTop = 0;
    setScrollTop(0);
  };

  const deleteRow = (index) => {
    const copy = [...sofaRows];
    copy.splice(index,1);
    copy.forEach((r,i)=>r.rb=i+1);
    setSofaRows(copy);
    localStorage.setItem('sofaRows', JSON.stringify(copy));
  };

  const deleteAllRows = () => {
    setSofaRows([]);
    localStorage.removeItem('sofaRows');
  };

  /* ================= RENDER ================= */

  return (
    <div className="screen1-container">

      <button onClick={onClose}>⬅ Izadji</button>
      <button onClick={deleteAllRows}>Izbrisi sve</button>

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
       <div className="screen1-row header">
  <div className="col info">Datum / Vreme / Liga</div>
  <div className="col teams">Timovi</div>
  <div className="col small">HT</div>
  <div className="col small">SH</div>
  <div className="col small">FT</div>
  <div className="col small">ET</div>
  <div className="col small">PEN</div>
  <div className="col delete">X</div>
</div>

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

              <div className="col delete">
                <button onClick={()=>deleteRow(idx)}>x</button>
              </div>

            </div>
          );
        })}

        <div style={{height:(totalRows-endIndex)*rowHeight}}></div>

      </div>
    </div>
  );
}
