import React, { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import "./SofaScreen.css";
import { useSofa } from "../SofaContext";
import { useTeamMap } from "../TeamMapContext";
import { useLeagueTeam } from "../LeagueTeamContext";

export default function SofaScreen({ onClose }) {
  const { sofaRows, setSofaRows } = useSofa();
  const { setTeamMap } = useTeamMap();
  // eslint-disable-next-line no-unused-vars
  const { leagueTeamData, setLeagueTeamData } = useLeagueTeam();

  const tableWrapperRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState(null);
  const editRef = useRef(null);

  const rowHeight = 28;
  const buffer = 15;
  const containerHeight = 600;

  /* ================= VIRTUALIZACIJA ================= */
  const totalRows = sofaRows?.length || 0;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer
  );
  const visibleRows = sofaRows.slice(startIndex, endIndex);

  const handleScroll = useCallback((e) => setScrollTop(e.target.scrollTop), []);

  const setValue = (idx, field, value) => {
    const copy = [...sofaRows];
    copy[idx][field] = value;
    setSofaRows(copy);
  };

  /* ================= LONG PRESS HOOK ================= */
  const useLongPress = (callback, ms = 500) => {
    const timer = useRef();
    const start = (idx) => {
      timer.current = setTimeout(() => callback(idx), ms);
    };
    const clear = () => clearTimeout(timer.current);
    return { start, clear };
  };

  const infoLongPress = useLongPress((idx) => setEditing({ idx, field: "info" }), 500);
  const domacinLongPress = useLongPress((idx) => setEditing({ idx, field: "domacin" }), 500);
  const gostLongPress = useLongPress((idx) => setEditing({ idx, field: "gost" }), 500);
  const prvoLongPress = useLongPress((idx) => setEditing({ idx, field: "prvo" }), 500);
  const drugoLongPress = useLongPress((idx) => setEditing({ idx, field: "drugo" }), 500);
  const ftLongPress = useLongPress((idx) => setEditing({ idx, field: "ft" }), 500);
  const produzeciLongPress = useLongPress((idx) => setEditing({ idx, field: "produzeci" }), 500);
  const penaliLongPress = useLongPress((idx) => setEditing({ idx, field: "penali" }), 500);

  /* ================= IMPORT ================= */
  const importExcel = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const newRows = json.map((r, i) => ({
        rb: i + 1,
        datum: r["Datum"] || "",
        vreme: r["Vreme"] || "",
        liga: r["Liga"] || "",
        domacin: r["Domacin"] || "",
        gost: r["Gost"] || "",
        ft: r["Ft"] || "",
        prvo: r["Prvo poluvreme"] || "",
        drugo: r["Drugo poluvreme"] || "",
        produzeci: r["Produžeci"] || "",
        penali: r["Penali"] || "",
      }));

      setSofaRows(newRows);
      localStorage.setItem("sofaRows", JSON.stringify(newRows));
    };
    reader.readAsArrayBuffer(file);
  };

  /* ================= BRISANJE ================= */
  const deleteRow = (idx) => {
    const copy = [...sofaRows];
    const team = copy[idx]?.domacin;
    if (team) {
      setTeamMap((prev) => ({
        ...prev,
        [`sofa||${team}`]: { type: "team", name1: team, name2: team },
      }));
    }
    copy.splice(idx, 1);
    copy.forEach((r, i) => (r.rb = i + 1));
    setSofaRows(copy);
    localStorage.setItem("sofaRows", JSON.stringify(copy));
  };

  const deleteAll = () => {
    sofaRows.forEach((r) => {
      if (r.domacin) {
        setTeamMap((prev) => ({
          ...prev,
          [`sofa||${r.domacin}`]: { type: "team", name1: r.domacin, name2: r.domacin },
        }));
      }
    });
    setSofaRows([]);
    localStorage.removeItem("sofaRows");
  };

  /* ================= PUNI LEAGUE TEAM SCREEN ================= */
  useEffect(() => {
    if (!sofaRows || sofaRows.length === 0) return;

    setLeagueTeamData(prev => {
      const updated = { ...prev };

      sofaRows.forEach(r => {
        const liga = r.liga?.trim() || r.league?.trim();
        const domacin = r.domacin?.trim() || r.home?.trim();
        const gost = r.gost?.trim() || r.away?.trim();

        if (!liga) return;

        if (!updated[liga]) {
          updated[liga] = {
            screen1: "",
            sofa: liga,
            screen1Teams: [],
            sofaTeams: [],
          };
        }

        updated[liga].sofa = liga;

        [domacin, gost].forEach(team => {
          if (team && !updated[liga].sofaTeams.includes(team)) {
            updated[liga].sofaTeams.push(team);
          }
        });
      });

      return updated;
    });
  }, [sofaRows, setLeagueTeamData]);

  /* ================= INIT EXISTING ROWS ================= */
  useEffect(() => {
    const stored = localStorage.getItem("sofaRows");
    if (stored) {
      const rows = JSON.parse(stored);
      if (rows.length) setSofaRows(rows);
    }
  }, [setSofaRows]);

  /* ================= RENDER ================= */
  return (
    <div className="sofa-screen-container">
      <div className="sofa-screen-topbar">
        <button onClick={onClose}>⬅ Izadji</button>
        <input type="file" accept=".xls,.xlsx" onChange={importExcel} />
        <button onClick={deleteAll}>Obriši sve</button>
      </div>

      <div
        className="sofa-screen-table-wrapper"
        style={{ height: containerHeight, overflowY: "auto" }}
        ref={tableWrapperRef}
        onScroll={handleScroll}
      >
        <div className="sofa-screen-row sofa-header" style={{ height: rowHeight }}>
          <div className="col rb">Rb</div>
          <div className="col info">Datum / Vreme / Liga</div>
          <div className="col team">Domaćin</div>
          <div className="col team">Gost</div>
          <div className="col res">Ft</div>
          <div className="col res">1P</div>
          <div className="col res">2P</div>
          <div className="col res">PR</div>
          <div className="col res">PEN</div>
          <div className="col del"></div>
        </div>

        <div style={{ height: startIndex * rowHeight }} />

        {visibleRows.map((r, i) => {
          const idx = startIndex + i;
          return (
            <div key={idx} className="sofa-screen-row" style={{ height: rowHeight }}>
              <div className="col rb">{r.rb}</div>
              <div
                className="col info"
                onMouseDown={() => infoLongPress.start(idx)}
                onMouseUp={infoLongPress.clear}
                onMouseLeave={infoLongPress.clear}
                onTouchStart={() => infoLongPress.start(idx)}
                onTouchEnd={infoLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "info" ? (
                  <div ref={editRef} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: "3px" }}>
                      <input
                        autoFocus
                        className="inline-edit"
                        value={r.datum}
                        onChange={(e) => setValue(idx, "datum", e.target.value)}
                        onBlur={(e) => {
                          if (!editRef.current.contains(e.relatedTarget)) setEditing(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                      />
                      <input
                        className="inline-edit"
                        value={r.vreme}
                        onChange={(e) => setValue(idx, "vreme", e.target.value)}
                        onBlur={(e) => {
                          if (!editRef.current.contains(e.relatedTarget)) setEditing(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                      />
                    </div>
                    <input
                      className="inline-edit"
                      value={r.liga}
                      onChange={(e) => setValue(idx, "liga", e.target.value)}
                      onBlur={(e) => {
                        if (!editRef.current.contains(e.relatedTarget)) setEditing(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="info-top">
                      <span>{r.datum}</span>
                      <span>{r.vreme}</span>
                    </div>
                    <div className="info-league">{r.liga}</div>
                  </>
                )}
              </div>

              <div
                className="col team bold"
                onMouseDown={() => domacinLongPress.start(idx)}
                onMouseUp={domacinLongPress.clear}
                onMouseLeave={domacinLongPress.clear}
                onTouchStart={() => domacinLongPress.start(idx)}
                onTouchEnd={() => domacinLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "domacin" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.domacin}
                    onChange={(e) => setValue(idx, "domacin", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  r.domacin
                )}
              </div>

              <div
                className="col team bold"
                onMouseDown={() => gostLongPress.start(idx)}
                onMouseUp={gostLongPress.clear}
                onMouseLeave={gostLongPress.clear}
                onTouchStart={() => gostLongPress.start(idx)}
                onTouchEnd={() => gostLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "gost" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.gost}
                    onChange={(e) => setValue(idx, "gost", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  r.gost
                )}
              </div>

              <div
                className="col res"
                onMouseDown={() => ftLongPress.start(idx)}
                onMouseUp={ftLongPress.clear}
                onMouseLeave={ftLongPress.clear}
                onTouchStart={() => ftLongPress.start(idx)}
                onTouchEnd={() => ftLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "ft" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.ft}
                    onChange={(e) => setValue(idx, "ft", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  (() => {
                    if (!r.prvo || !r.drugo) return r.ft;
                    const [h1, g1] = r.prvo.split(" - ").map(Number);
                    const [h2, g2] = r.drugo.split(" - ").map(Number);
                    if ([h1, g1, h2, g2].some(isNaN)) return r.ft;
                    return `${h1 + h2}-${g1 + g2}`;
                  })()
                )}
              </div>

              <div
                className="col res"
                onMouseDown={() => prvoLongPress.start(idx)}
                onMouseUp={prvoLongPress.clear}
                onMouseLeave={prvoLongPress.clear}
                onTouchStart={() => prvoLongPress.start(idx)}
                onTouchEnd={() => prvoLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "prvo" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.prvo}
                    onChange={(e) => setValue(idx, "prvo", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  r.prvo
                )}
              </div>

              <div
                className="col res"
                onMouseDown={() => drugoLongPress.start(idx)}
                onMouseUp={drugoLongPress.clear}
                onMouseLeave={drugoLongPress.clear}
                onTouchStart={() => drugoLongPress.start(idx)}
                onTouchEnd={() => drugoLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "drugo" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.drugo}
                    onChange={(e) => setValue(idx, "drugo", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  r.drugo
                )}
              </div>

              <div
                className="col res"
                onMouseDown={() => produzeciLongPress.start(idx)}
                onMouseUp={produzeciLongPress.clear}
                onMouseLeave={produzeciLongPress.clear}
                onTouchStart={() => produzeciLongPress.start(idx)}
                onTouchEnd={() => produzeciLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "produzeci" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.produzeci}
                    onChange={(e) => setValue(idx, "produzeci", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  r.produzeci
                )}
              </div>

              <div
                className="col res"
                onMouseDown={() => penaliLongPress.start(idx)}
                onMouseUp={penaliLongPress.clear}
                onMouseLeave={penaliLongPress.clear}
                onTouchStart={() => penaliLongPress.start(idx)}
                onTouchEnd={() => penaliLongPress.clear}
              >
                {editing?.idx === idx && editing.field === "penali" ? (
                  <input
                    autoFocus
                    className="inline-edit"
                    value={r.penali}
                    onChange={(e) => setValue(idx, "penali", e.target.value)}
                    onBlur={() => setEditing(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  />
                ) : (
                  r.penali
                )}
              </div>

              <div className="col del">
                <button onClick={() => deleteRow(idx)}>x</button>
              </div>
            </div>
          );
        })}

        <div style={{ height: (totalRows - endIndex) * rowHeight }} />
      </div>
    </div>
  );
}
