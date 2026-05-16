export const syncMappedSofaToScreen1 = async ({
  sofaRows,
  teamMap,
  leagueMap,
  supabase
}) => {
  try {
    if (!sofaRows || sofaRows.length === 0) {
      console.log("❌ Nema sofaRows");
      return;
    }

    const clean = (v) =>
      (typeof v === "object" ? v?.name : v || "")
        .toString()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const payload = [];

    for (const row of sofaRows) {
      const homeKey = clean(row.home);
      const awayKey = clean(row.away);
      const leagueKey = clean(row.liga);

      const mappedHome = teamMap?.[homeKey];
      const mappedAway = teamMap?.[awayKey];
      const mappedLeague = leagueMap?.[leagueKey];

      if (!mappedHome || !mappedAway || !mappedLeague) {
        console.log("❌ MAP FAIL:", {
          liga: row.liga,
          home: row.home,
          away: row.away
        });
        continue;
      }

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
      console.log("❌ Nema mapped meceva");
      return;
    }

    const { data, error } = await supabase
      .from("screen1_matches")
      .insert(payload)
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
