
export const syncMappedSofaToScreen1 = async ({
  sofaRows,
  teamMap,
  leagueMap,
  supabase
}) => {
  try {
console.log("🚀 syncMappedSofaToScreen1 START");
    if (!sofaRows || sofaRows.length === 0) {
      console.log("❌ Nema sofaRows");
      return;
    }
console.log("SOFA SAMPLE:", sofaRows[0]);

    const clean = (v) =>
      (typeof v === "object" ? v?.name : v || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
const { data: teamAliases } = await supabase
  .from("team_aliases")
  .select("*");

const { data: leagueAliases } = await supabase
  .from("league_aliases")
  .select("*");
const teamAliasMap = {};
const leagueAliasMap = {};

// TEAM MAP
const teamGroups = {};

teamAliases.forEach(a => {
  if (!teamGroups[a.team_id]) {
    teamGroups[a.team_id] = {};
  }

  teamGroups[a.team_id][a.source] = a.alias;
});

Object.values(teamGroups).forEach(g => {
  if (g.sofa && g.screen3) {
    teamAliasMap[clean(g.sofa)] = g.screen3;
  }
});

// LEAGUE MAP
const leagueGroups = {};

leagueAliases.forEach(a => {
  if (!leagueGroups[a.league_id]) {
    leagueGroups[a.league_id] = {};
  }

  leagueGroups[a.league_id][a.source] = a.alias;
});

Object.values(leagueGroups).forEach(g => {
  if (g.sofa && g.screen3) {
    leagueAliasMap[clean(g.sofa)] = g.screen3;
  }
});


    const payload = [];
console.log("📊 sofaRows length:", sofaRows?.length);

    for (const row of sofaRows) {
const homeKey = clean(row.home);
const awayKey = clean(row.away);
const leagueKey = clean(row.liga);

const mappedHome = teamAliasMap[homeKey];
const mappedAway = teamAliasMap[awayKey];
const mappedLeague = leagueAliasMap[leagueKey];

console.log({
  homeKey,
  awayKey,
  leagueKey,
  mappedHome,
  mappedAway,
  mappedLeague
});

      if (!mappedHome || !mappedAway || !mappedLeague) {
        console.log("❌ MAP FAIL:", {
          liga: row.liga,
          home: row.home,
          away: row.away
        });
        continue;
      }
     console.log("✅ MATCH OK");

      payload.push({
        source: "screen1_mapped",
        match_date: row.datum || "",
        match_time: row.vreme || "",
        league: mappedLeague,
        home: mappedHome,
        away: mappedAway,
        ft: row.ft || "",
        ht: row.ht || "",
        sh: row.sh || ""
      });
    }

    if (payload.length === 0) {
      console.log("📦 FINAL PAYLOAD:", payload.length);
      console.log("❌ Nema mapped meceva");
      return;
    }

console.log("🚀 INSERT START");

// učitaj postojeće mečeve
const { data: existing } = await supabase
  .from("screen1_matches")
  .select("match_date, match_time, league, home, away");

// helper key
const makeKey = (m) =>
  [
    m.match_date,
    m.match_time,
    clean(m.league),
    clean(m.home),
    clean(m.away)
  ].join("|");

// existing set
const existingKeys = new Set(
  (existing || []).map(makeKey)
);

// izbaci duplikate
const uniquePayload = payload.filter(m => {
  const key = makeKey(m);

  if (existingKeys.has(key)) {
    console.log("⛔ DUPLICATE:", key);
    return false;
  }

  existingKeys.add(key);
  return true;
});

console.log("📦 FINAL UNIQUE:", uniquePayload.length);

if (uniquePayload.length === 0) {
  console.log("❌ Sve su duplikati");
  return;
}

const { data, error } = await supabase
  .from("screen1_matches")
  .insert(uniquePayload)
  .select();

    if (error) {
      console.log("❌ INSERT ERROR:", error);
      return;
    }

    console.log("✅ INSERTED:", data.length, "matches");

  } catch (err) {
    console.log("❌ ERROR:", err);
  }
};
