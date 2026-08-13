export const syncMappedSofaToScreen1 = async ({
  supabase
}) => {
  try {
    console.log("🚀 syncMappedSofaToScreen1 START");


    // =========================================
    // PAGINATION
    // =========================================

const fetchAll = async (
  table,
  select = "*",
  filterColumn = null,
  filterValue = null
) => {
      const pageSize = 1000;
      let from = 0;
      let all = [];

      while (true) {
let query = supabase
  .from(table)
  .select(select);

if (filterColumn) {
  query = query.eq(filterColumn, filterValue);
}

const { data, error } = await query
  .range(from, from + pageSize - 1);

        if (error) {
          throw new Error(
            `GRESKA pri citanju ${table}: ${error.message}`
          );
        }

        if (!data || data.length === 0) {
          break;
        }

        all = [...all, ...data];

        if (data.length < pageSize) {
          break;
        }

        from += pageSize;
      }

      return all;
    };
const matches = await fetchAll(
  "matches",
  "*",
  "source",
  "sofa"
);

console.log("📦 MATCHES ZA SCREEN1:", matches.length);

if (!matches || matches.length === 0) {
  console.log("❌ Nema Sofa mečeva u matches tabeli.");

  return {
    inserted: 0,
    failedMappings: []
  };
}
    // =========================================
    // UCITAJ ALIAS TABELE
    // =========================================

    const teamAliases = await fetchAll(
      "team_aliases",
      "team_id,alias"
    );

    const leagueAliases = await fetchAll(
      "league_aliases",
      "league_id,alias,source"
    );
console.log("🔎 PRVI TEAM ALIASI:", teamAliases.slice(0, 10));
console.log("🔎 PRVI LEAGUE ALIASI:", leagueAliases.slice(0, 10));

    console.log(
      "TEAM ALIASES:",
      teamAliases.length
    );

    console.log(
      "LEAGUE ALIASES:",
      leagueAliases.length
    );

    // =========================================
    // TEAM MAP
    // team_id -> Mozzart alias
    // =========================================

    const teamAliasMap = {};

    for (const a of teamAliases) {
      if (!a?.team_id || !a?.alias) {
        continue;
      }

      // Ako postoji vise aliasa za isti team_id,
      // uzimamo prvi koji postoji.
      if (!teamAliasMap[a.team_id]) {
        teamAliasMap[a.team_id] = a.alias;
      }
    }

    // =========================================
    // LEAGUE MAP
    // league_id -> Mozzart alias
    // =========================================

    const leagueAliasMap = {};

    for (const a of leagueAliases) {
      if (!a?.league_id || !a?.alias) {
        continue;
      }

      // Prioritet ima Mozzart alias.
      if (
        a.source === "mozzart" ||
        !leagueAliasMap[a.league_id]
      ) {
        leagueAliasMap[a.league_id] = a.alias;
      }
    }

    console.log(
      "TEAM MAP SIZE:",
      Object.keys(teamAliasMap).length
    );

    console.log(
      "LEAGUE MAP SIZE:",
      Object.keys(leagueAliasMap).length
    );

    // =========================================
    // PREVOD JEDNOG SOFA MECА
    // =========================================

    const payload = [];
    const failedMappings = [];
console.log(
  "🔎 PRVI MATCH:",
  matches.slice(0, 10).map(row => ({
    id: row.id,
    home_team_id: row.home_team_id,
    away_team_id: row.away_team_id,
    league_id: row.league_id,
    raw_home: row.raw_home,
    raw_away: row.raw_away,
    raw_league: row.raw_league
  }))
);


for (const row of matches) {

      const homeTeamId =
        row.home_team_id != null
          ? Number(row.home_team_id)
          : null;

      const awayTeamId =
        row.away_team_id != null
          ? Number(row.away_team_id)
          : null;

      const leagueId =
        row.league_id != null
          ? Number(row.league_id)
          : null;

      const mappedHome =
        Number.isFinite(homeTeamId)
          ? teamAliasMap[homeTeamId]
          : null;

      const mappedAway =
        Number.isFinite(awayTeamId)
          ? teamAliasMap[awayTeamId]
          : null;

      const mappedLeague =
        Number.isFinite(leagueId)
          ? leagueAliasMap[leagueId]
          : null;

      const finalHome =
        mappedHome || "NEMAPIRAN TIM";

      const finalAway =
        mappedAway || "NEMAPIRAN TIM";

      const finalLeague =
        mappedLeague || "NEMAPIRANA LIGA";

      // =======================================
      // LOG MAPIRANJA
      // =======================================

console.log("MATCH -> SCREEN1:", {
  id: row.id,

  league_id: leagueId,
  raw_league: row.raw_league,
  mappedLeague: finalLeague,

  home_team_id: homeTeamId,
  raw_home: row.raw_home,
  mappedHome: finalHome,

  away_team_id: awayTeamId,
  raw_away: row.raw_away,
  mappedAway: finalAway
});

      // =======================================
      // EVIDENCIJA NEMAPIRANIH
      // ALI MEC SE NE ODBACUJE
      // =======================================

      if (
        !mappedHome ||
        !mappedAway ||
        !mappedLeague
      ) {
        failedMappings.push({
          id: row.id,

          league_id: leagueId,
          sofaLeague: row.raw_league,
          mappedLeague: mappedLeague || null,

          home_team_id: homeTeamId,
          sofaHome: row.raw_home,
          mappedHome: mappedHome || null,

          away_team_id: awayTeamId,
          sofaAway: row.raw_away,
          mappedAway: mappedAway || null
        });
      }

      // =======================================
      // SVAKI MEC IDE U PAYLOAD
      // =======================================

      payload.push({
        sofa_id: row.id,

        source: "screen1_mapped",

        match_date: row.match_date || "",
        match_time: row.match_time || "",

        league: finalLeague,

        home: finalHome,
        away: finalAway,

        ft: row.ft || "",
        ht: row.ht || "",
        sh: row.sh || "",

        country: row.country || ""
      });
    }

    console.log(
      "📦 PAYLOAD:",
      payload.length
    );

    console.log(
      "⚠️ FAILED MAPPINGS:",
      failedMappings.length
    );

    // =========================================
    // POSTOJEĆI SCREEN1
    // =========================================

    const existing = await fetchAll(
      "screen1_matches",
      "id,sofa_id,match_date,match_time,league,home,away"
    );

    console.log(
      "SCREEN1 EXISTING:",
      existing.length
    );

    // =========================================
    // DEDUPE
    // =========================================

    const makeKey = (m) =>
      [
        m.sofa_id ?? "",
        m.match_date ?? "",
        m.match_time ?? "",
        m.league ?? "",
        m.home ?? "",
        m.away ?? ""
      ].join("|");

    const existingKeys = new Set(
      existing.map(makeKey)
    );

    const uniquePayload = [];

    for (const match of payload) {

      const key = makeKey(match);

      if (existingKeys.has(key)) {
        console.log(
          "⛔ SCREEN1 DUPLICATE:",
          key
        );

        continue;
      }

      existingKeys.add(key);

      uniquePayload.push(match);
    }

    console.log(
      "📦 UNIQUE PAYLOAD:",
      uniquePayload.length
    );

    // =========================================
    // INSERT
    // =========================================

    if (uniquePayload.length === 0) {

      console.log(
        "ℹ️ Nema novih Screen1 meceva."
      );

      return {
        inserted: 0,
        failedMappings
      };
    }

    const { data, error } = await supabase
      .from("screen1_matches")
      .insert(uniquePayload)
      .select();

    if (error) {

      console.error(
        "❌ SCREEN1 INSERT ERROR:",
        error
      );

      return {
        inserted: 0,
        failedMappings,
        error
      };
    }

    console.log(
      "✅ SCREEN1 INSERTED:",
      data?.length || 0
    );

    return {
      inserted: data?.length || 0,
      failedMappings
    };

  } catch (err) {

    console.error(
      "❌ syncMappedSofaToScreen1 ERROR:",
      err
    );

    return {
      inserted: 0,
      failedMappings: [],
      error: err
    };
  }
};
