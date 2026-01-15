import React, { useState, useContext, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './Screen1.css';
import { MatchesContext } from "../MatchesContext";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import JSZip from 'jszip';
import { Share } from '@capacitor/share';

export default function Screen1() {
  const { rows, setRows } = useContext(MatchesContext);
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

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
      const d = String(date.getDate()).padStart(2,'0');
      const m = String(date.getMonth()+1).padStart(2,'0');
      const y = date.getFullYear();
      return d + "." + m + "." + y;
    }
    return String(val);
  };

  const sortRowsByDateDesc = (rowsToSort) => [...rowsToSort].sort((a,b)=>{
    if (!a.datum || !b.datum) return 0;
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
      const newRows = dataRows.map((r)=>({
        rb: 0,
        datum: normalizeDate(r['Datum'] ?? ''),
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

<<<<<<< HEAD
  const saveJSON = async () => {
=======
  const saveJSONZip = async () => {
>>>>>>> d4850b4 (Update Screen1 export JSON ZIP and capacitor build settings)
    if (!rows || rows.length===0) {
      alert("Nema mečeva za export");
      return;
    }
    try {
<<<<<<< HEAD
      const filename = "matches_" + Date.now() + ".json";
      await Filesystem.writeFile({
        path: filename,
        data: JSON.stringify(rows,null,2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      alert("JSON sačuvan u Documents folder: " + filename);
    } catch(e) {
      console.error(e);
      alert("Greška pri čuvanju fajla");
=======
      // kreiraj JSON fajl
      const jsonStr = JSON.stringify(rows,null,2);
      const zip = new JSZip();
      zip.file('matches.json', jsonStr);
      const zipContent = await zip.generateAsync({type:"base64"});

      // čuvanje ZIP fajla u Downloads folder
      const filename = `matches_${Date.now()}.zip`;
      await Filesystem.writeFile({
        path: filename,
        data: zipContent,
        directory: Directory.External,
        encoding: Encoding.Base64
      });

      // dobija apsolutnu putanju fajla za Share
      const uriFile = await Filesystem.getUri({
        directory: Directory.External,
        path: filename
      });

      // Share ili otvori Gmail/Share sheet
      await Share.share({
        title: 'Export JSON Matches',
        text: 'Evo ZIP fajla sa mečevima za ML aplikaciju',
        url: uriFile.uri,
        dialogTitle: 'Pošalji fajl'
      });

    } catch(e) {
      console.error(e);
      alert("Greška pri kreiranju i slanju ZIP fajla");
>>>>>>> d4850b4 (Update Screen1 export JSON ZIP and capacitor build settings)
    }
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

  const handleCellChange = (rowIdx,key,value) => {
    const copy = [...rows];
    copy[rowIdx] = { ...copy[rowIdx], [key]: value };
    const sorted = sortRowsByDateDesc(copy);
    sorted.forEach((r,i)=>r.rb=i+1);
    setRows(sorted);
    localStorage.setItem('rows', JSON.stringify(sorted));
  };

  return (
    <div className="screen1-container">
      <div className="screen1-topbar">
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
<<<<<<< HEAD
        <button onClick={addNewRow}>➕ Dodaj novi meč</button>
        <button onClick={saveJSON}>📤 Export JSON</button>
=======
        <button onClick={addNewRow}>Dodaj novi mec</button>
        <button onClick={saveJSONZip}>📤 Export JSON ZIP</button>
>>>>>>> d4850b4 (Update Screen1 export JSON ZIP and capacitor build settings)
      </div>

      <div className="screen1-table-wrapper" style={{height:containerHeight, overflowY:'auto'}} ref={tableWrapperRef} onScroll={handleScroll}>
        <div style={{height: startIndex*rowHeight}}></div>

        {visibleRows?.map((r,i)=>{
          const idx = startIndex+i;

          return (
            <div key={idx} className="screen1-row" style={{height:rowHeight}}>
              <div className="col rb">{r.rb}</div>

              <div className="col info">
                <input value={r.datum} onChange={e=>handleCellChange(idx,'datum',e.target.value)} />
                <input value={r.vreme} onChange={e=>handleCellChange(idx,'vreme',e.target.value)} />
                <input value={r.liga} onChange={e=>handleCellChange(idx,'liga',e.target.value)} />
              </div>

              <div className="col teams">
                <input value={r.home} onChange={e=>handleCellChange(idx,'home',e.target.value)} />
                <span> - </span>
                <input value={r.away} onChange={e=>handleCellChange(idx,'away',e.target.value)} />
              </div>

              <div className="col results">
                <input value={r.ht} onChange={e=>handleCellChange(idx,'ht',e.target.value)} />
                <input value={r.sh} onChange={e=>handleCellChange(idx,'sh',e.target.value)} />
                <input value={r.ft} onChange={e=>handleCellChange(idx,'ft',e.target.value)} />
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
