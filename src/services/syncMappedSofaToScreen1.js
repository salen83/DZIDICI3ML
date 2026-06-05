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

    // =========================
    // PAGINATION FIX
    // =========================
    const fetchAll = async (table) => {
      const pageSize = 1000;
      let from = 0;
      let to = 999;
      let all = [];

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .range(from, to);

        if (error) {
          console.log(`❌ ${table} error:`, error);
          break;
        }

        if (!data || data.length === 0) break;

        all = all.concat(data);

        if (data.length < pageSize) break;

        from += pageSize;
        to += pageSize;
      }

      return all;
    };

    const teamAliases = await fetchAll("team_aliases");
    const leagueAliases = await fetchAll("league_aliases");

    console.log("TEAM ALIASES LENGTH:", teamAliases?.length);
    console.log("LEAGUE ALIASES LENGTH:", leagueAliases?.length);

    console.log("TEAM ALIASES SAMPLE:", teamAliases?.[0]);
    console.log("LAST TEAM ALIAS:", teamAliases?.[teamAliases.length - 1]);

    const teamAliasMap = {};
    const leagueAliasMap = {};

    // =========================
    // TEAM MAP
    // =========================
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

    console.log("TEST CERRO:", teamAliasMap["cerro porteño"]);
    console.log("TEST CRISTAL:", teamAliasMap["club sporting cristal"]);

    // =========================
    // LEAGUE MAP
    // =========================
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
    const failedMappings = [];

    console.log("📊 sofaRows length:", sofaRows?.length);

    for (const row of sofaRows) {
      const homeKey = clean(row.home);
      const awayKey = clean(row.away);

      const leagueKey = clean(row.liga)
        .replace(/,\s*group\s+[a-z0-9]+/i, "")
        .trim();

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
        failedMappings.push({
          id: row.id,
          source: row.source,
          liga: row.liga,
          home: row.home,
          away: row.away,
          mappedHome,
          mappedAway,
          mappedLeague
        });

        console.log("❌ MAP FAIL:", {
          liga: row.liga,
          home: row.home,
          away: row.away
        });

        continue;
      }

      console.log("✅ MATCH OK");

      payload.push({
sofa_id: row.id,
        source: "screen1_mapped",
        match_date: row.datum || "",
        match_time: row.vreme || "",
        league: mappedLeague,
        home: mappedHome,
        away: mappedAway,
        ft: row.ft || "",
        ht: row.ht || "",
        sh: row.sh || "",
        country: row.country || ""
      });
    }

    if (payload.length === 0) {
      console.log("📦 FINAL PAYLOAD:", payload.length);
      console.log("❌ Nema mapped meceva");

      return {
        inserted: 0,
        failedMappings
      };
    }

    console.log("🚀 INSERT START");

    const { data: existing } = await supabase
      .from("screen1_matches")
      .select("match_date, match_time, league, home, away");

    const makeKey = (m) =>
      [
        m.match_date,
        m.match_time,
        clean(m.league),
        clean(m.home),
        clean(m.away)
      ].join("|");

    const existingKeys = new Set(
      (existing || []).map(makeKey)
    );

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
      console.log("❌ INSERT ERROR:", error);
      return;
    }

    console.log("✅ INSERTED:", data.length, "matches");

    return {
      inserted: data.length,
      failedMappings
    };

  } catch (err) {
    console.log("❌ ERROR:", err);
  }
};
