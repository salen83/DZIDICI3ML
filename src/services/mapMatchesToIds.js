// src/services/mapMatchesToIds.js

export const mapMatchesToIds = async ({ supabase, addLog }) => {
  const normalize = (s) =>
    s?.toString().toLowerCase().trim();

  try {
    addLog?.("Ucitavam alias tabele...");

    // povuci alias tabele
    const { data: teamAliases } = await supabase
      .from("team_aliases")
      .select("alias, team_id");

    const { data: leagueAliases } = await supabase
      .from("league_aliases")
      .select("alias, league_id");

    // napravi mape
    const teamMap = {};
    teamAliases?.forEach(a => {
      teamMap[normalize(a.alias)] = a.team_id;
    });

    const leagueMap = {};
    leagueAliases?.forEach(a => {
      leagueMap[normalize(a.alias)] = a.league_id;
    });

    addLog?.("Ucitavam matches za mapiranje...");

    // uzmi samo one gdje fali ID
    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .or("home_team_id.is.null,away_team_id.is.null,league_id.is.null");

    if (error) {
      console.error(error);
      addLog?.("Greska pri fetch matches");
      return;
    }

    addLog?.(`[MAP] Pronadjeno za mapiranje: ${matches?.length || 0}`);

    let updatedCount = 0;

    for (const m of matches || []) {
      const homeId = teamMap[normalize(m.raw_home)];
      const awayId = teamMap[normalize(m.raw_away)];
      const leagueId = leagueMap[normalize(m.raw_league)];

      if (!homeId || !awayId || !leagueId) {
        addLog?.(
          `Nedostaje alias: ${m.raw_home} vs ${m.raw_away} (${m.raw_league})`
        );
        continue;
      }

      const { error: updateError } = await supabase
        .from("matches")
        .update({
          home_team_id: homeId,
          away_team_id: awayId,
          league_id: leagueId,
        })
        .eq("id", m.id);

      if (updateError) {
        console.error(updateError);
        addLog?.(`Update error ID ${m.id}`);
        continue;
      }

      updatedCount++;
    }

    addLog?.(`Mapiranje zavrseno: ${updatedCount} update-ova`);

  } catch (err) {
    console.error(err);
    addLog?.("Greska u mapMatchesToIds");
  }
};
