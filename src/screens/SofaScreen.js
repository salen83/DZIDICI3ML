import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import "./SofaScreen.css";
import { useSofa } from "../SofaContext";
import { useTeamMap } from "../TeamMapContext";
import { List } from "react-window";

/**
 * Snapshot – skuplja timove i lige iz Sofa excel-a
 */
function saveSnapshot(screen1Teams = [], screen1Leagues = [], sofaRows = []) {
  let snapshot = {
    screen1: { teams: [], leagues: [] },
    sofa: { teams: [], leagues: [] },
    teamMap: [],
    leagueMap: []
  };

  try {
    const saved = localStorage.getItem("stateSnapshot");
    if (saved) snapshot = JSON.parse(saved);
  } catch (e) {
    console.warn("⚠️ Snapshot read error:", e.message);
  }

  const teams = new Set(snapshot.sofa.teams);
  const leagues = new Set(snapshot.sofa.leagues);

  sofaRows.forEach(r => {
    Object.keys(r._data).forEach(k => {
      const key = k.toLowerCase();
      const val = String(r._data[k] || "").trim();
      if (!val) return;

      if (
        key.includes("home") ||
        key.includes("away") ||
        key.includes("team") ||
        key.includes("domacin") ||
        key.includes("gost")
      ) {
        teams.add(val);
      }

      if (
        key.includes("league") ||
        key.includes("tournament") ||
        key.includes("competition") ||
        key.includes("liga")
      ) {
        leagues.add(val);
      }
    });
  });

  snapshot.sofa.teams = Array.from(teams);
  snapshot.sofa.leagues = Array.from(leagues);

  snapshot.screen1.teams = Array.from(
    new Set([...snapshot.screen1.teams, ...screen1Teams])
  );
  snapshot.screen1.leagues = Array.from(
    new Set([...snapshot.screen1.leagues, ...screen1Leagues])
  );

  localStorage.setItem("stateSnapshot", JSON.stringify(snapshot));
}

export default function SofaScreen({ onClose }) {
  const tableWrapperRef = useRef(null);
  const { sofaRows, setSofaRows } = useSofa();
  const { setTeamMap } = useTeamMap();

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("sofaColumns");
    return saved ? JSON.parse(saved) : [];
  });

  const [editing, setEditing] = useState({ row: null, col: null });

  const addSofaTeamToMap = (teamName) => {
    if (!teamName) return;
    setTeamMap(prev => ({
      ...prev,
      [`sofa||${teamName}`]: {
        type: "team",
        name1: teamName,
        name2: teamName
      }
    }));
  };

  const importExcel = (event) => {
    const file = event.target.files[0];
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

      const newRows = json.map((r, i) => ({
        _id: i,
        _data: { ...r }
      }));

      setSofaRows(newRows);
      saveSnapshot([], [], newRows);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCellChange = (rowIdx, col, value) => {
    const copy = [...sofaRows];
    copy[rowIdx] = {
      ...copy[rowIdx],
      _data: { ...copy[rowIdx]._data, [col]: value }
    };
    setSofaRows(copy);
    saveSnapshot([], [], copy);
  };

  const deleteRow = (idx) => {
    const copy = [...sofaRows];
    const teamName = copy[idx]?._data[columns[0]];
    addSofaTeamToMap(teamName);
    copy.splice(idx, 1);
    setSofaRows(copy);
    saveSnapshot([], [], copy);
  };

  /**
   * Virtualizovani red – DIV layout (ispravno za react-window)
   */
  const Row = ({ index, style }) => {
    const r = sofaRows[index];
    if (!r) return null;

    return (
      <div className="sofa-row" style={style}>
        {columns.map(col => (
          <div className="sofa-cell" key={col}>
            {editing.row === index && editing.col === col ? (
              <input
                value={r._data[col]}
                onChange={(e) =>
                  handleCellChange(index, col, e.target.value)
                }
                onBlur={() => setEditing({ row: null, col: null })}
                autoFocus
              />
            ) : (
              r._data[col]
            )}
          </div>
        ))}
        <div className="sofa-cell sofa-cell-x">
          <button onClick={() => deleteRow(index)}>x</button>
        </div>
      </div>
    );
  };

  return (
    <div className="screen1-container">
      <div className="screen1-topbar">
        <button onClick={onClose}>⬅ Izadji</button>
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
      </div>

      {/* Header */}
      <div className="sofa-header">
        {columns.map(c => (
          <div className="sofa-cell sofa-header-cell" key={c}>
            {c}
          </div>
        ))}
        <div className="sofa-cell sofa-header-cell">X</div>
      </div>

      {/* Virtualized list */}
      <div className="screen1-table-wrapper" ref={tableWrapperRef}>
        <List
          height={400}
          itemCount={sofaRows.length}
          itemSize={36}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
