import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

export default function Screen2Liga() {
  const [leagueInput, setLeagueInput] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [leagueName, setLeagueName] = useState("");

  const [seasons, setSeasons] = useState([]);
  const [seasonId, setSeasonId] = useState("");

  const [standings, setStandings] = useState([]);
  const [events, setEvents] = useState([]);

  const [round, setRound] = useState("all");

  const [loadingLeague, setLoadingLeague] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  async function fetchAllStandingsForLeague(id) {
    const rows = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("sofa_standings")
        .select("*")
        .eq("league_id", id)
        .order("season_id", { ascending: false })
        .order("position", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const page = data || [];
      rows.push(...page);

      if (page.length < pageSize) break;

      from += pageSize;
    }

    return rows;
  }

  async function loadLeagueById() {
    const value = leagueInput.trim();

    if (!/^\d+$/.test(value)) {
      setError("League ID mora biti broj.");
      return;
    }

    setLoadingLeague(true);
    setError("");
    setStandings([]);
    setEvents([]);
    setSeasons([]);
    setSeasonId("");
    setRound("all");

    try {
      const rows = await fetchAllStandingsForLeague(Number(value));

      if (!rows.length) {
        setError(
          `League ID ${value} nije pronađen u sofa_standings.`
        );
        setLeagueId("");
        setLeagueName("");
        return;
      }

      const name = rows[0].league_name || `Liga ${value}`;

      const seasonMap = new Map();

      rows.forEach((row) => {
        if (row.season_id == null) return;

        if (!seasonMap.has(String(row.season_id))) {
          seasonMap.set(String(row.season_id), {
            season_id: row.season_id,
            label:
              row.event_season ||
              `Sezona ${row.season_id}`,
          });
        }
      });

      const seasonList = Array.from(seasonMap.values()).sort(
        (a, b) => Number(b.season_id) - Number(a.season_id)
      );

      setLeagueId(value);
      setLeagueName(name);
      setSeasons(seasonList);

      const newestSeason = seasonList[0];

      if (newestSeason) {
        setSeasonId(String(newestSeason.season_id));
      }
    } catch (err) {
      console.error("[Screen2Liga] load league error:", err);
      setError(
        err?.message || "Greška pri učitavanju lige."
      );
    } finally {
      setLoadingLeague(false);
    }
  }

  useEffect(() => {
    if (!leagueId || !seasonId) return;

    let cancelled = false;

    async function loadSeasonData() {
      setLoadingData(true);
      setError("");

      try {
        const [{ data: standingRows, error: standingsError }, { data: eventRows, error: eventsError }] =
          await Promise.all([
            supabase
              .from("sofa_standings")
              .select("*")
              .eq("league_id", Number(leagueId))
              .eq("season_id", Number(seasonId))
              .order("position", { ascending: true }),

            supabase
              .from("sofa_league_events")
              .select("*")
              .eq("league_id", Number(leagueId))
              .eq("season_id", Number(seasonId))
              .order("round", { ascending: true })
              .order("start_timestamp", { ascending: true }),
          ]);

        if (cancelled) return;

        if (standingsError) throw standingsError;
        if (eventsError) throw eventsError;

        setStandings(standingRows || []);
        setEvents(eventRows || []);

        console.log(
          "[Screen2Liga] tabela:",
          standingRows?.length || 0,
          "raspored:",
          eventRows?.length || 0
        );
      } catch (err) {
        if (cancelled) return;

        console.error(
          "[Screen2Liga] season data error:",
          err
        );

        setError(
          err?.message ||
            "Greška pri učitavanju podataka sezone."
        );

        setStandings([]);
        setEvents([]);
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadSeasonData();

    return () => {
      cancelled = true;
    };
  }, [leagueId, seasonId]);

  const rounds = useMemo(() => {
    return Array.from(
      new Set(
        events
          .map((e) => e.round)
          .filter((r) => r !== null && r !== undefined)
      )
    ).sort((a, b) => Number(a) - Number(b));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (round === "all") return events;

    return events.filter(
      (event) => String(event.round) === String(round)
    );
  }, [events, round]);

  const selectedSeason = seasons.find(
    (s) => String(s.season_id) === String(seasonId)
  );

  function formatDate(value) {
    if (!value) return "—";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("sr-RS");
  }

  function formatTime(value) {
    if (!value) return "—";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleTimeString("sr-RS", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function result(event) {
    if (
      event.home_score === null ||
      event.away_score === null ||
      event.home_score === undefined ||
      event.away_score === undefined
    ) {
      return "—";
    }

    return `${event.home_score} - ${event.away_score}`;
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          i++;
        }

        row.push(cell);
        cell = "";

        if (row.some((value) => value.trim() !== "")) {
          rows.push(row);
        }

        row = [];
        continue;
      }

      cell += char;
    }

    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map((h) =>
      h.replace(/^\uFEFF/, "").trim()
    );

    return rows.slice(1).map((values) => {
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = (values[index] ?? "").trim();
      });

      return obj;
    });
  }

  function csvNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  function csvText(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return String(value);
  }

  async function importRoundsCSV(file) {
    if (!file) return;

    setError("");
    setLoadingData(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (!rows.length) {
        throw new Error("CSV fajl je prazan.");
      }

      const requiredColumns = [
        "league_id",
        "season_id",
        "round",
        "event_id",
        "start_timestamp",
        "home_team_id",
        "home_team",
        "away_team_id",
        "away_team",
        "status",
      ];

      const missing = requiredColumns.filter(
        (column) => !(column in rows[0])
      );

      if (missing.length) {
        throw new Error(
          `CSV nema potrebne kolone: ${missing.join(", ")}`
        );
      }

      const leagueIds = [
        ...new Set(
          rows
            .map((row) => row.league_id)
            .filter(Boolean)
        ),
      ];

      const seasonIds = [
        ...new Set(
          rows
            .map((row) => row.season_id)
            .filter(Boolean)
        ),
      ];

      if (leagueIds.length !== 1 || seasonIds.length !== 1) {
        throw new Error(
          `CSV mora sadržati jednu ligu i jednu sezonu. ` +
          `Pronađeno liga: ${leagueIds.join(", ")}; ` +
          `sezona: ${seasonIds.join(", ")}`
        );
      }

      const csvLeagueId = Number(leagueIds[0]);
      const csvSeasonId = Number(seasonIds[0]);

      if (!Number.isFinite(csvLeagueId) || !Number.isFinite(csvSeasonId)) {
        throw new Error(
          "league_id i season_id moraju biti numeričke vrednosti."
        );
      }

      const payload = rows.map((row) => ({
        league_id: csvNumber(row.league_id),
        season_id: csvNumber(row.season_id),
        round: csvNumber(row.round),
        event_id: csvNumber(row.event_id),
        start_timestamp: csvText(row.start_timestamp),
        match_date: row.start_timestamp
          ? row.start_timestamp.slice(0, 10)
          : null,
        match_time: row.start_timestamp
          ? row.start_timestamp.slice(11, 16)
          : null,

        home_team_id: csvNumber(row.home_team_id),
        home_team: csvText(row.home_team),
        home_short_name: csvText(row.home_short_name),

        away_team_id: csvNumber(row.away_team_id),
        away_team: csvText(row.away_team),
        away_short_name: csvText(row.away_short_name),

        home_score: csvNumber(row.home_score),
        away_score: csvNumber(row.away_score),

        status: csvText(row.status),
        status_description: csvText(row.status_description),

        tournament: csvText(row.tournament),
        event_season: csvText(row.event_season),

        imported_at: new Date().toISOString(),
      }));

      const chunkSize = 500;

      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);

        const { error } = await supabase
          .from("sofa_league_events")
          .upsert(chunk, {
            onConflict: "league_id,season_id,event_id",
          });

        if (error) {
          throw error;
        }
      }

      setLeagueInput(String(csvLeagueId));
      setLeagueId(String(csvLeagueId));

      const { data: seasonRows, error: seasonError } =
        await supabase
          .from("sofa_standings")
          .select("season_id, league_name")
          .eq("league_id", csvLeagueId);

      if (seasonError) {
        throw seasonError;
      }

      const seasonMap = new Map();

      (seasonRows || []).forEach((row) => {
        if (row.season_id == null) return;

        seasonMap.set(String(row.season_id), {
          season_id: row.season_id,
          label: `Sezona ${row.season_id}`,
        });
      });

      seasonMap.set(String(csvSeasonId), {
        season_id: csvSeasonId,
        label:
          rows[0].event_season ||
          `Sezona ${csvSeasonId}`,
      });

      const seasonList = Array.from(
        seasonMap.values()
      ).sort(
        (a, b) =>
          Number(b.season_id) - Number(a.season_id)
      );

      setSeasons(seasonList);
      setSeasonId(String(csvSeasonId));

      alert(
        `Import završen.\n\n` +
        `Liga: ${csvLeagueId}\n` +
        `Sezona: ${csvSeasonId}\n` +
        `Utakmica: ${payload.length}`
      );
    } catch (err) {
      console.error(
        "[Screen2Liga] CSV import error:",
        err
      );

      setError(
        err?.message ||
          "Greška pri importu CSV rasporeda."
      );
    } finally {
      setLoadingData(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Statistika lige</h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "end",
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span>League ID</span>

          <input
            type="text"
            inputMode="numeric"
            value={leagueInput}
            placeholder="npr. 169"
            onChange={(e) => setLeagueInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadLeagueById();
              }
            }}
            style={{
              minWidth: 180,
              padding: "8px 10px",
            }}
          />
        </label>

        <button
          type="button"
          onClick={loadLeagueById}
          disabled={loadingLeague}
          style={{
            padding: "9px 16px",
            cursor: loadingLeague ? "default" : "pointer",
          }}
        >
          {loadingLeague ? "Učitavam..." : "Učitaj ligu"}
        </button>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <span>Import rasporeda CSV</span>

          <input
            type="file"
            accept=".csv,text/csv"
            disabled={loadingData}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                importRoundsCSV(file);
              }

              e.target.value = "";
            }}
          />
        </label>
      </div>

      {leagueId && (
        <div style={{ marginBottom: 20 }}>
          <div>
            <strong>Liga:</strong>{" "}
            {leagueName} ({leagueId})
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span>Sezona</span>

              <select
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
              >
                {seasons.map((season) => (
                  <option
                    key={season.season_id}
                    value={season.season_id}
                  >
                    {season.label} ({season.season_id})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span>Kolo</span>

              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
              >
                <option value="all">Sva kola</option>

                {rounds.map((r) => (
                  <option key={r} value={r}>
                    Kolo {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {selectedSeason && (
        <div style={{ marginBottom: 15 }}>
          <strong>Sezona:</strong>{" "}
          {selectedSeason.label} ({selectedSeason.season_id})
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 15,
            border: "1px solid #c00",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      {loadingData && (
        <div style={{ marginBottom: 15 }}>
          Učitavam podatke...
        </div>
      )}

      <h3>Tabela lige</h3>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tim</th>
              <th>O</th>
              <th>P</th>
              <th>N</th>
              <th>I</th>
              <th>DG</th>
              <th>PG</th>
              <th>GR</th>
              <th>Bod</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((team, index) => (
              <tr
                key={`${team.team_id}-${team.position}-${index}`}
              >
                <td>{team.position ?? index + 1}</td>
                <td>
                  {team.team || team.short_name || "—"}
                </td>
                <td>{team.played ?? 0}</td>
                <td>{team.wins ?? 0}</td>
                <td>{team.draws ?? 0}</td>
                <td>{team.losses ?? 0}</td>
                <td>{team.goals_for ?? 0}</td>
                <td>{team.goals_against ?? 0}</td>
                <td>{team.goal_difference ?? 0}</td>
                <td>{team.points ?? 0}</td>
              </tr>
            ))}

            {!standings.length && !loadingData && (
              <tr>
                <td colSpan="10">
                  Nema podataka za izabranu sezonu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 30 }}>
        Raspored / kola
      </h3>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Kolo</th>
              <th>Datum</th>
              <th>Vreme</th>
              <th>Domaćin</th>
              <th>Gost</th>
              <th>Rezultat</th>
              <th>Status</th>
              <th>Event ID</th>
            </tr>
          </thead>

          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.event_id}>
                <td>{event.round ?? "—"}</td>
                <td>{formatDate(event.start_timestamp)}</td>
                <td>{formatTime(event.start_timestamp)}</td>
                <td>
                  {event.home_team ||
                    event.home_short_name ||
                    "—"}
                </td>
                <td>
                  {event.away_team ||
                    event.away_short_name ||
                    "—"}
                </td>
                <td>{result(event)}</td>
                <td>
                  {event.status_description ||
                    event.status ||
                    "—"}
                </td>
                <td>{event.event_id}</td>
              </tr>
            ))}

            {!filteredEvents.length && !loadingData && (
              <tr>
                <td colSpan="8">
                  Nema utakmica za izabrani filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
