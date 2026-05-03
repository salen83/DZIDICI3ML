import { supabase } from "../supabase";

/**
 * =========================
 * DELETED SOFA LEAGUES
 * =========================
 */

export async function loadDeletedSofaLeagues() {
  const { data, error } = await supabase
    .from("deleted_sofa_leagues")
    .select("value");

  if (error) {
    console.log("❌ loadDeletedSofaLeagues:", error);
    return [];
  }

return (data || []).map(l => {
  try {
    return JSON.parse(l.value);
  } catch {
    return l.value;
  }
});
}

export async function saveDeletedSofaLeagues(leagues) {
  await supabase.from("deleted_sofa_leagues").delete().neq("value", "");

  const { error } = await supabase
    .from("deleted_sofa_leagues")
    .insert(leagues.map(l => ({ value: l })));

  if (error) console.log("❌ saveDeletedSofaLeagues:", error);
}

/**
 * =========================
 * DELETED SOFA TEAMS
 * =========================
 */

export async function loadDeletedSofaTeams() {
  const { data, error } = await supabase
    .from("deleted_sofa_teams")
    .select("id,value");

  if (error) {
    console.log("❌ loadDeletedSofaTeams:", error);
    return [];
  }

  return (data || []).map(t => t?.value || t?.id);
}

export async function saveDeletedSofaTeams(teams) {
  await supabase.from("deleted_sofa_teams").delete().neq("value", "");

  const { error } = await supabase
    .from("deleted_sofa_teams")
    .insert(teams.map(t => ({ value: t })));

  if (error) console.log("❌ saveDeletedSofaTeams:", error);
}

/**
 * =========================
 * PAIRING DATA LOADERS
 * =========================
 */

export async function loadLeagueAliases() {
  const { data, error } = await supabase
    .from("league_aliases")
    .select("alias,country");

  if (error) {
    console.log("❌ loadLeagueAliases:", error);
    return new Set();
  }

  return new Set(
    (data || []).map(d =>
      d.country ? `${d.alias}|||${d.country}` : d.alias
    )
  );
}

export async function loadTeamAliases() {
  const { data, error } = await supabase
    .from("team_aliases")
    .select("alias,source,team_id");

  if (error) {
    console.log("❌ loadTeamAliases:", error);
    return [];
  }

  return data || [];
}

/**
 * =========================
 * TEAM PAIR INSERT
 * =========================
 */

export async function insertTeamPairs(inserts) {
  if (!inserts?.length) return;

  const { error } = await supabase
    .from("team_aliases")
    .insert(inserts);

  if (error) {
    console.log("❌ insertTeamPairs:", error);
  }
}

/**
 * =========================
 * LEAGUE PAIR INSERT
 * =========================
 */

export async function insertLeaguePairs(inserts) {
  if (!inserts?.length) return;

  const { error } = await supabase
    .from("league_aliases")
    .insert(inserts);

  if (error) {
    console.log("❌ insertLeaguePairs:", error);
  }
}
 export async function getPairedTeamsSet() {
  const { data, error } = await supabase
    .from("team_aliases")
    .select("alias");

  if (error) {
    console.log("❌ getPairedTeamsSet:", error);
    return new Set();
  }

  return new Set((data || []).map(d => d.alias));
}
export async function insertTeamPairService(t1, t2) {
  const { data: existing } = await supabase
    .from("team_aliases")
    .select("*")
    .in("alias", [t1, t2]);

  let teamId;

  if (existing && existing.length > 0) {
    teamId = existing[0].team_id;
  } else {
    let { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("name", t1)
      .eq("source", "screen1")
      .maybeSingle();

    if (!team) {
      const res = await supabase
        .from("teams")
        .select("id")
        .eq("name", t2)
        .eq("source", "sofa")
        .maybeSingle();

      team = res.data;
    }

    if (!team) return;

    teamId = team.id;
  }

  const inserts = [];

  if (!existing?.find(e => e.alias === t1)) {
    inserts.push({
      alias: t1,
      team_id: teamId,
      source: "screen1"
    });
  }

  if (!existing?.find(e => e.alias === t2)) {
    inserts.push({
      alias: t2,
      team_id: teamId,
      source: "sofa"
    });
  }

  if (inserts.length) {
    await supabase.from("team_aliases").insert(inserts);
  }
}
export async function insertLeaguePairService(l1, l2, countryArg) {
const rawL2 =
  typeof l2 === "object"
    ? l2.liga
    : l2;

const cleanL2 = rawL2.includes("|||")
  ? rawL2.split("|||")[0].trim()
  : rawL2.trim();

const countryFromMap = countryArg || null;

  const { data: existing } = await supabase
    .from("league_aliases")
    .select("*")
     .in("alias", [l1, cleanL2]);

  const { data: league } = await supabase
    .from("leagues")
    .select("id, country, name")
    .eq("name", l1)
    .single();

  if (!league) return;

const { data: dbLeague } = await supabase
  .from("leagues")
  .select("country")
  .ilike("name", `%${cleanL2.trim()}%`)
  .maybeSingle();

const finalCountry =
  dbLeague?.country ||
  league?.country ||
  countryFromMap ||
  null;

  const leagueId = league.id;

  const inserts = [];

  // SCREEN1 alias
  if (!existing?.find(e => e.alias === l1)) {
    inserts.push({
      alias: l1,
      league_id: leagueId,
      country: finalCountry,
      source: "screen1"
    });
  }

  // SOFA alias
  if (!existing?.find(e => e.alias === cleanL2)) {
    inserts.push({
      alias: cleanL2,
      league_id: leagueId,
      country: finalCountry,
      source: "sofa"
    });
  }

  if (inserts.length) {
    await supabase.from("league_aliases").insert(inserts);
  }
}
export async function getPairedLeaguesSet() {
  const { data, error } = await supabase
    .from("league_aliases")
    .select("alias,country");

  if (error) {
    console.log("❌ getPairedLeaguesSet:", error);
    return new Set();
  }

  return new Set(
    (data || []).map(d =>
      d.country ? `${d.alias}|||${d.country}` : d.alias
    )
  );
}
