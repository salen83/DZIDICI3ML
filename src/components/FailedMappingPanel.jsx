import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function FailedMappingPanel({
  failedMappings,
  setFailedMappings,
  currentFailIndex,
  setCurrentFailIndex,
  onDelete
}) {
  const currentFailedMatch =
    failedMappings?.[currentFailIndex] || null;

  const [failFix, setFailFix] = useState({
    liga: "",
    home: "",
    away: ""
  });

  const normalize = (str = "") =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    if (!currentFailedMatch) return;

    console.log("🧠 currentFailedMatch CHANGED:", currentFailedMatch);

    setFailFix({
      liga: currentFailedMatch.mappedLeague || "",
      home: currentFailedMatch.mappedHome || "",
      away: currentFailedMatch.mappedAway || ""
    });

    console.log("🧠 failFix initialized:", {
      liga: currentFailedMatch.mappedLeague || "",
      home: currentFailedMatch.mappedHome || "",
      away: currentFailedMatch.mappedAway || ""
    });
  }, [currentFailedMatch]);

  if (!currentFailedMatch) return null;

  const resolveTeamIdFromAlias = async (name) => {
    if (!name) return null;

    const clean = normalize(name);

    console.log("🔍 resolveTeamIdFromAlias START:", name);

    const { data: aliases, error } = await supabase
      .from("team_aliases")
      .select("team_id, alias");

    if (error) {
      console.error("❌ alias fetch error:", error);
      return null;
    }

    const match = aliases.find(a =>
      normalize(a.alias) === clean
    );

    if (match) {
      console.log("✅ ALIAS MATCH FOUND:", match);
      return match.team_id;
    }

    console.log("⚠️ no alias match, fallback to teams");

    const { data: team } = await supabase
      .from("teams")
      .select("id, name")
      .eq("name", name)
      .maybeSingle();

    console.log("🧾 teams fallback:", team);

    return team?.id || null;
  };

  const ensureTeamAndAlias = async (sofaName, screen3Name, country) => {
    if (!sofaName || !screen3Name) return null;

    console.log("🧩 ensureTeamAndAlias START:", {
      sofaName,
      screen3Name,
      country
    });

    let teamId = await resolveTeamIdFromAlias(screen3Name);

    console.log("🔗 resolved teamId:", teamId);

    if (!teamId) {
      console.log("➕ inserting new team:", screen3Name);

      const { data: inserted, error } = await supabase
        .from("teams")
        .insert({
          name: screen3Name,
          country_id: null,
          source: "screen3"
        })
        .select("id")
        .single();

      if (error) {
        console.error("❌ TEAM INSERT ERROR:", error);
        return null;
      }

      teamId = inserted.id;

      console.log("✅ new team created:", teamId);
    }

    const { data: existingAlias } = await supabase
      .from("team_aliases")
      .select("id")
      .eq("team_id", teamId)
      .eq("source", "sofa")
      .eq("alias", sofaName)
      .maybeSingle();

    console.log("🔎 alias check:", {
      teamId,
      sofaName,
      existingAlias
    });

    if (!existingAlias) {
      const { error } = await supabase
        .from("team_aliases")
        .insert({
          team_id: teamId,
          alias: sofaName,
          source: "sofa"
        });

      if (error) {
        console.error("❌ TEAM ALIAS INSERT ERROR:", error);
      } else {
        console.log("✅ alias inserted:", sofaName);
      }
    } else {
      console.log("ℹ️ alias already exists");
    }

    return teamId;
  };

  const saveAndNext = async () => {
    try {
      console.log("💾 SAVE START");

      const country = currentFailedMatch.country || null;

      await ensureTeamAndAlias(
        currentFailedMatch.home,
        failFix.home,
        country
      );

      await ensureTeamAndAlias(
        currentFailedMatch.away,
        failFix.away,
        country
      );

      const updated = [...failedMappings];

      updated[currentFailIndex] = {
        ...updated[currentFailIndex],
        mappedLeague: failFix.liga,
        mappedHome: failFix.home,
        mappedAway: failFix.away
      };

      setFailedMappings(updated);

      console.log("🔁 updated failedMappings entry");

      if (currentFailIndex < updated.length - 1) {
        console.log("➡️ NEXT FAIL");
        setCurrentFailIndex(i => i + 1);
      }

      console.log("✅ SAVED FLOW END");
    } catch (err) {
      console.error("❌ SAVE FAILED:", err);
    }
  };
const blockLeague = () => {
    const blocked = JSON.parse(
      localStorage.getItem("blockedSofaLeagues") || "[]"
    );

    if (!blocked.includes(currentFailedMatch.liga)) {
      blocked.push(currentFailedMatch.liga);
    }

    localStorage.setItem(
      "blockedSofaLeagues",
      JSON.stringify(blocked)
    );

    console.log("🚫 BLOCKED LEAGUE:", currentFailedMatch.liga);
  };

  return (
    <div style={{ border: "1px solid red", padding: 10, marginBottom: 10 }}>
      <div>
        Fail {currentFailIndex + 1} / {failedMappings.length}
      </div>

      <div><b>Country:</b> {currentFailedMatch.country}</div>
      <div><b>Liga:</b> {currentFailedMatch.liga}</div>
      <div><b>Home:</b> {currentFailedMatch.home}</div>
      <div><b>Away:</b> {currentFailedMatch.away}</div>

      <div style={{ marginTop: 10 }}>
        <div>Screen3 liga:</div>
        <input
          value={failFix.liga}
          onChange={(e) =>
            setFailFix(p => ({ ...p, liga: e.target.value }))
          }
        />
      </div>

      <div>
        <div>Screen3 home:</div>
        <input
          value={failFix.home}
          onChange={(e) =>
            setFailFix(p => ({ ...p, home: e.target.value }))
          }
        />
      </div>

      <div>
        <div>Screen3 away:</div>
        <input
          value={failFix.away}
          onChange={(e) =>
            setFailFix(p => ({ ...p, away: e.target.value }))
          }
        />
      </div>

      <button onClick={saveAndNext}>
        Sačuvaj i sledeći fail
      </button>
<button
  onClick={() => onDelete?.(currentFailedMatch.id)}
  style={{ marginLeft: 10 }}
>
  Obriši Sofa meč
</button>
<button
    onClick={blockLeague}
    style={{ marginLeft: 10 }}
  >
    Blokiraj ligu
  </button>
    </div>
  );
}
