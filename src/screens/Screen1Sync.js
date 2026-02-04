import React, { useState } from "react";
import { useMatches } from "../MatchesContext";
import { useSofa } from "../SofaContext";
import { useTeamMap } from "../TeamMapContext";

/**
 * Hook/funkcija koja sinhronizuje rezultate iz SofaScreen u Screen1
 * na osnovu normalizovanih imena timova.
 * Koristi SAMO regularni Ft (90 minuta), ignoriše penale.
 */
export default function Screen1Sync() {
  const { rows: screen1Rows, setRows: setScreen1Rows } = useMatches();
  const { sofaRows } = useSofa();
  const { teamMap } = useTeamMap();

  const [synced, setSynced] = useState(false);

  // Vraca "vidljivi" Ft samo za regularni deo (90 minuta)
  const getVisibleFt = (row) => {
    // Ako postoje poluvremena, saberi ih
    if (row.prvo && row.drugo) {
      const [h1, g1] = row.prvo.split(" - ").map(Number);
      const [h2, g2] = row.drugo.split(" - ").map(Number);
      if ([h1, g1, h2, g2].every(n => !isNaN(n))) {
        return `${h1 + h2}-${g1 + g2}`;
      }
    }
    // Ako nema poluvremena, uzmi Ft kolonu
    return row.ft || "";
  };

  const handleSyncResults = () => {
    if (!screen1Rows || !sofaRows) return;

    // Mapiraj normalized name -> SofaRows (koristi SAMO regularni Ft)
    const sofaMap = {};
    sofaRows.forEach(r => {
      const homeNorm = Object.values(teamMap).find(t => t.name2 === r.Domacin || t.name2 === r.domacin)?.normalized;
      const awayNorm = Object.values(teamMap).find(t => t.name2 === r.Gost || t.name2 === r.gost)?.normalized;
      if (homeNorm && awayNorm) {
        const key = `${homeNorm}||${awayNorm}`;
        sofaMap[key] = { ...r, ft: getVisibleFt(r) };
      }
    });

    const newRows = screen1Rows.map(r => {
      const homeNorm = r.Home || r.home;
      const awayNorm = r.Away || r.away;
      const key = `${homeNorm}||${awayNorm}`;

      if (sofaMap[key]) {
        const sofaMatch = sofaMap[key];
        const screen1FT = r.FT || r.Ft;
        const sofaFT = sofaMatch.ft;

        if (screen1FT !== sofaFT) {
          // Ako se razlikuje, promeni i markiraj
          return { ...r, FT: sofaFT, _updated: true };
        }
      }
      return r;
    });

    setScreen1Rows(newRows);
    setSynced(true);
    alert("Sinhronizacija zavrsena. Promenjeni redovi su obelezeni.");
  };

  return (
    <button
      onClick={handleSyncResults}
      style={{ marginLeft: 10, backgroundColor: "#ffe082", padding: "4px 8px", cursor: "pointer" }}
    >
      🔄 Sync Results (90 min)
    </button>
  );
}
