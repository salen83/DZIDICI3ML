import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const HISTORY_TABLE = "prediction_history";
const RESULTS_TABLE = "screen1_matches";

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value) {
  if (!value) return null;

  const s = String(value).trim();

  let m = s.match(
    /^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4})/
  );

  if (m) {
    const d = new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1])
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3])
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);

  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value) {
  const d = parseDate(value);

  if (!d) return "";

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

function parseFT(value) {
  const s = String(value ?? "").trim();

  const m = s.match(/(\d+)\s*[:\-]\s*(\d+)/);

  if (!m) return null;

  return {
    home: Number(m[1]),
    away: Number(m[2]),
    text: `${m[1]}:${m[2]}`
  };
}

function actualOutcome(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "1";
  if (homeGoals < awayGoals) return "2";
  return "X";
}

function settleMarket(market, homeGoals, awayGoals) {
  const total = homeGoals + awayGoals;

  switch (market) {
    case "1":
      return homeGoals > awayGoals;

    case "X":
      return homeGoals === awayGoals;

    case "2":
      return homeGoals < awayGoals;

    case "GG":
      return homeGoals > 0 && awayGoals > 0;

    case "NG":
      return homeGoals === 0 || awayGoals === 0;

    case "O1.5":
      return total >= 2;

    case "O2.5":
      return total >= 3;

    case "U2.5":
      return total <= 2;

    case "O3.5":
      return total >= 4;

    default:
      return null;
  }
}

function buildResultKey(row) {
  const date = dateKey(
    row.match_date ||
    row.date ||
    row.datum
  );

  const home = normalizeText(
    row.home ||
    row.home_name
  );

  const away = normalizeText(
    row.away ||
    row.away_name
  );

  return [
    date,
    home,
    away
  ].join("|");
}

function buildPredictionKey(row) {
  return [
    dateKey(row.match_date),
    normalizeText(row.home_name),
    normalizeText(row.away_name)
  ].join("|");
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

function statusLabel(row) {
  if (row.is_correct === true) return "POGODAK";
  if (row.is_correct === false) return "PROMAŠAJ";
  return "ČEKA";
}

function statusClass(row) {
  if (row.is_correct === true) return "hit";
  if (row.is_correct === false) return "miss";
  return "pending";
}

export default function Screen5() {
  const [predictions, setPredictions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      predictionResponse,
      resultResponse
    ] = await Promise.all([
      supabase
        .from(HISTORY_TABLE)
        .select("*")
        .order("match_date", { ascending: false })
        .order("match_time", { ascending: false }),

      supabase
        .from(RESULTS_TABLE)
        .select("*")
        .order("match_date", { ascending: false })
    ]);

    if (predictionResponse.error) {
      console.error(
        "[Screen5] prediction_history:",
        predictionResponse.error
      );

      setError(
        predictionResponse.error.message ||
        "Greška pri učitavanju istorije."
      );

      setLoading(false);
      return;
    }

    if (resultResponse.error) {
      console.error(
        "[Screen5] screen1_matches:",
        resultResponse.error
      );

      setError(
        resultResponse.error.message ||
        "Greška pri učitavanju rezultata."
      );

      setLoading(false);
      return;
    }

    setPredictions(predictionResponse.data || []);
    setResults(resultResponse.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resultMap = useMemo(() => {
    const map = new Map();

    for (const row of results) {
      const key = buildResultKey(row);

      if (!key || key === "||") continue;

      map.set(key, row);
    }

    return map;
  }, [results]);

  const evaluated = useMemo(() => {
    return predictions.map(prediction => {
      const key = buildPredictionKey(prediction);
      const result = resultMap.get(key);

      if (!result) {
        return {
          ...prediction,
          result: null,
          actualFt: null,
          actualOutcome: null,
          is_correct: null
        };
      }

      const ft = parseFT(
        result.ft ||
        result.score ||
        result.result
      );

      if (!ft) {
        return {
          ...prediction,
          result,
          actualFt: null,
          actualOutcome: null,
          is_correct: null
        };
      }

      const correct = settleMarket(
        prediction.predicted_market,
        ft.home,
        ft.away
      );

      return {
        ...prediction,
        result,
        actualFt: ft.text,
        actualHomeGoals: ft.home,
        actualAwayGoals: ft.away,
        actualOutcome: actualOutcome(ft.home, ft.away),
        is_correct: correct
      };
    });
  }, [predictions, resultMap]);

  const stats = useMemo(() => {
    const settled = evaluated.filter(
      row => row.is_correct !== null
    );

    const hits = settled.filter(
      row => row.is_correct === true
    ).length;

    const misses = settled.filter(
      row => row.is_correct === false
    ).length;

    const pending = evaluated.length - settled.length;

    const accuracy =
      settled.length > 0
        ? hits / settled.length
        : null;

    const probabilities = settled
      .map(row => Number(row.predicted_probability))
      .filter(Number.isFinite);

    const avgProbability =
      probabilities.length > 0
        ? probabilities.reduce((a, b) => a + b, 0) /
          probabilities.length
        : null;

    const calibrationGap =
      avgProbability !== null && accuracy !== null
        ? accuracy - avgProbability
        : null;

    return {
      total: evaluated.length,
      settled: settled.length,
      hits,
      misses,
      pending,
      accuracy,
      avgProbability,
      calibrationGap
    };
  }, [evaluated]);

  const marketStats = useMemo(() => {
    const map = new Map();

    for (const row of evaluated) {
      const market = row.predicted_market || "—";

      if (!map.has(market)) {
        map.set(market, {
          market,
          total: 0,
          settled: 0,
          hits: 0,
          misses: 0,
          avgProbability: 0,
          probabilityCount: 0
        });
      }

      const item = map.get(market);

      item.total += 1;

      if (row.is_correct !== null) {
        item.settled += 1;

        if (row.is_correct) {
          item.hits += 1;
        } else {
          item.misses += 1;
        }

        const probability = Number(
          row.predicted_probability
        );

        if (Number.isFinite(probability)) {
          item.avgProbability += probability;
          item.probabilityCount += 1;
        }
      }
    }

    return [...map.values()]
      .map(item => ({
        ...item,
        accuracy:
          item.settled > 0
            ? item.hits / item.settled
            : null,
        avgProbability:
          item.probabilityCount > 0
            ? item.avgProbability / item.probabilityCount
            : null
      }))
      .sort((a, b) => {
        if (b.hits !== a.hits) {
          return b.hits - a.hits;
        }

        return b.total - a.total;
      });
  }, [evaluated]);

  const markets = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(
          predictions
            .map(row => row.predicted_market)
            .filter(Boolean)
        )
      ).sort()
    ];
  }, [predictions]);

  const visibleRows = useMemo(() => {
    return evaluated.filter(row => {
      if (
        marketFilter !== "all" &&
        row.predicted_market !== marketFilter
      ) {
        return false;
      }

      if (filter === "hit") {
        return row.is_correct === true;
      }

      if (filter === "miss") {
        return row.is_correct === false;
      }

      if (filter === "pending") {
        return row.is_correct === null;
      }

      return true;
    });
  }, [
    evaluated,
    filter,
    marketFilter
  ]);

  const settleHistory = useCallback(async () => {
    const updates = [];

    for (const row of evaluated) {
      if (!row.result || !row.actualFt) continue;

      if (
        row.actual_home_goals === undefined &&
        row.actualHomeGoals === undefined
      ) {
        continue;
      }

      const homeGoals =
        row.actualHomeGoals ??
        row.actual_home_goals;

      const awayGoals =
        row.actualAwayGoals ??
        row.actual_away_goals;

      if (
        !Number.isFinite(Number(homeGoals)) ||
        !Number.isFinite(Number(awayGoals))
      ) {
        continue;
      }

      updates.push({
        id: row.id,
        actual_home_goals: Number(homeGoals),
        actual_away_goals: Number(awayGoals),
        actual_ft: row.actualFt,
        actual_outcome: row.actualOutcome,
        is_correct:
          row.is_correct === true
            ? true
            : row.is_correct === false
              ? false
              : null,
        settled_at: new Date().toISOString()
      });
    }

    if (!updates.length) return;

    for (const update of updates) {
      const { error } = await supabase
        .from(HISTORY_TABLE)
        .update({
          actual_home_goals: update.actual_home_goals,
          actual_away_goals: update.actual_away_goals,
          actual_ft: update.actual_ft,
          actual_outcome: update.actual_outcome,
          is_correct: update.is_correct,
          settled_at: update.settled_at
        })
        .eq("id", update.id);

      if (error) {
        console.error(
          "[Screen5] settlement:",
          error
        );
      }
    }
  }, [evaluated]);

  useEffect(() => {
    if (!evaluated.length) return;

    settleHistory();
  }, [evaluated, settleHistory]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          Učitavanje istorije predikcija...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Istorija / Učenje
          </h1>

          <div style={styles.subtitle}>
            DB-HYBRID-v2 · predikcije naspram stvarnih rezultata
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={refreshing}
          style={styles.button}
        >
          {refreshing ? "Osvežavam..." : "↻ Osveži"}
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.statsGrid}>
        <Stat
          label="Predikcije"
          value={stats.total}
        />

        <Stat
          label="Završeno"
          value={stats.settled}
        />

        <Stat
          label="Pogoci"
          value={stats.hits}
        />

        <Stat
          label="Promašaji"
          value={stats.misses}
        />

        <Stat
          label="Tačnost"
          value={formatPercent(stats.accuracy)}
        />

        <Stat
          label="Čekaju rezultat"
          value={stats.pending}
        />

        <Stat
          label="Prosek verovatnoće"
          value={formatPercent(stats.avgProbability)}
        />

        <Stat
          label="Kalibracija"
          value={
            stats.calibrationGap === null
              ? "—"
              : `${stats.calibrationGap >= 0 ? "+" : ""}${(
                  stats.calibrationGap * 100
                ).toFixed(1)}%`
          }
        />
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          Učinak po marketu
        </div>

        {marketStats.length === 0 ? (
          <div style={styles.empty}>
            Još nema predikcija.
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Market</th>
                  <th style={styles.th}>Ukupno</th>
                  <th style={styles.th}>Završeno</th>
                  <th style={styles.th}>Pogoci</th>
                  <th style={styles.th}>Promašaji</th>
                  <th style={styles.th}>Tačnost</th>
                  <th style={styles.th}>Prosek P</th>
                </tr>
              </thead>

              <tbody>
                {marketStats.map(item => (
                  <tr key={item.market}>
                    <td style={styles.tdStrong}>
                      {item.market}
                    </td>

                    <td style={styles.td}>
                      {item.total}
                    </td>

                    <td style={styles.td}>
                      {item.settled}
                    </td>

                    <td style={styles.td}>
                      {item.hits}
                    </td>

                    <td style={styles.td}>
                      {item.misses}
                    </td>

                    <td style={styles.tdStrong}>
                      {formatPercent(item.accuracy)}
                    </td>

                    <td style={styles.td}>
                      {formatPercent(item.avgProbability)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.filters}>
          <div style={styles.sectionTitle}>
            Istorija predikcija
          </div>

          <div style={styles.filterGroup}>
            {[
              ["all", "Sve"],
              ["hit", "Pogoci"],
              ["miss", "Promašaji"],
              ["pending", "Čekaju"]
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  ...styles.filterButton,
                  ...(filter === key
                    ? styles.filterButtonActive
                    : {})
                }}
              >
                {label}
              </button>
            ))}

            <select
              value={marketFilter}
              onChange={e =>
                setMarketFilter(e.target.value)
              }
              style={styles.select}
            >
              {markets.map(market => (
                <option
                  key={market}
                  value={market}
                >
                  {market === "all"
                    ? "Svi marketi"
                    : market}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div style={styles.empty}>
            Nema podataka za izabrani filter.
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Datum</th>
                  <th style={styles.th}>Liga</th>
                  <th style={styles.th}>Meč</th>
                  <th style={styles.th}>Predikcija</th>
                  <th style={styles.th}>P</th>
                  <th style={styles.th}>Kvota</th>
                  <th style={styles.th}>Conf.</th>
                  <th style={styles.th}>FT</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.map(row => (
                  <tr
                    key={
                      row.id ||
                      `${row.match_date}-${row.home_name}-${row.away_name}`
                    }
                  >
                    <td style={styles.td}>
                      {row.match_date || "—"}
                    </td>

                    <td style={styles.td}>
                      {row.league_name || "—"}
                    </td>

                    <td style={styles.matchCell}>
                      <div>
                        {row.home_name}
                      </div>
                      <div style={styles.away}>
                        {row.away_name}
                      </div>
                    </td>

                    <td style={styles.tdStrong}>
                      {row.predicted_market}
                    </td>

                    <td style={styles.td}>
                      {formatPercent(
                        row.predicted_probability
                      )}
                    </td>

                    <td style={styles.td}>
                      {formatNumber(row.odd)}
                    </td>

                    <td style={styles.td}>
                      {row.confidence ?? "—"}
                    </td>

                    <td style={styles.tdStrong}>
                      {row.actual_ft || "—"}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.status,
                          ...(styles[
                            statusClass(row)
                          ] || {})
                        }}
                      >
                        {statusLabel(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>
        {label}
      </div>

      <div style={styles.statValue}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "20px",
    maxWidth: "1500px",
    margin: "0 auto",
    color: "#e5e7eb"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px"
  },

  title: {
    margin: 0,
    fontSize: "28px"
  },

  subtitle: {
    marginTop: "6px",
    color: "#9ca3af",
    fontSize: "14px"
  },

  button: {
    border: "1px solid #374151",
    background: "#111827",
    color: "#f9fafb",
    borderRadius: "8px",
    padding: "9px 14px",
    cursor: "pointer"
  },

  error: {
    background: "#3f1d1d",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    marginBottom: "16px"
  },

  stat: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "10px",
    padding: "14px"
  },

  statLabel: {
    color: "#9ca3af",
    fontSize: "12px",
    marginBottom: "6px"
  },

  statValue: {
    fontSize: "23px",
    fontWeight: 700
  },

  card: {
    background: "#0f172a",
    border: "1px solid #1f2937",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "16px",
    overflow: "hidden"
  },

  sectionTitle: {
    fontSize: "17px",
    fontWeight: 700,
    marginBottom: "14px"
  },

  tableWrap: {
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px"
  },

  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "1px solid #374151",
    color: "#9ca3af",
    whiteSpace: "nowrap"
  },

  td: {
    padding: "10px 8px",
    borderBottom: "1px solid #1f2937",
    whiteSpace: "nowrap"
  },

  tdStrong: {
    padding: "10px 8px",
    borderBottom: "1px solid #1f2937",
    fontWeight: 700,
    whiteSpace: "nowrap"
  },

  matchCell: {
    padding: "10px 8px",
    borderBottom: "1px solid #1f2937",
    minWidth: "190px"
  },

  away: {
    color: "#9ca3af",
    marginTop: "3px"
  },

  filters: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px"
  },

  filterGroup: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    flexWrap: "wrap"
  },

  filterButton: {
    border: "1px solid #374151",
    background: "#111827",
    color: "#d1d5db",
    borderRadius: "7px",
    padding: "7px 10px",
    cursor: "pointer"
  },

  filterButtonActive: {
    background: "#374151",
    color: "#fff"
  },

  select: {
    border: "1px solid #374151",
    background: "#111827",
    color: "#e5e7eb",
    borderRadius: "7px",
    padding: "7px 10px"
  },

  status: {
    display: "inline-block",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700
  },

  hit: {
    background: "#064e3b",
    color: "#a7f3d0"
  },

  miss: {
    background: "#7f1d1d",
    color: "#fecaca"
  },

  pending: {
    background: "#374151",
    color: "#d1d5db"
  },

  empty: {
    color: "#9ca3af",
    padding: "20px 0"
  }
};
