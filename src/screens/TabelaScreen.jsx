import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import StandingsTable from "./tabela/StandingsTable";
import TeamAliasesModal from "./tabela/TeamAliasesModal";
import {
  parseCSV,
  numberOrNull
} from "./tabela/standingsCsv";

export default function TabelaScreen({
  leagueId,
  leagueName,
  sofaLeagueName,
  countryId,
  onClose
}) {
  const [file, setFile] = useState(null);
  const [standingsDate, setStandingsDate] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [standings, setStandings] = useState([]);
  const [teamAliases, setTeamAliases] = useState({});
  const [loadingStandings, setLoadingStandings] = useState(true);

  const [selectedTeam, setSelectedTeam] = useState(null);


  // ==========================================
  // UČITAJ TABELU + TEAM ALIASE
  // ==========================================

async function loadStandings() {
  if (!leagueId) {
    setStandings([]);
    setTeamAliases({});
    setLoadingStandings(false);
    return;
  }

  setLoadingStandings(true);

  try {
    // ==========================================
    // 1. UČITAJ STANDINGS
    // ==========================================

    const { data: standingsData, error: standingsError } =
      await supabase
        .from("sofa_standings")
        .select("*")
        .eq("league_id", leagueId)
        .order("position", {
          ascending: true
        });

    if (standingsError) {
      throw new Error(
        `Greška pri učitavanju tabele: ${standingsError.message}`
      );
    }

    const rows = standingsData || [];

    setStandings(rows);

    // ==========================================
    // 2. IZVADI TEAM ID-EVE IZ TABELE
    // ==========================================

    const teamIds = [
      ...new Set(
        rows
          .map(row => Number(row.team_id))
          .filter(id => Number.isFinite(id))
      )
    ];

    // Ako nema timova, nema ni aliasa
    if (teamIds.length === 0) {
      setTeamAliases({});
      setLoadingStandings(false);
      return;
    }

    // ==========================================
    // 3. UČITAJ MOZART ALIASE ZA TE TIMOVE
    // ==========================================

    const { data: aliasesData, error: aliasesError } =
      await supabase
        .from("team_aliases")
        .select("team_id, alias, league_id, country_id")
        .in("team_id", teamIds);

    if (aliasesError) {
      console.error(
        "load team aliases:",
        aliasesError
      );

      setTeamAliases({});
    } else {
      console.log(
        "Učitani team aliases:",
        aliasesData
      );

      // ========================================
      // 4. NAPRAVI MAPU:
      //
      // {
      //   42204: ["MC Alger", "Mouloudia Alger"],
      //   12345: ["Neki Tim", "Neki Tim FC"]
      // }
      // ========================================

      const map = {};

      (aliasesData || []).forEach(aliasRow => {
        const teamId = Number(aliasRow.team_id);

        if (!Number.isFinite(teamId)) {
          return;
        }

        const alias =
          typeof aliasRow.alias === "string"
            ? aliasRow.alias.trim()
            : "";

        if (!alias) {
          return;
        }

        if (!map[teamId]) {
          map[teamId] = [];
        }

        // Spreči duplikate
        if (!map[teamId].includes(alias)) {
          map[teamId].push(alias);
        }
      });

      console.log(
        "TEAM ALIAS MAP:",
        map
      );

      setTeamAliases(map);
    }

  } catch (error) {
    console.error(
      "loadStandings:",
      error
    );

    setStatus(
      `❌ ${error.message}`
    );

    setStandings([]);
    setTeamAliases({});

  } finally {
    setLoadingStandings(false);
  }
}

  // ==========================================
  // INIT
  // ==========================================

  useEffect(() => {
    loadStandings();
  }, [leagueId]);


  // ==========================================
  // DOBIJ JEDAN NAZIV ZA PRIKAZ
  // ==========================================

  function getDisplayTeamName(row) {

    const aliases =
      teamAliases[
        Number(row.team_id)
      ];

    if (
      aliases &&
      aliases.length > 0
    ) {
      return aliases[0];
    }

    return (
      row.short_name ||
      row.team ||
      "Unknown"
    );
  }


  // ==========================================
  // IMPORT STANDINGS
  // ==========================================

  async function importStandings() {

    if (!file) {

      setStatus(
        "❌ Izaberi CSV fajl."
      );

      return;
    }
      if (!standingsDate) {
        setStatus(
          "❌ Izaberi datum stanja tabele."
        );
        return;
      }

    setLoading(true);

    setStatus(
      "⏳ Učitavam CSV..."
    );


    try {

      const text =
        await file.text();

      const csvRows =
        parseCSV(text);


      if (!csvRows.length) {

        throw new Error(
          "CSV ne sadrži nijedan red."
        );

      }


      const requiredColumns = [

        "league_id",
        "season_id",
        "position",
        "team_id",
        "team",
        "played",
        "wins",
        "draws",
        "losses",
        "goals_for",
        "goals_against",
        "goal_difference",
        "points"

      ];


      const firstRow =
        csvRows[0];


      for (
        const column of requiredColumns
      ) {

        if (
          !(column in firstRow)
        ) {

          throw new Error(
            `Nedostaje kolona "${column}".`
          );

        }

      }


      setStatus(
        `⏳ Pronađeno ${csvRows.length} timova. Pripremam import...`
      );


      const rows =
        csvRows.map(row => ({

            standings_date:
              standingsDate || null,

          league_id:
            numberOrNull(
              row.league_id
            ) ?? leagueId,

          season_id:
            numberOrNull(
              row.season_id
            ),

          league_name:
            row.league_name ||
            sofaLeagueName ||
            null,

          group_name:
            row.group ||
            null,

          position:
            numberOrNull(
              row.position
            ),

          team_id:
            numberOrNull(
              row.team_id
            ),

          team:
            row.team ||
            null,

          short_name:
            row.short_name ||
            null,

          played:
            numberOrNull(
              row.played
            ),

          wins:
            numberOrNull(
              row.wins
            ),

          draws:
            numberOrNull(
              row.draws
            ),

          losses:
            numberOrNull(
              row.losses
            ),

          goals_for:
            numberOrNull(
              row.goals_for
            ),

          goals_against:
            numberOrNull(
              row.goals_against
            ),

          goal_difference:
            numberOrNull(
              row.goal_difference
            ),

          points:
            numberOrNull(
              row.points
            )

        }));


      // ----------------------------------------
      // PROVERA LIGE
      // ----------------------------------------

      const wrongLeague =
        rows.find(
          row =>
            Number(row.league_id) !==
            Number(leagueId)
        );


      if (wrongLeague) {

        throw new Error(
          `CSV je za league ID ${wrongLeague.league_id}, a otvorena liga je ${leagueId}.`
        );

      }


      // ----------------------------------------
      // UPSERT
      // ----------------------------------------

      const { error } =
        await supabase
          .from("sofa_standings")
          .upsert(
            rows,
            {
              onConflict:
                "league_id,season_id,group_name,team_id"
            }
          );


      if (error) {

        console.error(
          "Standings import error:",
          error
        );

        throw new Error(
          error.message
        );

      }


      await loadStandings();


      setStatus(
        `✅ Tabela uspešno importovana.\n` +
        `Liga: ${sofaLeagueName || leagueName}\n` +
        `League ID: ${leagueId}\n` +
        `Timova: ${rows.length}`
      );


      setFile(null);
        setStandingsDate("");
    } catch (error) {

      console.error(
        "Tabela import:",
        error
      );

      setStatus(
        `❌ ${error.message}`
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================
  // RENDER
  // ==========================================

  return (

    <div
      style={{
        height: "100%",
        padding: 20,
        boxSizing: "border-box",
        overflow: "auto"
      }}
    >

      <button
        onClick={onClose}
        style={{
          padding: "8px 16px",
          fontWeight: "bold",
          marginBottom: 20
        }}
      >
        ← NAZAD
      </button>


      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto"
        }}
      >


        {/* ====================================
            NASLOV
        ==================================== */}

        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20
          }}
        >

          <h2
            style={{
              marginTop: 0,
              marginBottom: 8
            }}
          >
            {sofaLeagueName ||
              leagueName}
          </h2>


          <div
            style={{
              color: "#555"
            }}
          >
            SofaScore League ID:{" "}
            <b>{leagueId}</b>
          </div>

        </div>


        {/* ====================================
            IMPORT
        ==================================== */}

        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20
          }}
        >

          <h3>
            SOFA STANDINGS
          </h3>


          <p>
            Izaberi CSV tabelu preuzetu
            sa SofaScore-a.
          </p>


          <input
            type="file"
            accept=".csv,text/csv"
            onChange={e =>
              setFile(
                e.target.files?.[0] ||
                null
              )
            }
            disabled={loading}
          />
<div style={{ marginTop: 15 }}>
  <label>
    Datum stanja tabele:
  </label>

  <input
    type="date"
    value={standingsDate}
    onChange={e => setStandingsDate(e.target.value)}
    disabled={loading}
    style={{
      display: "block",
      marginTop: 5,
      padding: "8px"
    }}
  />
</div>

          {file && (

            <div
              style={{
                marginTop: 10,
                fontSize: 13
              }}
            >
              📄 {file.name}
            </div>

          )}


          <button
            onClick={importStandings}
            disabled={
              !file || loading
            }
            style={{
              display: "block",
              marginTop: 20,
              padding: "10px 20px",
              fontWeight: "bold"
            }}
          >

            {loading
              ? "⏳ IMPORT..."
              : "📥 IMPORT STANDINGS"}

          </button>


          {status && (

            <pre
              style={{
                marginTop: 20,
                whiteSpace: "pre-wrap",
                fontFamily:
                  "Arial, sans-serif",
                fontSize: 13
              }}
            >
              {status}
            </pre>

          )}

        </div>

      </div>

        {standings.length > 0 && standings[0].standings_date && (
          <div
            style={{
              marginBottom: 10,
              fontSize: 13,
              color: "#666"
            }}
          >
            Tabela ažurirana:{" "}
            <b>
              {new Date(
                standings[0].standings_date
              ).toLocaleDateString("sr-RS")}
            </b>
          </div>
        )}
<StandingsTable
  standings={standings}
  teamAliases={teamAliases}
  onTeamClick={setSelectedTeam}
  getDisplayTeamName={getDisplayTeamName}
/>
<TeamAliasesModal
  selectedTeam={selectedTeam}
  teamAliases={teamAliases}
  onClose={() => setSelectedTeam(null)}
/>
    </div>
  );
}


// ==========================================
// STILOVI
// ==========================================

const thStyle = {
  padding: "10px 8px",
  borderBottom:
    "1px solid #ddd",
  textAlign: "center",
  fontSize: 12
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom:
    "1px solid #eee",
  textAlign: "center",
  fontSize: 13
};
