import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './Screen1.css';
import { MatchesContext } from "../MatchesContext";

export default function Screen1() {
  const { rows, setRows } = useContext(MatchesContext);
  const [countryColors, setCountryColors] = useState({});
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rowHeight = 35;
  const buffer = 20;

  const [colWidths, setColWidths] = useState({
    rb: 40, datum: 80, vreme: 60, liga: 120, home: 120, away: 120, ft: 40, ht: 40, sh: 40, delete: 40
  });
  const resizingCol = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const savedColors = JSON.parse(localStorage.getItem('countryColors') || '{}');
    setCountryColors(savedColors);
  }, []);

  useEffect(() => {
    if (!rows) return;
    const newColors = { ...countryColors };
    rows.forEach(r => {
      const country = (r.liga || '').split(' ')[0] || r.liga;
      if (country && !newColors[country]) {
        let hash = 0;
        for (let i = 0; i < country.length; i++) {
          hash = country.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        newColors[country] = `hsl(${hue}, 70%, 70%)`;
      }
    });
    setCountryColors(newColors);
    localStorage.setItem('countryColors', JSON.stringify(newColors));
  }, [rows]);

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
  const getCountryColor = country => countryColors[country] || '#fff';

  const sortRowsByDateDesc = (rowsToSort) => {
    return [...rowsToSort].sort((a,b)=>{
      const dateA = a.datum.split('.').reverse().join('-'); // yyyy-mm-dd
      const dateB = b.datum.split('.').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  };

  const importExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

      const newRows = data.map((r, i) => ({
        rb: rows.length + i + 1,
        datum: normalizeDate(getExcelDate(r)),
        vreme: String(r['Time'] ?? ''),
        liga: r['Liga'] ?? '',
        home: r['Home'] ?? '',
        away: r['Away'] ?? '',
        ft: r['FT'] ?? '',
        ht: r['HT'] ?? '',
        sh: r['SH'] ?? '',
      }));

      const allRows = sortRowsByDateDesc([...rows, ...newRows]);
      allRows.forEach((r,i)=>r.rb=i+1);
      setRows(allRows);
      localStorage.setItem('rows', JSON.stringify(allRows));
    };
    reader.readAsBinaryString(file);
  };

  const addNewRow = () => {
    const newRow = { rb:0, datum:'', vreme:'', liga:'', home:'', away:'', ft:'', ht:'', sh:'' };
    // Novi red ide uvek na vrh, ostali sortirani po datumu
    const sortedExisting = sortRowsByDateDesc(rows);
    const newRows = [newRow, ...sortedExisting];
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
    copy[rowIdx][key] = value;
    const sorted = sortRowsByDateDesc(copy);
    sorted.forEach((r,i)=>r.rb=i+1);
    setRows(sorted);
    localStorage.setItem('rows', JSON.stringify(sorted));
  };

  const startResize = (e, colKey) => {
    resizingCol.current = colKey;
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    startWidth.current = colWidths[colKey];
    e.preventDefault();
  };

  const onResize = (e) => {
    if (!resizingCol.current) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = currentX - startX.current;
    setColWidths(prev => ({
      ...prev,
      [resizingCol.current]: Math.max(0, startWidth.current + delta)
    }));
  };

  const endResize = () => { resizingCol.current = null; };
  const handleScroll = useCallback((e) => { setScrollTop(e.target.scrollTop); }, []);

  const containerHeight = 600;
  const totalRows = rows?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight)/rowHeight) + buffer);
  const visibleRows = rows?.slice(startIndex, endIndex);

  const columnKeys = ['rb','datum','vreme','liga','home','away','ft','ht','sh','delete'];

  return (
    <div className="screen1-container"
         onTouchMove={onResize}
         onTouchEnd={endResize}>
      <div className="screen1-topbar">
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={addNewRow}>Dodaj novi mec</button>
      </div>

      <div
        className="screen1-table-wrapper"
        style={{ height: containerHeight, overflowY: 'auto', width:'98%', margin:'0 auto' }}
        ref={tableWrapperRef}
        onScroll={handleScroll}
      >
        <table className="screen1-table">
          <thead>
            <tr>
              {columnKeys.map(key => (
                <th key={key} style={{width: colWidths[key], position:'relative', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {key === 'rb' ? '#' :
                   key==='datum' ? 'Datum' :
                   key==='vreme' ? 'Vreme' :
                   key==='liga' ? 'Liga' :
                   key==='home' ? 'Home' :
                   key==='away' ? 'Away' :
                   key==='ft' ? 'FT' :
                   key==='ht' ? 'HT' :
                   key==='sh' ? 'SH' : ''}
                  {key !== 'delete' &&
                    <div style={{
                      position:'absolute', right:0, top:0, width:20, height:'100%', touchAction:'none', cursor:'col-resize',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#333'
                    }}
                    onTouchStart={e=>startResize(e,key)}
                    onMouseDown={e=>startResize(e,key)}>⇔</div>
                  }
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ height: startIndex * rowHeight }}></tr>
            {visibleRows?.map((r,i)=>{
              const idx = startIndex + i;
              const country = (r.liga || '').split(' ')[0] || r.liga;
              const color = getCountryColor(country);
              const cellStyle = {overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'};
              return (
                <tr key={idx}>
                  <td style={{...cellStyle, width: colWidths.rb}}>{r.rb}</td>
                  <td style={{...cellStyle, width: colWidths.datum}}><input value={r.datum} onChange={e=>handleCellChange(idx,'datum',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.vreme}}><input value={r.vreme} onChange={e=>handleCellChange(idx,'vreme',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.liga, backgroundColor:color, fontWeight:'bold'}}><input value={r.liga} onChange={e=>handleCellChange(idx,'liga',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.home, backgroundColor:color, fontWeight:'bold'}}><input value={r.home} onChange={e=>handleCellChange(idx,'home',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.away, backgroundColor:color, fontWeight:'bold'}}><input value={r.away} onChange={e=>handleCellChange(idx,'away',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.ft}}><input value={r.ft} onChange={e=>handleCellChange(idx,'ft',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.ht}}><input value={r.ht} onChange={e=>handleCellChange(idx,'ht',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{...cellStyle, width: colWidths.sh}}><input value={r.sh} onChange={e=>handleCellChange(idx,'sh',e.target.value)} style={{width:'100%'}} /></td>
                  <td style={{width: colWidths.delete}}><button onClick={()=>deleteRow(idx)}>x</button></td>
                </tr>
              );
            })}
            <tr style={{ height: (totalRows - endIndex) * rowHeight }}></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
