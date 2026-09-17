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

console.log(
  "📅 MATCHES DATUMI:",
  {
    "2026-09-13": matches.filter(x => x.match_date === "2026-09-13").length,
    "2026-09-14": matches.filter(x => x.match_date === "2026-09-14").length,
    min: matches.map(x => x.match_date).filter(Boolean).sort()[0],
    max: matches.map(x => x.match_date).filter(Boolean).sort().slice(-1)[0],
    latest: matches
      .map(x => ({
        id: x.id,
        date: x.match_date,
        home: x.raw_home,
        away: x.raw_away
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 10)
  }
);

if (!matches || matches.length === 0) {
  console.log("❌ Nema Sofa mečeva u matches tabeli.");

  return {
    inserted: 0,
    failedMappings: []
  };
}
      // =========================================
      // UCITAJ ALIAS I COUNTRY TABELE
      // =========================================

      const teamAliases = await fetchAll(
        "team_aliases",
        "team_id,alias"
      );

      const leagueAliases = await fetchAll(
        "league_aliases",
        "league_id,alias,source"
      );

      const sofaCountries = await fetchAll(
        "sofa_countries",
        "id,name"
      );

      console.log(
        "🔎 PRVI TEAM ALIASI:",
        teamAliases.slice(0, 10)
      );

      console.log(
        "🔎 PRVI LEAGUE ALIASI:",
        leagueAliases.slice(0, 10)
      );

      console.log(
        "🔎 PRVI SOFA COUNTRIES:",
        sofaCountries.slice(0, 10)
      );

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
      // team_id -> alias
      // =========================================

      const teamAliasMap = {};

      for (const a of teamAliases) {
        if (!a?.team_id || !a?.alias) {
          continue;
        }

        if (!teamAliasMap[a.team_id]) {
          teamAliasMap[a.team_id] = a.alias;
        }
      }

      // =========================================
      // LEAGUE MAP
      // league_id -> alias
      // =========================================

      const leagueAliasMap = {};

      for (const a of leagueAliases) {
        if (!a?.league_id || !a?.alias) {
          continue;
        }

        if (
          a.source === "mozzart" ||
          !leagueAliasMap[a.league_id]
        ) {
          leagueAliasMap[a.league_id] = a.alias;
        }
      }

      // =========================================
      // COUNTRY MAP
      // country_id -> country name
      // =========================================

      const countryMap = {};

      for (const country of sofaCountries) {
        if (!country?.id || !country?.name) {
          continue;
        }

        countryMap[country.id] = country.name;
      }

      console.log(
        "TEAM MAP SIZE:",
        Object.keys(teamAliasMap).length
      );

      console.log(
        "LEAGUE MAP SIZE:",
        Object.keys(leagueAliasMap).length
      );

      console.log(
        "COUNTRY MAP SIZE:",
        Object.keys(countryMap).length
      );

      // =========================================
      // KRAJ MAPA
      // =========================================

      console.log(
        "TEAM MAP SIZE:",
        Object.keys(teamAliasMap).length
      );

      console.log(
        "LEAGUE MAP SIZE:",
        Object.keys(leagueAliasMap).length
      );

      console.log(
        "COUNTRY MAP SIZE:",
        Object.keys(countryMap).length
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

        const homeNameSource =
          mappedHome ? "mozzart" : "sofa";

        const awayNameSource =
          mappedAway ? "mozzart" : "sofa";

      const mappedLeague =
        Number.isFinite(leagueId)
          ? leagueAliasMap[leagueId]
          : null;

        const finalHome =
          mappedHome || row.raw_home || "";

        const finalAway =
          mappedAway || row.raw_away || "";

        const finalLeague =
          mappedLeague || row.raw_league || "";

      // =======================================
      // LOG MAPIRANJA
      // =======================================

// Namerno bez detaljnog loga za svaki mec.
// Veliki broj console.log poziva moze preopteretiti DevTools.

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
          league_id: leagueId,

            home: finalHome,
            home_team_id: homeTeamId,
            home_name_source: homeNameSource,

            away: finalAway,
            away_team_id: awayTeamId,
            away_name_source: awayNameSource,

          ft: row.ft || "",
          ht: row.ht || "",
          sh: row.sh || "",

country:
  row.country_id != null
    ? countryMap[Number(row.country_id)] || ""
    : ""
        });
    }

    console.log(
      "📦 PAYLOAD COUNT:",
      payload.length
    );

    console.log(
      "📅 PAYLOAD DATUMI:",
      {
        "2026-09-13": payload.filter(x => x.match_date === "2026-09-13").length,
        "2026-09-14": payload.filter(x => x.match_date === "2026-09-14").length,
        latest: payload
          .map(x => x.match_date)
          .filter(Boolean)
          .sort()
          .slice(-5)
      }
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
          "id,sofa_id,match_date,match_time,league,home,away,league_id,home_team_id,away_team_id,home_name_source,away_name_source"
    );

    console.log(
      "SCREEN1 EXISTING:",
      existing.length
    );

      // =========================================
      // BULK SYNC SCREEN1 PREKO RPC
      // =========================================

      console.log(
        "⚡ ŠALJEM SCREEN1 MEČEVE U BULK RPC:",
        payload.length
      );

      const BATCH_SIZE = 5;

      let inserted = 0;
      let updated = 0;

      const totalBatches =
        Math.ceil(payload.length / BATCH_SIZE);

      console.log(
        "📦 SCREEN1 RPC BATCH SYNC:",
        {
          total: payload.length,
          batchSize: BATCH_SIZE,
          batches: totalBatches
        }
      );

      for (
        let batchStart = 0;
        batchStart < payload.length;
        batchStart += BATCH_SIZE
      ) {
        const batch = payload.slice(
          batchStart,
          batchStart + BATCH_SIZE
        );

        const batchNumber =
          Math.floor(batchStart / BATCH_SIZE) + 1;

        console.log(
          `⚡ SCREEN1 RPC BATCH ${batchNumber}/${totalBatches}:`,
          batch.length
        );

        const MAX_RETRIES = 3;

        let screen1Sync = null;
        let screen1SyncError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          console.log(
            `🔄 SCREEN1 RPC BATCH ${batchNumber}/${totalBatches} ATTEMPT ${attempt}/${MAX_RETRIES}`
          );

          const result = await supabase.rpc(
            "sync_screen1_matches_bulk",
            {
              p_matches: batch
            }
          );

          screen1Sync = result.data;
          screen1SyncError = result.error;

          if (!screen1SyncError) {
            break;
          }

          console.warn(
            `⚠️ SCREEN1 RPC BATCH ${batchNumber}/${totalBatches} ATTEMPT ${attempt} FAILED:`,
            screen1SyncError
          );

          if (attempt < MAX_RETRIES) {
            const delayMs = attempt * 2000;

            console.log(
              `⏳ SCREEN1 RPC RETRY ZA ${delayMs}ms...`
            );

            await new Promise(resolve =>
              setTimeout(resolve, delayMs)
            );
          }
        }

        if (screen1SyncError) {

          console.error(
            `❌ SCREEN1 RPC BATCH ${batchNumber}/${totalBatches} ERROR AFTER ${MAX_RETRIES} ATTEMPTS:`,
            screen1SyncError
          );

          return {
            inserted,
            updated,
            failedMappings,
            error: screen1SyncError
          };
        }

        const batchInserted =
          Number(screen1Sync?.inserted || 0);

        const batchUpdated =
          Number(screen1Sync?.updated || 0);

        inserted += batchInserted;
        updated += batchUpdated;

        console.log(
          `✅ SCREEN1 RPC BATCH ${batchNumber}/${totalBatches} OK:`,
          {
            inserted: batchInserted,
            updated: batchUpdated
          }
        );
      }

      console.log(
        "✅ SCREEN1 BULK SYNC ZAVRŠEN:",
        {
          inserted,
          updated
        }
      );

      // =========================================
      // AUTOMATSKO AŽURIRANJE TABELE PREKO RPC
      // =========================================

      console.log(
        "📊 PROVERA NOVIH MEČEVA ZA TABELU..."
      );

      const {
        data: standingsSync,
        error: standingsSyncError
      } = await supabase.rpc(
        "sync_standings_from_screen1"
      );

      if (standingsSyncError) {
        console.error(
          "❌ STANDINGS RPC ERROR:",
          standingsSyncError
        );
      } else {
        console.log(
          "📊 STANDINGS RPC REZULTAT:",
          standingsSync
        );
      }
      return {
        inserted,
        updated,
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
