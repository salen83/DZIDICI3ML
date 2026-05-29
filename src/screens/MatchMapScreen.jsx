import React, { useContext, useMemo, useState, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { MatchesContext } from "../MatchesContext";

import {
  insertTeamPairService,
  insertLeaguePairService
} from "../services/mapService";

import * as fuzz from "fuzzball";

function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(fc|fk|cf|sc|ac)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function getMatchScore(left, right) {

  const leagueScore = fuzz.token_set_ratio(
    normalize(left.league),
    normalize(right.league)
  );

  const homeScore = fuzz.token_set_ratio(
    normalize(left.home),
    normalize(right.home)
  );

  const awayScore = fuzz.token_set_ratio(
    normalize(left.away),
    normalize(right.away)
  );

  const total =
    (leagueScore * 0.3) +
    (homeScore * 0.35) +
    (awayScore * 0.35);

  return Math.round(total);
}

export default function MatchMapScreen({ onClose }) {

const {
  futureMatches,
  upcomingSofaMatches,
  removeUpcomingMatch,
  blockMatchImport
} = useContext(MatchesContext);

  const [hiddenScreen3Matches, setHiddenScreen3Matches] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("hiddenScreen3Matches")
    ) || [];
  } catch {
    return [];
  }
});
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
useEffect(() => {
  localStorage.setItem(
    "hiddenScreen3Matches",
    JSON.stringify(hiddenScreen3Matches)
  );
}, [hiddenScreen3Matches]);
  // =========================
  // SCREEN3 MATCHES
  // =========================
const screen3Matches = useMemo(() => {

  if (!futureMatches) return [];

  const seen = new Set();

  return futureMatches

    // HIDDEN FILTER
    .filter(m => {

      return !hiddenScreen3Matches.some(h =>

        h.home === (m.Home || m.home || "") &&
        h.away === (m.Away || m.away || "") &&
        h.league === (m.Liga || m.liga || "")

      );

    })

    // DEDUPE
    .filter(m => {

      const key = [

        m.Liga || m.liga || "",

        m.Home || m.home || "",

        m.Away || m.away || "",

        m.Date || m.date || m.Datum || m.datum || "",

        m.Time || m.time || ""

      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;

    })

    // MAP
    .map((m, i) => ({

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

      date:
        m.Date ||
        m.date ||
        m.Datum ||
        m.datum ||
        "",

      time:
        m.Time ||
        m.time ||
        ""

    }))

    // SORT
    .sort((a, b) => {

      if (a.league !== b.league) {
        return a.league.localeCompare(b.league);
      }

      return `${a.date} ${a.time}`.localeCompare(
        `${b.date} ${b.time}`
      );

    });

}, [futureMatches, hiddenScreen3Matches]);

  // =========================
  // SOFA MATCHES
  // =========================
const sofaMatches = useMemo(() => {

  if (!upcomingSofaMatches) return [];

  const seen = new Set();

  return upcomingSofaMatches
    .filter(m => {

      const key = [
        m.Liga || m.liga || "",
        m.home || m.Home || "",
        m.away || m.Away || "",
        m.Date || m.date || m.Datum || m.datum || "",
        m.Time || m.time || ""
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
    .map((m, i) => ({
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

      date:
        m.Date ||
        m.date ||
        m.Datum ||
        m.datum ||
        "",

      time:
        m.Time ||
        m.time ||
        ""
    }))
    .sort((a, b) => {

      if (a.league !== b.league) {
        return a.league.localeCompare(b.league);
      }

      return `${a.date} ${a.time}`.localeCompare(
        `${b.date} ${b.time}`
      );

    });

}, [upcomingSofaMatches]);
const suggestedPairs = useMemo(() => {

  return screen3Matches.map(left => {

    let best = null;
    let bestScore = 0;

    for (const right of sofaMatches) {

      const score =
        getMatchScore(left, right);

      if (score > bestScore) {
        bestScore = score;
        best = right;
      }
    }

    return {
      left,
      right: best,
      score: bestScore
    };

  });

}, [screen3Matches, sofaMatches]);

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
setHiddenScreen3Matches(prev => [
  ...prev,
  {
    home: left.home,
    away: left.away,
    league: left.league
  }
]);

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
// DELETE WHOLE LEAGUE
// =========================
const handleDeleteSofaLeague = (leagueName) => {
  if (
    !window.confirm(
      `Obrisati sve Upcoming Sofa mečeve iz lige "${leagueName}"?`
    )
  ) {
    return;
  }

  sofaMatches
    .filter(m => m.league === leagueName)
    .forEach(m => {
      removeUpcomingMatch(m.original);
    });
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

<div
  style={{
    fontSize: 12,
    color: "#666",
    marginBottom: 6
  }}
>
  {match.date || "?"} {match.time || ""}
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
{match.score !== undefined && (
  <div
    style={{
      marginTop: 6,
      fontSize: 12,
      fontWeight: "bold",
      color:
        match.score >= 95
          ? "green"
          : match.score >= 85
          ? "orange"
          : "red"
    }}
  >
    Match: {match.score}%
  </div>
)}

{match.country && (
  <div
    style={{
      marginBottom: 6,
      fontSize: 12,
      color: "#777"
    }}
  >
    🌍 {match.country}
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
<button
  onClick={(e) => {
    e.stopPropagation();
    handleDeleteSofaLeague(match.league);
  }}
>
  🗑 League
</button>
  </div>
)} 
     </div>
    );
  };
const Row = ({ index, style, data }) => {

  const item = data[index];

  if (!item) {
    return null;
  }

  return (
    <div style={style}>
      {item}
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
<Virtuoso
  style={{ height: 700 }}
  data={[...suggestedPairs].sort((a, b) => b.score - a.score)}
  itemContent={(index, pair) => (
    renderMatch(
      {
        ...pair.left,
        score: pair.score
      },
      selectedLeft?.id === pair.left.id,
      () => handleLeftClick(pair.left)
    )
  )}
/>
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
<Virtuoso
  style={{ height: 700 }}
  data={[...suggestedPairs].sort((a, b) => b.score - a.score)}
  itemContent={(index, pair) =>
    pair.right
      ? renderMatch(
          {
            ...pair.right,
            score: pair.score
          },
          selectedRight?.id === pair.right.id,
          () => handleRightClick(pair.right),
          true
        )
      : null
  }
/>

          </div>
        </div>
      </div>
    </div>
  );
}
