import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback
} from 'react';

import * as XLSX from 'xlsx';

import './Screen3.css';

import { MatchesContext } from "../MatchesContext";
import { supabase } from "../supabase";

export default function UpcomingSofa({ onClose }) {

const [upcomingSofaMatches, setUpcomingSofaMatches] = useState([]);

  const tableWrapperRef = useRef(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState({ row:null, col:null });
  const [collapsedLeagues, setCollapsedLeagues] = useState({});

  const rowHeight = 40;
  const buffer = 15;
  const containerHeight = 600;

  // =========================================
  // LOAD FROM LOCAL STORAGE
  // =========================================

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("upcomingSofaMatches") || "[]"
    );

    setUpcomingSofaMatches(saved);

  }, [setUpcomingSofaMatches]);

  // =========================================
  // VIRTUAL SCROLL
  // =========================================

  const totalRows = upcomingSofaMatches?.length || 0;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / rowHeight) - buffer
  );

  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer
  );

  const visibleRows =
    upcomingSofaMatches?.slice(startIndex, endIndex);

  const handleScroll = useCallback(
    (e) => setScrollTop(e.target.scrollTop),
    []
  );

  // =========================================
  // DATE NORMALIZER
  // =========================================

  const normalizeDate = (val) => {

    if (!val) return '';

    if (!isNaN(val)) {

      const date = new Date(
        (val - 25569) * 86400 * 1000
      );

      return `${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
    }

    const str = String(val).trim();

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
      return str;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {

      const [d,m,y] = str.split('/');

      return `${d}.${m}.${y}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {

      const [y,m,d] = str.split('-');

      return `${d}.${m}.${y}`;
    }

    return str;
  };

  // =========================================
  // SUPABASE SYNC
  // =========================================

  const syncLeaguesAndTeams = async (rows) => {

    const leagueSet = new Set();
    const teamSet = new Set();

    const leagues = [];
    const teams = [];

    rows.forEach(r => {

      // LEAGUES

      if (r.liga && !leagueSet.has(r.liga)) {

        leagueSet.add(r.liga);

        leagues.push({
          name: r.liga,
          country_id: null,
          country: null
        });
      }

      // HOME TEAM

      const homeKey = `${r.home}|upcoming_sofa`;

      if (r.home && !teamSet.has(homeKey)) {

        teamSet.add(homeKey);

        teams.push({
          name: r.home,
          country_id: null,
          source: "upcoming_sofa"
        });
      }

      // AWAY TEAM

      const awayKey = `${r.away}|upcoming_sofa`;

      if (r.away && !teamSet.has(awayKey)) {

        teamSet.add(awayKey);

        teams.push({
          name: r.away,
          country_id: null,
          source: "upcoming_sofa"
        });
      }

    });

    // UPSERT LEAGUES

    if (leagues.length) {

      const { error } = await supabase
        .from("leagues")
        .upsert(leagues, { onConflict: "name" });

      if (error) {
        console.error("Leagues sync error:", error);
      }
    }

    // UPSERT TEAMS

    if (teams.length) {

      const { error } = await supabase
        .from("teams")
        .upsert(teams, {
          onConflict: "name,source"
        });

      if (error) {
        console.error("Teams sync error:", error);
      }
    }
  };

  // =========================================
  // SORT
  // =========================================

  const sortRowsByDateDesc = (rowsToSort) =>
    [...rowsToSort].sort((a,b) => {

      const dA =
        (a.datum || '').split('.').reverse().join('-')
        + ' '
        + (a.vreme || '00:00');

      const dB =
        (b.datum || '').split('.').reverse().join('-')
        + ' '
        + (b.vreme || '00:00');

      return dB.localeCompare(dA);
    });

  // =========================================
  // IMPORT EXCEL
  // =========================================

  const importExcel = (event) => {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {

      const wb = XLSX.read(
        e.target.result,
        { type: 'binary' }
      );

      const ws = wb.Sheets[wb.SheetNames[0]];

      const data = XLSX.utils.sheet_to_json(
        ws,
        {
          defval: '',
          raw: false
        }
      );

      const newRows = data.map((r) => ({

        rb: 0,

        datum:
          normalizeDate(
            r['Datum'] ??
            r['datum'] ??
            ''
          ),

        vreme:
          String(
            r['Time'] ??
            r['Vreme'] ??
            ''
          ),

       liga:
  r['Liga'] ?? '',

country:
  r['Country'] ??
  r['Drzava'] ??
  r['Država'] ??
  '',

home:
  r['Domacin'] ??
  r['Home'] ??
  '',

away:
  r['Gost'] ??
  r['Away'] ??
  '',

        _new: true

      }));

      // SUPABASE SYNC

      (async () => {

        try {

          await syncLeaguesAndTeams(newRows);

        } catch (err) {

          console.error(
            "Supabase sync failed:",
            err
          );
        }

      })();

      const allRows = sortRowsByDateDesc([
        ...(upcomingSofaMatches || []),
        ...newRows
      ]);

      allRows.forEach((r,i) => r.rb = i + 1);

      setUpcomingSofaMatches(allRows);

      localStorage.setItem(
        'upcomingSofaMatches',
        JSON.stringify(allRows)
      );
    };

    reader.readAsBinaryString(file);
  };

  // =========================================
  // ADD ROW
  // =========================================

  const addNewRow = () => {

    const newRow = {
      rb:0,
      datum:'',
      vreme:'',
      liga:'',
      home:'',
      away:'',
      _new:true
    };

    const newRows = [
      newRow,
      ...(upcomingSofaMatches || [])
    ];

    newRows.forEach((r,i) => r.rb = i + 1);

    setUpcomingSofaMatches(newRows);

    localStorage.setItem(
      'upcomingSofaMatches',
      JSON.stringify(newRows)
    );
  };

  // =========================================
  // DELETE ROW
  // =========================================

  const deleteRow = (index) => {

    const copy = [...upcomingSofaMatches];

    copy.splice(index,1);

    copy.forEach((r,i)=>r.rb=i+1);

    setUpcomingSofaMatches(copy);

    localStorage.setItem(
      'upcomingSofaMatches',
      JSON.stringify(copy)
    );
  };

  // =========================================
  // DELETE ALL
  // =========================================

  const deleteAllRows = () => {

    if (
      window.confirm(
        "Da li ste sigurni da želite da obrišete sve mečeve?"
      )
    ) {

      setUpcomingSofaMatches([]);

      localStorage.setItem(
        'upcomingSofaMatches',
        JSON.stringify([])
      );
    }
  };

  // =========================================
  // EDIT
  // =========================================

  const handleEditStart = (rowIdx, colKey) =>
    setEditing({ row: rowIdx, col: colKey });

  const handleEditEnd = () =>
    setEditing({ row:null, col:null });

  // =========================================
  // COLLAPSE LEAGUE
  // =========================================

  const toggleLeague = (liga) => {

    setCollapsedLeagues(prev => ({
      ...prev,
      [liga]: !prev[liga]
    }));
  };

  // =========================================
  // CHANGE CELL
  // =========================================

  const handleCellChange = (
    rowIdx,
    key,
    value
  ) => {

    const copy = [...upcomingSofaMatches];

    copy[rowIdx] = {
      ...copy[rowIdx],
      [key]: value
    };

    delete copy[rowIdx]._new;

    const sorted = sortRowsByDateDesc(copy);

    sorted.forEach((r,i)=>r.rb=i+1);

    setUpcomingSofaMatches(sorted);

    localStorage.setItem(
      'upcomingSofaMatches',
      JSON.stringify(sorted)
    );
  };

  // =========================================
  // TEAM FONT SIZE
  // =========================================

  const getTeamFontSize = (
    text,
    maxWidth,
    base=13,
    min=7
  ) => {

    let size = base;

    const canvas =
      document.createElement('canvas');

    const ctx = canvas.getContext('2d');

    ctx.font = `${size}px Arial`;

    while (
      ctx.measureText(text).width > maxWidth
      && size > min
    ) {

      size -= 1;

      ctx.font = `${size}px Arial`;
    }

    return size;
  };

  // =========================================
  // GROUP BY LEAGUE
  // =========================================

const groupedMatches =
  (visibleRows || []).reduce((acc, match, visibleIdx) => {

    const key =
      match.liga || "Nedefinisana liga";

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push({
      ...match,
      originalIndex: startIndex + visibleIdx
    });

    return acc;

  }, {});

  // =========================================
  // RENDER
  // =========================================

  return (

    <div className="screen3-container">

      <div className="screen3-topbar">
       <button
  onClick={onClose}
  style={{
    marginRight: "10px",
    backgroundColor: "#ff8a80",
    fontWeight: "bold"
  }}
>
  IZAĐI
</button>  

        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={importExcel}
        />

        <button onClick={addNewRow}>
          Dodaj novi mec
        </button>

        <button onClick={deleteAllRows}>
          Obriši sve
        </button>

      </div>

      <div
        className="screen3-table-wrapper"
        style={{
          height: containerHeight,
          overflowY: 'auto',
          overflowX: 'auto'
        }}
        ref={tableWrapperRef}
        onScroll={handleScroll}
      >

        <div style={{
          height: startIndex * rowHeight
        }}></div>

        {Object.entries(groupedMatches).map(([liga, matches]) => {

          const isCollapsed =
            collapsedLeagues[liga];

          return (

            <div
              key={liga}
              className="league-block"
            >

              <div
                className="league-header"
                onClick={() => toggleLeague(liga)}
              >

                <span>
                  {isCollapsed ? "▶" : "▼"}
                </span>

                <span
                  style={{
                    marginLeft: 8,
                    fontWeight: "bold"
                  }}
                >
                  {matches[0]?.country
  ? `${matches[0].country} - ${liga}`
  : liga}
                </span>

                <span
                  style={{
                    marginLeft: 10,
                    opacity: 0.6
                  }}
                >
                  ({matches.length})
                </span>

              </div>

              {!isCollapsed && (

                <>

                  {matches.map((r) => {

const idx = r.originalIndex;

                    const rowBgColor =
                      idx % 2 === 0
                      ? "#e6f0fa"
                      : "#ffffff";

                    return (

                      <div
                        key={idx}
                        className="screen3-row"
                        style={{
                          height: rowHeight,
                          backgroundColor: rowBgColor
                        }}
                      >

                        <div className="s3-col rb">
                          {r.rb}
                        </div>

                        <div
                          className="s3-col info"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            width: "220px"
                          }}
                        >

                          <div
                            style={{
                              fontSize: "9px",
                              opacity: 0.8,
                              marginBottom: "3px"
                            }}
                          >
                            {r.datum} {r.vreme}
                          </div>

                          <div
                            style={{
                              fontWeight: "bold",
                              display: "flex",
                              flexDirection: "column",
                              lineHeight: "15px"
                            }}
                          >

                            <span>{r.home}</span>

                            <span>{r.away}</span>

                          </div>

                        </div>

                        <div className="s3-col delete">

                          <button
                            onClick={() => deleteRow(idx)}
                          >
                            x
                          </button>

                        </div>

                      </div>
                    );
                  })}

                </>
              )}

            </div>
          );
        })}
<div
  style={{
    height: (totalRows - endIndex) * rowHeight
  }}
></div>
      </div>

    </div>
  );
}
