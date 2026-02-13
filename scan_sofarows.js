const initialSofaRows = [
  { Liga: "Premier League", Domacin: "Chelsea", Gost: "Arsenal" },
  { Liga: "Premier League", Domacin: "Liverpool", Gost: "Man City" },
  { Liga: "La Liga", Domacin: "Barcelona", Gost: "Real Madrid" },
  { Liga: "Serie A", Domacin: "Juventus", Gost: "Inter" }
];

const getTeamsByLeague = (rows) => {
  const map = {};
  rows.forEach(r => {
    const liga = r.Liga || r.liga || "Nepoznato";
    const home = r.Domacin || r.home;
    const away = r.Gost || r.away;
    if (!map[liga]) map[liga] = [];
    if (home && !map[liga].includes(home)) map[liga].push(home);
    if (away && !map[liga].includes(away)) map[liga].push(away);
  });
  return map;
};

const sofaTeams = getTeamsByLeague(initialSofaRows);

for (const liga in sofaTeams) {
  console.log(`\n=== ${liga} ===`);
  sofaTeams[liga].forEach((t, i) => console.log(`${i+1}. ${t}`));
}
