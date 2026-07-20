import { supabase } from "../supabase";

// =========================
// SOFA COUNTRIES
// =========================

export async function loadSofaCountries() {
  const { data, error } = await supabase
    .from("sofa_countries")
    .select("id,name")
    .order("name");

    console.log("Countries:", data);
    console.log("Countries error:", error);

  if (error) {
    console.error("loadSofaCountries:", error);
    return [];
  }

  return data || [];
}

// =========================
// COUNTRY ALIASES
// =========================

export async function loadCountryAliases() {
  const { data, error } = await supabase
    .from("country_aliases")
    .select("*")
    .order("league_name");

  if (error) {
    console.error("loadCountryAliases:", error);
    return [];
  }

  return data || [];
}

export async function saveCountryAliases(leagues, country) {
  if (!leagues?.length || !country) return;

  const rows = leagues.map((league) => ({
    league_name: league,
    country_id: country.id,
  }));

  const { error } = await supabase
    .from("country_aliases")
    .upsert(rows, {
      onConflict: "league_name"
    });

  if (error) {
    console.error("saveCountryAliases:", error);
  }
}

export async function deleteCountryAlias(leagueName) {
  const { error } = await supabase
    .from("country_aliases")
    .delete()
    .eq("league_name", leagueName);

  if (error) {
    console.error("deleteCountryAlias:", error);
  }
}
