import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import './SofaScreen.css';
import { useSofa } from "../SofaContext";
import { useTeamMap } from "../TeamMapContext";

export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();
  const { setTeamMap } = useTeamMap();
  const tableWrapperRef = useRef(null);
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("sofaColumns");
    return saved ? JSON.parse(saved) : [];
  });
  const [editing, setEditing] = useState({ row: null, col: null });

  const addSofaTeamToMap = (teamName) => {
    if (!teamName) return;
    setTeamMap(prev => ({
      ...prev,
      [`sofa||${teamName}`]: { type: "team", name1: teamName, name2: teamName }
    }));
  };

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

      const cols = Object.keys(json[0]);
      setColumns(cols);
      localStorage.setItem("sofaColumns", JSON.stringify(cols));

      const newRows = json.map((r, i) => ({ _id: i, _data: { ...r } }));
      setSofaRows(newRows);
      localStorage.setItem("sofaRows", JSON.stringify(newRows));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (rowIdx, col, value) => {
    const copy = [...sofaRows];
    copy[rowIdx]._data[col] = value;
    setSofaRows(copy);
    localStorage.setItem("sofaRows", JSON.stringify(copy));
  };

  const deleteRow = (idx) => {
    const copy = [...sofaRows];
    const teamName = copy[idx]?._data[columns[0]];
    addSofaTeamToMap(teamName);
    copy.splice(idx, 1);
    setSofaRows(copy);
    localStorage.setItem("sofaRows", JSON.stringify(copy));
  };

  return (
    <div className="sofa-screen-container">
      <div className="sofa-screen-topbar">
        <button onClick={onClose}>⬅ Izadji</button>
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
      </div>

      <div className="sofa-screen-table-wrapper" ref={tableWrapperRef}>
        <div className="sofa-screen-header">
          {columns.map(c => (
            <div key={c} className="sofa-header-cell">{c}</div>
          ))}
          <div className="sofa-header-cell">X</div>
        </div>

        {sofaRows.map((row, idx) => (
          <div key={idx} className="sofa-screen-row">
            {columns.map(col => (
              <div key={col} className="sofa-cell">
                {editing.row === idx && editing.col === col ? (
                  <input
                    className="edit-input"
                    value={row._data[col]}
                    onChange={e => handleCellChange(idx, col, e.target.value)}
                    onBlur={() => setEditing({ row: null, col: null })}
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setEditing({ row: idx, col })}>{row._data[col]}</span>
                )}
              </div>
            ))}
            <div className="sofa-cell">
              <button onClick={() => deleteRow(idx)}>x</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
