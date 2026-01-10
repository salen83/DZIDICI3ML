/*
  buildFormStats.js
  ------------------
  Računa FORMU tima na osnovu POSLEDNJIH N mečeva (default 5)
  Ulaz: rows (iz Screen1)
  Izlaz: mapa po timu
*/

export function buildFormStats(rows, lastN = 5) {
  const byTeam = {};

  // 1. Grupisanje svih mečeva po timu
  rows.forEach(r => {
    if (!r.ft || !r.home || !r.away || !r.ft.includes(":")) return;

    const [hg, ag] = r.ft.split(":").map(n => parseInt(n, 10));
    if (isNaN(hg) || isNaN(ag)) return;

    const dateKey = new Date(`${r.datum || ""} ${r.vreme || ""}`).getTime();

    const homeMatch = { hg, ag, date: dateKey };
    const awayMatch = { hg: ag, ag: hg, date: dateKey };

    if (!byTeam[r.home]) byTeam[r.home] = [];
    if (!byTeam[r.away]) byTeam[r.away] = [];

    byTeam[r.home].push(homeMatch);
    byTeam[r.away].push(awayMatch);
  });

  // 2. Računanje forme (poslednjih N)
  const formStats = {};

  Object.keys(byTeam).forEach(team => {
    const matches = byTeam[team]
      .filter(m => !isNaN(m.date))
      .sort((a, b) => b.date - a.date)
      .slice(0, lastN);

    const init = {
      games: 0,
      gg: 0,
      ng: 0,
      over2: 0,
      over7: 0,
      goalsFor: 0,
      goalsAgainst: 0
    };

    matches.forEach(m => {
      init.games++;
      init.goalsFor += m.hg;
      init.goalsAgainst += m.ag;

      if (m.hg > 0 && m.ag > 0) init.gg++;
      else init.ng++;

      if (m.hg + m.ag >= 2) init.over2++;
      if (m.hg + m.ag >= 7) init.over7++;
    });

    formStats[team] = init;
  });

  return formStats;
}
