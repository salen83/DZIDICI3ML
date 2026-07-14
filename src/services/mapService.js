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
    .select("alias,country_id");

  if (error) {
    console.log("❌ loadLeagueAliases:", error);
    return new Set();
  }

return new Set(
  (data || []).map(d =>
    d.country_id ? `${d.alias}|||${d.country_id}` : d.alias
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
export async function insertTeamPairService(screen3Team, sofaTeam) {
  const { data: existing } = await supabase
    .from("team_aliases")
    .select("*")
    .in("alias", [screen3Team, sofaTeam]);

  let teamId;

  if (existing && existing.length > 0) {
    teamId = existing[0].team_id;
  } else {
     let { data: team } = await supabase
  .from("sofa_teams")
  .select("id")
  .eq("name", screen3Team)
  .eq("source", "screen3")
  .maybeSingle();

    if (!team) {
      const res = await supabase
        .from("sofa_teams")
        .select("id")
        .eq("name", sofaTeam)
        .maybeSingle();

      team = res.data;
    }

    if (!team) return;

    teamId = team.id;
  }

  const inserts = [];

if (!existing?.find(e => e.alias === screen3Team)) {
    inserts.push({
      alias: screen3Team,
      team_id: teamId,
      source: "screen3"
    });
  }

if (!existing?.find(e => e.alias === sofaTeam)) {
    inserts.push({
      alias: sofaTeam,
      team_id: teamId,
      source: "sofa"
    });
  }

  if (inserts.length) {
    await supabase.from("team_aliases").insert(inserts);
  }
}
export async function insertLeaguePairService(screen3League, l2, countryArg) {
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
    .in("alias", [screen3League, cleanL2]);

  const { data: league } = await supabase
    .from("sofa_leagues")
    .select("id, country_id, name")
    .eq("name", screen3League)
    .single();

  if (!league) return;

const { data: dbLeague } = await supabase
  .from("sofa_leagues")
  .select("country_id")
  .ilike("name", `%${cleanL2.trim()}%`)
  .maybeSingle();

const finalCountry =
  dbLeague?.country_id ||
  league?.country_id ||
  countryFromMap ||
  null;

  const leagueId = league.id;

  const inserts = [];

  // SCREEN3 alias
  if (!existing?.find(e => e.alias === screen3League)) {
    inserts.push({
      alias: screen3League,
      league_id: leagueId,
      country_id: finalCountry,
      source: "screen3"
    });
  }

  // SOFA alias
  if (!existing?.find(e => e.alias === cleanL2)) {
    inserts.push({
      alias: cleanL2,
      league_id: leagueId,
      country_id: finalCountry,
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
    .select("alias,country_id");

  if (error) {
    console.log("❌ getPairedLeaguesSet:", error);
    return new Set();
  }

return new Set(
  (data || []).map(d =>
    d.country_id ? `${d.alias}|||${d.country_id}` : d.alias
  )
);
}
