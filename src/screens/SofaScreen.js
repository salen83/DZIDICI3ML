import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import './SofaScreen.css';
import { useSofa } from "../SofaContext";
import { useTeamMap } from "../TeamMapContext";

export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();
  const { setTeamMap } = useTeamMap();
  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({ row: null, col: null });
  const rowHeight = 28;
  const buffer = 15;
  const containerHeight = 600;

  const columns = [
    "Rb","Datum","Vreme","Liga","Domacin","Gost",
    "Prvo poluvreme","Drugo poluvreme","Penali"
  ]; // bez link kolone

  const totalRows = sofaRows?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight)/rowHeight) + buffer);
  const visibleRows = sofaRows?.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => setScrollTop(e.target.scrollTop), []);

  const importExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!json.length) return;

      const newRows = json.map((r, i) => ({
        rb: i+1,
        datum: r['Datum'] || '',
        vreme: r['Vreme'] || '',
        liga: r['Liga'] || '',
        domacin: r['Domacin'] || '',
        gost: r['Gost'] || '',
        prvo: r['Prvo poluvreme'] || '',
        drugo: r['Drugo poluvreme'] || '',
        penali: r['Penali'] || '',
      }));
      setSofaRows(newRows);
      localStorage.setItem("sofaRows", JSON.stringify(newRows));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (rowIdx, col, value) => {
    const copy = [...sofaRows];
    copy[rowIdx][col] = value;
    setSofaRows(copy);
    localStorage.setItem("sofaRows", JSON.stringify(copy));
  };

  const deleteRow = (idx) => {
    const copy = [...sofaRows];
    const teamName = copy[idx]?.domacin;
    if (teamName) setTeamMap(prev => ({ ...prev, [`sofa||${teamName}`]: { type:"team", name1:teamName, name2:teamName }}));
    copy.splice(idx,1);
    setSofaRows(copy);
    localStorage.setItem("sofaRows", JSON.stringify(copy));
  };

  const deleteAll = () => {
    sofaRows.forEach(r=>{
      const teamName = r.domacin;
      if(teamName) setTeamMap(prev => ({ ...prev, [`sofa||${teamName}`]: { type:"team", name1:teamName, name2:teamName }}));
    });
    setSofaRows([]);
    localStorage.removeItem("sofaRows");
  };

  return (
    <div className="sofa-screen-container">
      <div className="sofa-screen-topbar">
        <button onClick={onClose}>⬅ Izadji</button>
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={deleteAll}>Obriši sve</button>
      </div>

      <div className="sofa-screen-table-wrapper" style={{height:containerHeight, overflowY:'auto'}} ref={tableWrapperRef} onScroll={handleScroll}>
        <div style={{height: startIndex*rowHeight}}></div>

        {visibleRows.map((row,i)=>{
          const idx = startIndex + i;
          return (
            <div key={idx} className="sofa-screen-row" style={{height:rowHeight}}>
              {columns.map(col=>{
                const colKey = col==="Prvo poluvreme" ? "prvo" : col==="Drugo poluvreme" ? "drugo" : col==="Penali" ? "penali" : col==="Domacin" ? "domacin" : col==="Gost" ? "gost" : col==="Datum" ? "datum" : col==="Vreme" ? "vreme" : "rb";
                return (
                  <div key={col} className={`sofa-cell ${colKey}`}>
                    {editing.row===idx && editing.col===colKey ? (
                      <input className="edit-input" value={row[colKey]} onChange={e=>handleCellChange(idx,colKey,e.target.value)} onBlur={()=>setEditing({row:null,col:null})} autoFocus />
                    ) : (
                      <span onClick={()=>setEditing({row:idx,col:colKey})}>{row[colKey]}</span>
                    )}
                  </div>
                )
              })}
              <div className="sofa-cell delete-cell"><button onClick={()=>deleteRow(idx)}>x</button></div>
            </div>
          )
        })}

        <div style={{height:(totalRows-endIndex)*rowHeight}}></div>
      </div>
    </div>
  )
}
