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
          "id,sofa_id,match_date,match_time,league,home,away,league_id,home_team_id,away_team_id,home_name_source,away_name_source"
    );

    console.log(
      "SCREEN1 EXISTING:",
      existing.length
    );

      // =========================================
      // AZURIRAJ POSTOJECE SCREEN1 REDOVE
      // =========================================

      const existingBySofaId = new Map(
        existing
          .filter(row => row.sofa_id != null)
          .map(row => [Number(row.sofa_id), row])
      );

      const uniquePayload = [];
      let updated = 0;

      for (const match of payload) {

        const existingRow =
          existingBySofaId.get(Number(match.sofa_id));

        // -----------------------------------------
        // POSTOJI -> UPDATE
        // -----------------------------------------

        if (existingRow) {

          const { error: updateError } = await supabase
            .from("screen1_matches")
            .update({
              match_date: match.match_date,
              match_time: match.match_time,

              league: match.league,
              league_id: match.league_id,

              home: match.home,
              home_team_id: match.home_team_id,
              home_name_source: match.home_name_source,

              away: match.away,
              away_team_id: match.away_team_id,
              away_name_source: match.away_name_source,

              ft: match.ft,
              ht: match.ht,
              sh: match.sh,

              country: match.country,
              source: match.source
            })
            .eq("id", existingRow.id);

          if (updateError) {

            console.error(
              "❌ SCREEN1 UPDATE ERROR:",
              {
                screen1_id: existingRow.id,
                sofa_id: match.sofa_id,
                error: updateError
              }
            );

          } else {

            updated++;

            console.log(
              "🔄 SCREEN1 UPDATED:",
              {
                screen1_id: existingRow.id,
                sofa_id: match.sofa_id,
                home: match.home,
                home_team_id: match.home_team_id,
                home_name_source: match.home_name_source,
                away: match.away,
                away_team_id: match.away_team_id,
                away_name_source: match.away_name_source
              }
            );
          }

          continue;
        }

        // -----------------------------------------
        // NE POSTOJI -> NOVI INSERT
        // -----------------------------------------

        uniquePayload.push(match);
      }

      console.log(
        "🔄 SCREEN1 UPDATED:",
        updated
      );

      console.log(
        "📦 NOVI SCREEN1:",
        uniquePayload.length
      );

      // =========================================
      // INSERT NOVIH
      // =========================================

      if (uniquePayload.length === 0) {

        console.log(
          "ℹ️ Nema novih Screen1 meceva."
        );

        return {
          inserted: 0,
          updated,
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
