import React, { useContext, useMemo, useState } from "react";
import { MatchesContext } from "../MatchesContext";

import {
  insertTeamPairService,
  insertLeaguePairService
} from "../services/mapService";

export default function MatchMapScreen({ onClose }) {

const {
  futureMatches,
  upcomingSofaMatches,
  removeUpcomingMatch,
  blockMatchImport
} = useContext(MatchesContext);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);

  // =========================
  // SCREEN3 MATCHES
  // =========================
  const screen3Matches = useMemo(() => {
    if (!futureMatches) return [];

    return futureMatches.map((m, i) => ({
      id: "s3_" + i,

      league:
        m.Liga ||
        m.liga ||
        "",

      home:
        m.Home ||
        m.home ||
        "",

      away:
        m.Away ||
        m.away ||
        "",

      time:
        m.Time ||
        m.time ||
        ""
    }));
  }, [futureMatches]);

  // =========================
  // SOFA MATCHES
  // =========================
  const sofaMatches = useMemo(() => {
    if (!upcomingSofaMatches) return [];

return upcomingSofaMatches.map((m, i) => ({
  original: m,
      id: "sf_" + i,

      league:
        m.Liga ||
        m.liga ||
        "",

      country:
        m.Country ||
        m.country ||
        "",

      home:
        m.home ||
        m.Home ||
        m.domacin ||
        m.Domacin ||
        "",

      away:
        m.away ||
        m.Away ||
        m.gost ||
        m.Gost ||
        "",

      time:
        m.Time ||
        m.time ||
        ""
    }));
}, [upcomingSofaMatches]);

  // =========================
  // SAVE PAIR
  // =========================
  const confirmMatchPair = async (left, right) => {
    const text = `
Upari mečeve?

SCREEN3
${left.league}
${left.home} vs ${left.away}

SOFA
${right.league}
${right.home} vs ${right.away}
`;

    if (!window.confirm(text)) {
      return;
    }

    try {
      // HOME TEAM
      await insertTeamPairService(
        left.home,
        right.home
      );

      // AWAY TEAM
      await insertTeamPairService(
        left.away,
        right.away
      );

      // LEAGUE
      await insertLeaguePairService(
        left.league,
        right.league,
        right.country || ""
      );

removeUpcomingMatch(right.original);

alert("✅ Uspešno mapirano");

    } catch (err) {
      console.log(err);
      alert("❌ Greška");
    }

    setSelectedLeft(null);
    setSelectedRight(null);
  };

  // =========================
  // CLICK LEFT
  // =========================
  const handleLeftClick = (match) => {
    if (selectedRight) {
      confirmMatchPair(match, selectedRight);
    } else {
      setSelectedLeft(match);
    }
  };

  // =========================
  // CLICK RIGHT
  // =========================
  const handleRightClick = (match) => {
    if (selectedLeft) {
      confirmMatchPair(selectedLeft, match);
    } else {
      setSelectedRight(match);
    }
  };
// =========================
// DELETE SOFA MATCH
// =========================
const handleDeleteSofaMatch = (match) => {
  if (!window.confirm("Obrisati meč iz Upcoming Sofa liste?")) {
    return;
  }

removeUpcomingMatch(match.original);
};

// =========================
// BLOCK IMPORT
// =========================
const handleBlockImport = (match) => {
  if (
    !window.confirm(
      "Blokirati budući import ovog meča i lige?"
    )
  ) {
    return;
  }

blockMatchImport(match.original);
removeUpcomingMatch(match.original);
};

  // =========================
  // MATCH CARD
  // =========================
  const renderMatch = (
    match,
    isSelected,
onClick,
isRightColumn = false
  ) => {
    return (
      <div
        key={`${match.id}_${match.league}_${match.home}_${match.away}`}
        onClick={onClick}
        style={{
          border: "1px solid #ccc",
          padding: 10,
          marginBottom: 8,
          cursor: "pointer",
          background: isSelected
            ? "#ffe082"
            : "#f5f5f5"
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            marginBottom: 5
          }}
        >
          {match.league}
        </div>

        <div>
          {match.home}
        </div>

        <div>
          vs
        </div>

        <div>
          {match.away}
        </div>

        {match.country && (
          <div
            style={{
              marginTop: 5,
              fontSize: 12,
              color: "#777"
            }}
          >
            {match.country}
          </div>
        )}

        {match.time && (
          <div
            style={{
              marginTop: 5,
              fontSize: 12,
              color: "#777"
            }}
          >
            {match.time}
          </div>
        )}
{isRightColumn && (
  <div
    style={{
      display: "flex",
      gap: 8,
      marginTop: 10
    }}
  >
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteSofaMatch(match);
      }}
    >
      🗑 Delete
    </button>

    <button
      onClick={(e) => {
        e.stopPropagation();
        handleBlockImport(match);
      }}
    >
      ⛔ Block
    </button>
  </div>
)} 
     </div>
    );
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div style={{ padding: 20 }}>
      <h2>🗺 Match Mapping</h2>

      <button
        onClick={onClose}
        style={{ marginBottom: 20 }}
      >
        ⬅ Nazad
      </button>

      <div
        style={{
          display: "flex",
          gap: 20
        }}
      >
        {/* LEFT */}
        <div style={{ flex: 1 }}>
          <h3>
            Screen3 ({screen3Matches.length})
          </h3>

          <div
            style={{
              maxHeight: "80vh",
              overflowY: "auto",
              border: "1px solid #ccc",
              padding: 10
            }}
          >
            {screen3Matches.map(match =>
              renderMatch(
                match,
                selectedLeft?.id === match.id,
                () => handleLeftClick(match)
              )
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1 }}>
          <h3>
            Upcoming Sofa ({sofaMatches.length})
          </h3>

          <div
            style={{
              maxHeight: "80vh",
              overflowY: "auto",
              border: "1px solid #ccc",
              padding: 10
            }}
          >
            {sofaMatches.map(match =>
renderMatch(
  match,
  selectedRight?.id === match.id,
  () => handleRightClick(match),
  true
)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
