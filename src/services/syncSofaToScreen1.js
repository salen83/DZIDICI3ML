import { supabase } from "../supabase";

export const syncSofaToScreen1 = async ({
  sofaRows,
  teamMap,
  leagueMap
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

    const payloads = [];

    for (const row of sofaRows) {
      const homeKey = clean(row.home);
      const awayKey = clean(row.away);
      const leagueKey = clean(row.liga);

      const mappedHome = teamMap?.[homeKey];
      const mappedAway = teamMap?.[awayKey];
      const mappedLeague = leagueMap?.[leagueKey];

      if (!mappedHome || !mappedAway || !mappedLeague) {
        console.log("❌ MAP FAIL:", row);
        continue;
      }

      payloads.push({
        source: "sofa_mapped",
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

    if (payloads.length === 0) {
      console.log("❌ Nema mapiranih mečeva");
      return;
    }

    const { data, error } = await supabase
      .from("screen1_matches")
      .insert(payloads)
      .select();

    if (error) {
      console.log("❌ INSERT ERROR:", error);
      return;
    }

    console.log("✅ INSERT SUCCESS:", data);

  } catch (err) {
    console.log("❌ ERROR:", err);
  }
};
