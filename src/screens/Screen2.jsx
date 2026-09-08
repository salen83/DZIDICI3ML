import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import "./Screen2.css";

/*
  SCREEN 2
  ---------------------------------------------------------
  Statistics Center

  Izvor podataka:
  - team_primary_leagues
  - team_league_statistics
  - team_form_statistics
  - team_home_away_form
  - team_goal_statistics
  - team_recency_statistics
  - team_opponent_strength
  - team_h2h_statistics
  - league_statistics
  - team_aliases
  - sofa_teams

  Screen2 NE računa statistiku u React-u.
  Sve statistike dolaze direktno iz Supabase tabela.
*/

const TEAM_PAGE_SIZE = 500;
const H2H_PAGE_SIZE = 500;

function formatPct(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function formatNum(value, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function formatInt(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("sr-Latn-RS");
}

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleDateString("sr-Latn-RS");
}

function safe(value) {
  return value === null || value === undefined || value === ""
    ? "—"
    : value;
}

function getDisplayTeamName(teamId, aliases, sofaTeams) {
  if (!teamId) return "—";

  const id = Number(teamId);

  const alias = aliases.find((x) => Number(x.team_id) === id);

  if (alias?.alias) return alias.alias;

  const sofa = sofaTeams.find((x) => Number(x.id) === id);

  if (sofa?.name) return sofa.name;

  return `Team ${id}`;
}

function getLeagueName(leagueId, primaryLeagues, leagueStats) {
  if (!leagueId) return "—";

  const id = Number(leagueId);

  const p = primaryLeagues.find(
    (x) => Number(x.primary_league_id) === id
  );

  if (p?.primary_league_name) {
    return p.primary_league_name;
  }

  const l = leagueStats.find(
    (x) => Number(x.league_id) === id
  );

  return l?.league_name || `Liga ${id}`;
}

async function fetchAll(table, select = "*", pageSize = 500) {
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`${table}: ${error.message}`);

    const rows = data || [];

    all = all.concat(rows);

    if (rows.length < pageSize) break;

    from += pageSize;
  }

  return all;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="s2-stat-card">
      <div className="s2-stat-label">{label}</div>
      <div className="s2-stat-value">{value}</div>
      {sub ? <div className="s2-stat-sub">{sub}</div> : null}
    </div>
  );
}

function Section({ title, subtitle, children, right }) {
  return (
    <section className="s2-section">
      <div className="s2-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>

      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
  empty = "Nema podataka."
}) {
  if (!rows.length) {
    return <div className="s2-empty">{empty}</div>;
  }

  return (
    <div className="s2-table-wrap">
      <table className="s2-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row.__key || row.id || index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : safe(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricRow({ label, home, away }) {
  return (
    <div className="s2-metric-row">
      <div>{label}</div>
      <strong>{safe(home)}</strong>
      <strong>{safe(away)}</strong>
    </div>
  );
}

function TeamProfile({
  team,
  primary,
  leagueStats,
  leagueForm,
  homeAway,
  goals,
  recency,
  strength,
  h2h,
  aliases,
  sofaTeams,
  onClose
}) {
  const teamName = getDisplayTeamName(
    team.team_id,
    aliases,
    sofaTeams
  );

  const leagueName = getLeagueName(
    team.league_id,
    primary,
    leagueStats
  );

  const opponents = h2h.filter(
    (x) =>
      Number(x.team_a_id) === Number(team.team_id) ||
      Number(x.team_b_id) === Number(team.team_id)
  );

  return (
    <div className="s2-profile">
      <div className="s2-profile-top">
        <div>
          <div className="s2-eyebrow">TEAM PROFILE</div>
          <h2>{teamName}</h2>
          <div className="s2-profile-meta">
            ID {team.team_id} · {leagueName}
          </div>
        </div>

        <button
          className="s2-button secondary"
          onClick={onClose}
        >
          Zatvori profil
        </button>
      </div>

      <div className="s2-kpi-grid">
        <StatCard
          label="Liga"
          value={leagueName}
        />

        <StatCard
          label="Pozicija"
          value={safe(team.standings_position)}
        />

        <StatCard
          label="Odigrano"
          value={formatInt(team.standings_played)}
        />

        <StatCard
          label="Bodovi"
          value={formatInt(team.standings_points)}
        />

        <StatCard
          label="Istorijske utakmice"
          value={formatInt(team.league_matches_played)}
        />

        <StatCard
          label="Potvrda"
          value={team.confirmation_level || "—"}
        />
      </div>

      <Section
        title="Osnovna statistika"
        subtitle="team_league_statistics"
      >
        {leagueForm ? (
          <div className="s2-metric-grid">
            <MetricRow
              label="Utakmice"
              home={formatInt(leagueForm.matches_played)}
              away="—"
            />

            <MetricRow
              label="Pobede"
              home={formatInt(leagueForm.wins)}
              away={formatPct(
                leagueForm.matches_played
                  ? (leagueForm.wins / leagueForm.matches_played) * 100
                  : null
              )}
            />

            <MetricRow
              label="Nerešeno"
              home={formatInt(leagueForm.draws)}
              away={formatPct(
                leagueForm.matches_played
                  ? (leagueForm.draws / leagueForm.matches_played) * 100
                  : null
              )}
            />

            <MetricRow
              label="Porazi"
              home={formatInt(leagueForm.losses)}
              away={formatPct(
                leagueForm.matches_played
                  ? (leagueForm.losses / leagueForm.matches_played) * 100
                  : null
              )}
            />

            <MetricRow
              label="Golovi"
              home={`${formatInt(leagueForm.goals_for)} : ${formatInt(
                leagueForm.goals_against
              )}`}
              away={`GD ${formatInt(leagueForm.goal_difference)}`}
            />

            <MetricRow
              label="Bodovi / utakmici"
              home={formatNum(leagueForm.ppg)}
              away="PPG"
            />

            <MetricRow
              label="Over 1.5"
              home={formatPct(leagueForm.over_15_pct)}
              away={formatInt(leagueForm.over_15)}
            />

            <MetricRow
              label="Over 2.5"
              home={formatPct(leagueForm.over_25_pct)}
              away={formatInt(leagueForm.over_25)}
            />

            <MetricRow
              label="Over 3.5"
              home={formatPct(leagueForm.over_35_pct)}
              away={formatInt(leagueForm.over_35)}
            />

            <MetricRow
              label="Over 4.5"
              home={formatPct(leagueForm.over_45_pct)}
              away={formatInt(leagueForm.over_45)}
            />

            <MetricRow
              label="GG"
              home={formatPct(leagueForm.gg_pct)}
              away={formatInt(leagueForm.gg)}
            />

            <MetricRow
              label="NG"
              home={formatPct(leagueForm.ng_pct)}
              away={formatInt(leagueForm.ng)}
            />

            <MetricRow
              label="Clean Sheet"
              home={formatPct(leagueForm.clean_sheet_pct)}
              away={formatInt(leagueForm.clean_sheet)}
            />

            <MetricRow
              label="Failed To Score"
              home={formatPct(leagueForm.failed_to_score_pct)}
              away={formatInt(leagueForm.failed_to_score)}
            />
          </div>
        ) : (
          <div className="s2-empty">
            Nema osnovne statistike za ovaj tim.
          </div>
        )}
      </Section>

      <Section
        title="Forma — poslednjih 5 / 10 / 15"
        subtitle="team_form_statistics"
      >
        {leagueForm ? (
          <div className="s2-form-grid">
            {[
              ["LAST 5", "last5"],
              ["LAST 10", "last10"],
              ["LAST 15", "last15"]
            ].map(([label, prefix]) => (
              <div className="s2-form-card" key={prefix}>
                <h3>{label}</h3>

                <div className="s2-form-line">
                  <span>Utakmice</span>
                  <b>{formatInt(leagueForm[`${prefix}_matches`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>W / D / L</span>
                  <b>
                    {formatInt(leagueForm[`${prefix}_wins`])} /{" "}
                    {formatInt(leagueForm[`${prefix}_draws`])} /{" "}
                    {formatInt(leagueForm[`${prefix}_losses`])}
                  </b>
                </div>

                <div className="s2-form-line">
                  <span>GF / GA</span>
                  <b>
                    {formatInt(leagueForm[`${prefix}_gf`])} /{" "}
                    {formatInt(leagueForm[`${prefix}_ga`])}
                  </b>
                </div>

                <div className="s2-form-line">
                  <span>PPG</span>
                  <b>{formatNum(leagueForm[`${prefix}_ppg`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>GG</span>
                  <b>{formatPct(leagueForm[`${prefix}_gg_pct`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>Over 2.5</span>
                  <b>{formatPct(leagueForm[`${prefix}_over25_pct`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>Clean Sheet</span>
                  <b>{formatPct(leagueForm[`${prefix}_cs_pct`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>Failed To Score</span>
                  <b>{formatPct(leagueForm[`${prefix}_fts_pct`])}</b>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {leagueForm ? (
          <div className="s2-trend-grid">
            <StatCard
              label="PPG trend 5 vs 15"
              value={formatNum(leagueForm.ppg_trend_5_vs_15)}
            />

            <StatCard
              label="GF trend 5 vs 15"
              value={formatNum(leagueForm.gf_trend_5_vs_15)}
            />

            <StatCard
              label="GA trend 5 vs 15"
              value={formatNum(leagueForm.ga_trend_5_vs_15)}
            />
          </div>
        ) : null}
      </Section>

      <Section
        title="Home / Away forma"
        subtitle="team_home_away_form"
      >
        {homeAway ? (
          <div className="s2-home-away-grid">
            {[
              ["HOME LAST 5", "home5"],
              ["HOME LAST 10", "home10"],
              ["AWAY LAST 5", "away5"],
              ["AWAY LAST 10", "away10"]
            ].map(([label, prefix]) => (
              <div className="s2-form-card" key={prefix}>
                <h3>{label}</h3>

                <div className="s2-form-line">
                  <span>Utakmice</span>
                  <b>{formatInt(homeAway[`${prefix}_matches`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>W / D / L</span>
                  <b>
                    {formatInt(homeAway[`${prefix}_wins`])} /{" "}
                    {formatInt(homeAway[`${prefix}_draws`])} /{" "}
                    {formatInt(homeAway[`${prefix}_losses`])}
                  </b>
                </div>

                <div className="s2-form-line">
                  <span>GF / GA</span>
                  <b>
                    {formatInt(homeAway[`${prefix}_gf`])} /{" "}
                    {formatInt(homeAway[`${prefix}_ga`])}
                  </b>
                </div>

                <div className="s2-form-line">
                  <span>PPG</span>
                  <b>{formatNum(homeAway[`${prefix}_ppg`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>GG</span>
                  <b>{formatPct(homeAway[`${prefix}_gg_pct`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>Over 2.5</span>
                  <b>{formatPct(homeAway[`${prefix}_over25_pct`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>CS</span>
                  <b>{formatPct(homeAway[`${prefix}_cs_pct`])}</b>
                </div>

                <div className="s2-form-line">
                  <span>FTS</span>
                  <b>{formatPct(homeAway[`${prefix}_fts_pct`])}</b>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="s2-empty">Nema home/away podataka.</div>
        )}
      </Section>

      <Section
        title="Goal profile"
        subtitle="team_goal_statistics"
      >
        {goals ? (
          <>
            <div className="s2-goal-summary">
              <StatCard
                label="Mečeva"
                value={formatInt(goals.matches_played)}
              />

              <StatCard
                label="GG"
                value={formatPct(goals.btts_pct)}
                sub={`${formatInt(goals.btts_count)} utakmica`}
              />

              <StatCard
                label="Clean Sheet"
                value={formatPct(goals.clean_sheet_pct)}
                sub={`${formatInt(goals.clean_sheet_count)} utakmica`}
              />

              <StatCard
                label="Failed To Score"
                value={formatPct(goals.failed_to_score_pct)}
                sub={`${formatInt(goals.failed_to_score_count)} utakmica`}
              />
            </div>

            <div className="s2-double-table">
              <div>
                <h3>Postignuti golovi</h3>

                <div className="s2-mini-table">
                  {[
                    ["0", goals.scored_0, goals.scored_0_pct],
                    ["1", goals.scored_1, goals.scored_1_pct],
                    ["2", goals.scored_2, goals.scored_2_pct],
                    ["3+", goals.scored_3_plus, goals.scored_3_plus_pct]
                  ].map(([label, count, pct]) => (
                    <div className="s2-mini-row" key={label}>
                      <span>{label} golova</span>
                      <b>{formatInt(count)}</b>
                      <b>{formatPct(pct)}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3>Primljeni golovi</h3>

                <div className="s2-mini-table">
                  {[
                    ["0", goals.conceded_0, goals.conceded_0_pct],
                    ["1", goals.conceded_1, goals.conceded_1_pct],
                    ["2", goals.conceded_2, goals.conceded_2_pct],
                    ["3+", goals.conceded_3_plus, goals.conceded_3_plus_pct]
                  ].map(([label, count, pct]) => (
                    <div className="s2-mini-row" key={label}>
                      <span>{label} golova</span>
                      <b>{formatInt(count)}</b>
                      <b>{formatPct(pct)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="s2-double-table">
              <div>
                <h3>Scoring thresholds</h3>

                <div className="s2-mini-table">
                  {[
                    ["1+", goals.scored_1_plus, goals.scored_1_plus_pct],
                    ["2+", goals.scored_2_plus, goals.scored_2_plus_pct],
                    [
                      "3+",
                      goals.scored_3_plus_count,
                      goals.scored_3_plus_count_pct
                    ]
                  ].map(([label, count, pct]) => (
                    <div className="s2-mini-row" key={label}>
                      <span>{label}</span>
                      <b>{formatInt(count)}</b>
                      <b>{formatPct(pct)}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3>Conceding thresholds</h3>

                <div className="s2-mini-table">
                  {[
                    ["1+", goals.conceded_1_plus, goals.conceded_1_plus_pct],
                    ["2+", goals.conceded_2_plus, goals.conceded_2_plus_pct],
                    ["3+", goals.conceded_3_plus, goals.conceded_3_plus_pct]
                  ].map(([label, count, pct]) => (
                    <div className="s2-mini-row" key={label}>
                      <span>{label}</span>
                      <b>{formatInt(count)}</b>
                      <b>{formatPct(pct)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="s2-section-subtitle">
              HOME / AWAY GOAL PROFILE
            </div>

            <DataTable
              columns={[
                {
                  key: "metric",
                  label: "Statistika"
                },
                {
                  key: "home",
                  label: "HOME",
                  render: (r) => formatPct(r.home)
                },
                {
                  key: "away",
                  label: "AWAY",
                  render: (r) => formatPct(r.away)
                }
              ]}
              rows={[
                {
                  __key: "s1",
                  metric: "Scored 1+",
                  home: goals.home_scored_1_plus_pct,
                  away: goals.away_scored_1_plus_pct
                },
                {
                  __key: "s2",
                  metric: "Scored 2+",
                  home: goals.home_scored_2_plus_pct,
                  away: goals.away_scored_2_plus_pct
                },
                {
                  __key: "s3",
                  metric: "Scored 3+",
                  home: goals.home_scored_3_plus_pct,
                  away: goals.away_scored_3_plus_pct
                },
                {
                  __key: "c1",
                  metric: "Conceded 1+",
                  home: goals.home_conceded_1_plus_pct,
                  away: goals.away_conceded_1_plus_pct
                },
                {
                  __key: "c2",
                  metric: "Conceded 2+",
                  home: goals.home_conceded_2_plus_pct,
                  away: goals.away_conceded_2_plus_pct
                },
                {
                  __key: "c3",
                  metric: "Conceded 3+",
                  home: goals.home_conceded_3_plus_pct,
                  away: goals.away_conceded_3_plus_pct
                },
                {
                  __key: "btts",
                  metric: "GG",
                  home: goals.home_btts_pct,
                  away: goals.away_btts_pct
                },
                {
                  __key: "cs",
                  metric: "Clean Sheet",
                  home: goals.home_clean_sheet_pct,
                  away: goals.away_clean_sheet_pct
                },
                {
                  __key: "fts",
                  metric: "Failed To Score",
                  home: goals.home_failed_to_score_pct,
                  away: goals.away_failed_to_score_pct
                }
              ]}
            />
          </>
        ) : (
          <div className="s2-empty">Nema goal statistike.</div>
        )}
      </Section>

      <Section
        title="Recency weighted"
        subtitle="team_recency_statistics · 14-day half-life"
      >
        {recency ? (
          <>
            <div className="s2-kpi-grid">
              <StatCard
                label="Efektivnih utakmica"
                value={formatNum(recency.effective_matches)}
              />

              <StatCard
                label="Prosečna starost"
                value={`${formatNum(recency.avg_match_age_days, 1)} dana`}
              />

              <StatCard
                label="Weighted PPG"
                value={formatNum(recency.weighted_ppg)}
              />

              <StatCard
                label="Weighted GF"
                value={formatNum(recency.weighted_gf)}
              />

              <StatCard
                label="Weighted GA"
                value={formatNum(recency.weighted_ga)}
              />

              <StatCard
                label="Weighted GD"
                value={formatNum(recency.weighted_goal_diff)}
              />

              <StatCard
                label="Weighted GG"
                value={formatPct(recency.weighted_gg_pct)}
              />

              <StatCard
                label="Weighted O2.5"
                value={formatPct(recency.weighted_over25_pct)}
              />

              <StatCard
                label="Weighted CS"
                value={formatPct(recency.weighted_clean_sheet_pct)}
              />

              <StatCard
                label="Weighted FTS"
                value={formatPct(recency.weighted_failed_to_score_pct)}
              />
            </div>

            <div className="s2-double-table">
              <div>
                <h3>Weighted HOME</h3>

                <div className="s2-mini-table">
                  <div className="s2-mini-row">
                    <span>Utakmice</span>
                    <b>{formatInt(recency.home_matches)}</b>
                    <b>{formatNum(recency.home_effective_matches)}</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>PPG</span>
                    <b>{formatNum(recency.home_weighted_ppg)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>GF</span>
                    <b>{formatNum(recency.home_weighted_gf)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>GA</span>
                    <b>{formatNum(recency.home_weighted_ga)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>GG</span>
                    <b>{formatPct(recency.home_weighted_gg_pct)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>O2.5</span>
                    <b>{formatPct(recency.home_weighted_over25_pct)}</b>
                    <b>weighted</b>
                  </div>
                </div>
              </div>

              <div>
                <h3>Weighted AWAY</h3>

                <div className="s2-mini-table">
                  <div className="s2-mini-row">
                    <span>Utakmice</span>
                    <b>{formatInt(recency.away_matches)}</b>
                    <b>{formatNum(recency.away_effective_matches)}</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>PPG</span>
                    <b>{formatNum(recency.away_weighted_ppg)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>GF</span>
                    <b>{formatNum(recency.away_weighted_gf)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>GA</span>
                    <b>{formatNum(recency.away_weighted_ga)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>GG</span>
                    <b>{formatPct(recency.away_weighted_gg_pct)}</b>
                    <b>weighted</b>
                  </div>

                  <div className="s2-mini-row">
                    <span>O2.5</span>
                    <b>{formatPct(recency.away_weighted_over25_pct)}</b>
                    <b>weighted</b>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="s2-empty">Nema recency statistike.</div>
        )}
      </Section>

      <Section
        title="Opponent strength"
        subtitle="team_opponent_strength"
      >
        {strength ? (
          <div className="s2-kpi-grid">
            <StatCard
              label="Protivnika"
              value={formatInt(strength.opponents_count)}
            />

            <StatCard
              label="Avg opponent PPG"
              value={formatNum(strength.avg_opponent_ppg)}
            />

            <StatCard
              label="Avg opponent Win %"
              value={formatPct(strength.avg_opponent_win_pct)}
            />

            <StatCard
              label="Avg opponent GD"
              value={formatNum(
                strength.avg_opponent_goal_diff_per_match
              )}
            />

            <StatCard
              label="Avg opponent GF"
              value={formatNum(strength.avg_opponent_gf_per_match)}
            />

            <StatCard
              label="Avg opponent GA"
              value={formatNum(strength.avg_opponent_ga_per_match)}
            />

            <StatCard
              label="Strong opponents"
              value={formatInt(strength.strong_opponents_count)}
            />

            <StatCard
              label="Weak opponents"
              value={formatInt(strength.weak_opponents_count)}
            />

            <StatCard
              label="Strength index"
              value={formatNum(strength.strength_index)}
            />
          </div>
        ) : (
          <div className="s2-empty">
            Nema opponent strength podataka.
          </div>
        )}
      </Section>

      <Section
        title="H2H"
        subtitle="team_h2h_statistics · sekundarni signal"
      >
        {!opponents.length ? (
          <div className="s2-empty">
            Za ovaj tim trenutno nema H2H zapisa.
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "opponent",
                label: "Protivnik",
                render: (r) => {
                  const opponent =
                    Number(r.team_a_id) === Number(team.team_id)
                      ? r.team_b_id
                      : r.team_a_id;

                  return getDisplayTeamName(
                    opponent,
                    aliases,
                    sofaTeams
                  );
                }
              },
              {
                key: "league",
                label: "Liga",
                render: (r) =>
                  getLeagueName(
                    r.league_id,
                    primary,
                    leagueStats
                  )
              },
              {
                key: "matches_played",
                label: "Mečevi",
                render: (r) => formatInt(r.matches_played)
              },
              {
                key: "win",
                label: "Win %",
                render: (r) => {
                  const isA =
                    Number(r.team_a_id) === Number(team.team_id);

                  return formatPct(
                    isA
                      ? r.team_a_win_pct
                      : r.team_b_win_pct
                  );
                }
              },
              {
                key: "draw",
                label: "Draw %",
                render: (r) => formatPct(r.draw_pct)
              },
              {
                key: "goals",
                label: "Golovi",
                render: (r) => {
                  const isA =
                    Number(r.team_a_id) === Number(team.team_id);

                  return isA
                    ? `${formatInt(r.team_a_goals)} : ${formatInt(
                        r.team_b_goals
                      )}`
                    : `${formatInt(r.team_b_goals)} : ${formatInt(
                        r.team_a_goals
                      )}`;
                }
              },
              {
                key: "btts",
                label: "GG",
                render: (r) => formatPct(r.btts_pct)
              },
              {
                key: "o25",
                label: "O2.5",
                render: (r) => formatPct(r.over_25_pct)
              },
              {
                key: "last5",
                label: "Last 5",
                render: (r) => formatInt(r.last5_matches)
              }
            ]}
            rows={opponents.map((x) => ({
              ...x,
              __key: `${x.team_a_id}-${x.team_b_id}-${x.league_id}`
            }))}
          />
        )}
      </Section>
    </div>
  );
}

export default function Screen2() {
  const [activeTab, setActiveTab] = useState("teams");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [primaryLeagues, setPrimaryLeagues] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [teamForm, setTeamForm] = useState([]);
  const [homeAway, setHomeAway] = useState([]);
  const [goalStats, setGoalStats] = useState([]);
  const [recency, setRecency] = useState([]);
  const [strength, setStrength] = useState([]);
  const [leagueStats, setLeagueStats] = useState([]);
  const [h2h, setH2h] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [sofaTeams, setSofaTeams] = useState([]);

  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [selectedTeamId, setSelectedTeamId] = useState(null);

  useEffect(() => {
    loadAllStatistics();
  }, []);

  async function loadAllStatistics() {
    try {
      setLoading(true);
      setError("");

      const [
        primary,
        stats,
        forms,
        ha,
        goals,
        rec,
        str,
        leagues,
        h2hData,
        teamAliases,
        teams
      ] = await Promise.all([
        fetchAll("team_primary_leagues", "*", TEAM_PAGE_SIZE),
        fetchAll("team_league_statistics", "*", TEAM_PAGE_SIZE),
        fetchAll("team_form_statistics", "*", TEAM_PAGE_SIZE),
        fetchAll("team_home_away_form", "*", TEAM_PAGE_SIZE),
        fetchAll("team_goal_statistics", "*", TEAM_PAGE_SIZE),
        fetchAll("team_recency_statistics", "*", TEAM_PAGE_SIZE),
        fetchAll("team_opponent_strength", "*", TEAM_PAGE_SIZE),
        fetchAll("league_statistics", "*", TEAM_PAGE_SIZE),
        fetchAll("team_h2h_statistics", "*", H2H_PAGE_SIZE),
        fetchAll("team_aliases", "*", TEAM_PAGE_SIZE),
        fetchAll("sofa_teams", "*", TEAM_PAGE_SIZE)
      ]);

      setPrimaryLeagues(primary || []);
      setTeamStats(stats || []);
      setTeamForm(forms || []);
      setHomeAway(ha || []);
      setGoalStats(goals || []);
      setRecency(rec || []);
      setStrength(str || []);
      setLeagueStats(leagues || []);
      setH2h(h2hData || []);
      setAliases(teamAliases || []);
      setSofaTeams(teams || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Greška pri učitavanju statistike.");
    } finally {
      setLoading(false);
    }
  }

  const teamRows = useMemo(() => {
    return primaryLeagues.map((team) => {
      const stats = teamStats.find(
        (x) =>
          Number(x.team_id) === Number(team.team_id) &&
          Number(x.league_id) === Number(team.primary_league_id)
      );

      const form = teamForm.find(
        (x) =>
          Number(x.team_id) === Number(team.team_id) &&
          Number(x.league_id) === Number(team.primary_league_id)
      );

      const goals = goalStats.find(
        (x) =>
          Number(x.team_id) === Number(team.team_id) &&
          Number(x.league_id) === Number(team.primary_league_id)
      );

      const rec = recency.find(
        (x) =>
          Number(x.team_id) === Number(team.team_id) &&
          Number(x.league_id) === Number(team.primary_league_id)
      );

      const opp = strength.find(
        (x) =>
          Number(x.team_id) === Number(team.team_id) &&
          Number(x.league_id) === Number(team.primary_league_id)
      );

      return {
        ...team,
        team_name: getDisplayTeamName(
          team.team_id,
          aliases,
          sofaTeams
        ),
        stats,
        form,
        goals,
        rec,
        opp
      };
    });
  }, [
    primaryLeagues,
    teamStats,
    teamForm,
    goalStats,
    recency,
    strength,
    aliases,
    sofaTeams
  ]);

  const leagueOptions = useMemo(() => {
    const map = new Map();

    primaryLeagues.forEach((x) => {
      const id = Number(x.primary_league_id);

      if (!map.has(id)) {
        map.set(id, {
          id,
          name:
            x.primary_league_name ||
            `Liga ${id}`
        });
      }
    });

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "sr")
    );
  }, [primaryLeagues]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = teamRows.filter((team) => {
      const matchesLeague =
        leagueFilter === "all" ||
        Number(team.primary_league_id) === Number(leagueFilter);

      if (!matchesLeague) return false;

      if (!q) return true;

      return (
        String(team.team_name || "")
          .toLowerCase()
          .includes(q) ||
        String(team.team_id).includes(q) ||
        String(team.primary_league_name || "")
          .toLowerCase()
          .includes(q)
      );
    });

    rows.sort((a, b) => {
      let av;
      let bv;

      switch (sortKey) {
        case "position":
          av = Number(a.standings_position ?? 9999);
          bv = Number(b.standings_position ?? 9999);
          break;

        case "points":
          av = Number(a.standings_points ?? -9999);
          bv = Number(b.standings_points ?? -9999);
          break;

        case "played":
          av = Number(a.league_matches_played ?? -9999);
          bv = Number(b.league_matches_played ?? -9999);
          break;

        case "ppg":
          av = Number(a.stats?.ppg ?? -9999);
          bv = Number(b.stats?.ppg ?? -9999);
          break;

        case "form":
          av = Number(a.form?.last5_ppg ?? -9999);
          bv = Number(b.form?.last5_ppg ?? -9999);
          break;

        case "gf":
          av = Number(a.stats?.goals_for ?? -9999);
          bv = Number(b.stats?.goals_for ?? -9999);
          break;

        case "ga":
          av = Number(a.stats?.goals_against ?? -9999);
          bv = Number(b.stats?.goals_against ?? -9999);
          break;

        case "strength":
          av = Number(a.opp?.strength_index ?? -9999);
          bv = Number(b.opp?.strength_index ?? -9999);
          break;

        default:
          av = String(a.team_name || "");
          bv = String(b.team_name || "");

          return sortDir === "asc"
            ? av.localeCompare(bv, "sr")
            : bv.localeCompare(av, "sr");
      }

      return sortDir === "asc" ? av - bv : bv - av;
    });

    return rows;
  }, [
    teamRows,
    search,
    leagueFilter,
    sortKey,
    sortDir
  ]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;

    return teamRows.find(
      (x) => Number(x.team_id) === Number(selectedTeamId)
    );
  }, [selectedTeamId, teamRows]);

  const selectedTeamStats = useMemo(() => {
    if (!selectedTeam) return null;

    return teamStats.find(
      (x) =>
        Number(x.team_id) === Number(selectedTeam.team_id) &&
        Number(x.league_id) === Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, teamStats]);

  const selectedTeamForm = useMemo(() => {
    if (!selectedTeam) return null;

    return teamForm.find(
      (x) =>
        Number(x.team_id) === Number(selectedTeam.team_id) &&
        Number(x.league_id) === Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, teamForm]);

  const selectedHomeAway = useMemo(() => {
    if (!selectedTeam) return null;

    return homeAway.find(
      (x) =>
        Number(x.team_id) === Number(selectedTeam.team_id) &&
        Number(x.league_id) === Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, homeAway]);

  const selectedGoals = useMemo(() => {
    if (!selectedTeam) return null;

    return goalStats.find(
      (x) =>
        Number(x.team_id) === Number(selectedTeam.team_id) &&
        Number(x.league_id) === Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, goalStats]);

  const selectedRecency = useMemo(() => {
    if (!selectedTeam) return null;

    return recency.find(
      (x) =>
        Number(x.team_id) === Number(selectedTeam.team_id) &&
        Number(x.league_id) === Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, recency]);

  const selectedStrength = useMemo(() => {
    if (!selectedTeam) return null;

    return strength.find(
      (x) =>
        Number(x.team_id) === Number(selectedTeam.team_id) &&
        Number(x.league_id) === Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, strength]);

  const selectedLeagueStats = useMemo(() => {
    if (!selectedTeam) return null;

    return leagueStats.find(
      (x) =>
        Number(x.league_id) ===
        Number(selectedTeam.primary_league_id)
    );
  }, [selectedTeam, leagueStats]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const tableArrow = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  if (loading) {
    return (
      <div className="screen2">
        <div className="s2-loading">
          <div className="s2-spinner" />
          <h2>Učitavanje statistike...</h2>
          <p>
            Učitavaju se svi statistički slojevi iz Supabase baze.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen2">
        <div className="s2-error">
          <h2>Greška pri učitavanju</h2>
          <p>{error}</p>

          <button
            className="s2-button"
            onClick={loadAllStatistics}
          >
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen2">
      <header className="s2-header">
        <div>
          <div className="s2-eyebrow">
            DZIDICI3ML · DATA CENTER
          </div>

          <h1>Team Statistics</h1>

          <p>
            Kompletan pregled statističkih tabela iz Supabase baze.
            Screen2 prikazuje podatke — ne menja ih i ne računa
            statistiku lokalno.
          </p>
        </div>

        <button
          className="s2-button"
          onClick={loadAllStatistics}
        >
          ↻ Osveži podatke
        </button>
      </header>

      <div className="s2-overview">
        <StatCard
          label="Timovi"
          value={formatInt(primaryLeagues.length)}
          sub="team_primary_leagues"
        />

        <StatCard
          label="Team stats"
          value={formatInt(teamStats.length)}
          sub="team_league_statistics"
        />

        <StatCard
          label="Form stats"
          value={formatInt(teamForm.length)}
          sub="team_form_statistics"
        />

        <StatCard
          label="Goal stats"
          value={formatInt(goalStats.length)}
          sub="team_goal_statistics"
        />

        <StatCard
          label="Recency"
          value={formatInt(recency.length)}
          sub="team_recency_statistics"
        />

        <StatCard
          label="H2H parovi"
          value={formatInt(h2h.length)}
          sub="team_h2h_statistics"
        />

        <StatCard
          label="Lige"
          value={formatInt(leagueStats.length)}
          sub="league_statistics"
        />

        <StatCard
          label="Opponent strength"
          value={formatInt(strength.length)}
          sub="team_opponent_strength"
        />
      </div>

      <nav className="s2-tabs">
        {[
          ["teams", "TIMOVI"],
          ["leagues", "LIGE"],
          ["h2h", "H2H"],
          ["database", "DATABASE"]
        ].map(([key, label]) => (
          <button
            key={key}
            className={
              activeTab === key
                ? "s2-tab active"
                : "s2-tab"
            }
            onClick={() => {
              setActiveTab(key);
              setSelectedTeamId(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "teams" && !selectedTeam && (
        <Section
          title="Svi timovi"
          subtitle={`${filteredTeams.length} timova prikazano · identitet = team_id`}
          right={
            <div className="s2-controls">
              <input
                className="s2-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pretraži tim, ID ili ligu..."
              />

              <select
                className="s2-select"
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
              >
                <option value="all">
                  Sve primarne lige
                </option>

                {leagueOptions.map((league) => (
                  <option
                    key={league.id}
                    value={league.id}
                  >
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="s2-table-wrap">
            <table className="s2-table s2-team-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("name")}>
                    TIM{tableArrow("name")}
                  </th>

                  <th onClick={() => toggleSort("position")}>
                    POS{tableArrow("position")}
                  </th>

                  <th>LIGA</th>

                  <th onClick={() => toggleSort("played")}>
                    MP{tableArrow("played")}
                  </th>

                  <th onClick={() => toggleSort("points")}>
                    PTS{tableArrow("points")}
                  </th>

                  <th onClick={() => toggleSort("ppg")}>
                    PPG{tableArrow("ppg")}
                  </th>

                  <th onClick={() => toggleSort("form")}>
                    L5 PPG{tableArrow("form")}
                  </th>

                  <th onClick={() => toggleSort("gf")}>
                    GF{tableArrow("gf")}
                  </th>

                  <th onClick={() => toggleSort("ga")}>
                    GA{tableArrow("ga")}
                  </th>

                  <th>GG</th>

                  <th>O2.5</th>

                  <th>REC PPG</th>

                  <th>STRENGTH</th>

                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filteredTeams.map((team) => (
                  <tr
                    key={`${team.team_id}-${team.primary_league_id}`}
                    className="s2-clickable"
                    onClick={() =>
                      setSelectedTeamId(team.team_id)
                    }
                  >
                    <td>
                      <div className="s2-team-name">
                        {team.team_name}
                      </div>

                      <small>
                        ID {team.team_id}
                      </small>
                    </td>

                    <td>
                      {safe(team.standings_position)}
                    </td>

                    <td>
                      {team.primary_league_name || "—"}
                    </td>

                    <td>
                      {formatInt(
                        team.stats?.matches_played ??
                          team.league_matches_played
                      )}
                    </td>

                    <td>
                      {formatInt(
                        team.stats?.points ??
                          team.standings_points
                      )}
                    </td>

                    <td>
                      {formatNum(team.stats?.ppg)}
                    </td>

                    <td>
                      {formatNum(team.form?.last5_ppg)}
                    </td>

                    <td>
                      {formatInt(team.stats?.goals_for)}
                    </td>

                    <td>
                      {formatInt(team.stats?.goals_against)}
                    </td>

                    <td>
                      {formatPct(team.stats?.gg_pct)}
                    </td>

                    <td>
                      {formatPct(team.stats?.over_25_pct)}
                    </td>

                    <td>
                      {formatNum(team.rec?.weighted_ppg)}
                    </td>

                    <td>
                      {formatNum(team.opp?.strength_index)}
                    </td>

                    <td>
                      <span className="s2-status">
                        {team.confirmation_level || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="s2-table-note">
            Klikni na bilo koji tim za kompletan statistički profil.
          </div>
        </Section>
      )}

      {activeTab === "teams" && selectedTeam && (
        <>
          <div className="s2-backbar">
            <button
              className="s2-button secondary"
              onClick={() => setSelectedTeamId(null)}
            >
              ← Svi timovi
            </button>
          </div>

          <TeamProfile
            team={selectedTeam}
            primary={primaryLeagues}
            leagueStats={leagueStats}
            leagueForm={selectedTeamStats}
            homeAway={selectedHomeAway}
            goals={selectedGoals}
            recency={selectedRecency}
            strength={selectedStrength}
            h2h={h2h}
            aliases={aliases}
            sofaTeams={sofaTeams}
            onClose={() => setSelectedTeamId(null)}
          />
        </>
      )}

      {activeTab === "leagues" && (
        <Section
          title="League Statistics"
          subtitle={`${leagueStats.length} liga iz league_statistics`}
        >
          <DataTable
            columns={[
              {
                key: "league_name",
                label: "LIGA"
              },
              {
                key: "matches_played",
                label: "MP",
                render: (r) =>
                  formatInt(r.matches_played)
              },
              {
                key: "home_win_pct",
                label: "HOME W%",
                render: (r) =>
                  formatPct(r.home_win_pct)
              },
              {
                key: "draw_pct",
                label: "DRAW%",
                render: (r) =>
                  formatPct(r.draw_pct)
              },
              {
                key: "away_win_pct",
                label: "AWAY W%",
                render: (r) =>
                  formatPct(r.away_win_pct)
              },
              {
                key: "avg_total_goals",
                label: "AVG GOALS",
                render: (r) =>
                  formatNum(r.avg_total_goals)
              },
              {
                key: "avg_home_goals",
                label: "AVG HOME",
                render: (r) =>
                  formatNum(r.avg_home_goals)
              },
              {
                key: "avg_away_goals",
                label: "AVG AWAY",
                render: (r) =>
                  formatNum(r.avg_away_goals)
              },
              {
                key: "home_advantage",
                label: "HOME ADV",
                render: (r) =>
                  formatNum(r.home_advantage)
              },
              {
                key: "over_15_pct",
                label: "O1.5",
                render: (r) =>
                  formatPct(r.over_15_pct)
              },
              {
                key: "over_25_pct",
                label: "O2.5",
                render: (r) =>
                  formatPct(r.over_25_pct)
              },
              {
                key: "over_35_pct",
                label: "O3.5",
                render: (r) =>
                  formatPct(r.over_35_pct)
              },
              {
                key: "over_45_pct",
                label: "O4.5",
                render: (r) =>
                  formatPct(r.over_45_pct)
              },
              {
                key: "gg_pct",
                label: "GG",
                render: (r) =>
                  formatPct(r.gg_pct)
              },
              {
                key: "ng_pct",
                label: "NG",
                render: (r) =>
                  formatPct(r.ng_pct)
              },
              {
                key: "home_clean_sheet_pct",
                label: "HOME CS",
                render: (r) =>
                  formatPct(r.home_clean_sheet_pct)
              },
              {
                key: "away_clean_sheet_pct",
                label: "AWAY CS",
                render: (r) =>
                  formatPct(r.away_clean_sheet_pct)
              }
            ]}
            rows={leagueStats.map((x) => ({
              ...x,
              __key: x.league_id
            }))}
          />
        </Section>
      )}

      {activeTab === "h2h" && (
        <Section
          title="Head To Head"
          subtitle={`${h2h.length} normalizovanih team pairs`}
        >
          <DataTable
            columns={[
              {
                key: "team_a",
                label: "TEAM A",
                render: (r) =>
                  getDisplayTeamName(
                    r.team_a_id,
                    aliases,
                    sofaTeams
                  )
              },
              {
                key: "team_b",
                label: "TEAM B",
                render: (r) =>
                  getDisplayTeamName(
                    r.team_b_id,
                    aliases,
                    sofaTeams
                  )
              },
              {
                key: "league",
                label: "LIGA",
                render: (r) =>
                  getLeagueName(
                    r.league_id,
                    primaryLeagues,
                    leagueStats
                  )
              },
              {
                key: "matches_played",
                label: "MP",
                render: (r) =>
                  formatInt(r.matches_played)
              },
              {
                key: "team_a_win_pct",
                label: "A WIN%",
                render: (r) =>
                  formatPct(r.team_a_win_pct)
              },
              {
                key: "draw_pct",
                label: "DRAW%",
                render: (r) =>
                  formatPct(r.draw_pct)
              },
              {
                key: "team_b_win_pct",
                label: "B WIN%",
                render: (r) =>
                  formatPct(r.team_b_win_pct)
              },
              {
                key: "avg_total_goals",
                label: "AVG GOALS",
                render: (r) =>
                  formatNum(r.avg_total_goals)
              },
              {
                key: "btts_pct",
                label: "GG",
                render: (r) =>
                  formatPct(r.btts_pct)
              },
              {
                key: "over_25_pct",
                label: "O2.5",
                render: (r) =>
                  formatPct(r.over_25_pct)
              },
              {
                key: "last5_matches",
                label: "LAST 5",
                render: (r) =>
                  formatInt(r.last5_matches)
              },
              {
                key: "last5_btts_pct",
                label: "L5 GG",
                render: (r) =>
                  formatPct(r.last5_btts_pct)
              },
              {
                key: "last5_over_25_pct",
                label: "L5 O2.5",
                render: (r) =>
                  formatPct(r.last5_over_25_pct)
              }
            ]}
            rows={h2h.map((x) => ({
              ...x,
              __key: `${x.team_a_id}-${x.team_b_id}-${x.league_id}`
            }))}
          />
        </Section>
      )}

      {activeTab === "database" && (
        <Section
          title="Database overview"
          subtitle="Direktan pregled statističkih slojeva"
        >
          <div className="s2-db-grid">
            {[
              [
                "team_primary_leagues",
                primaryLeagues.length,
                "Primarna liga po timu"
              ],
              [
                "team_league_statistics",
                teamStats.length,
                "Osnovna team statistika"
              ],
              [
                "team_form_statistics",
                teamForm.length,
                "Last 5 / 10 / 15"
              ],
              [
                "team_home_away_form",
                homeAway.length,
                "Home / Away forma"
              ],
              [
                "team_goal_statistics",
                goalStats.length,
                "Goal profile"
              ],
              [
                "team_recency_statistics",
                recency.length,
                "Recency weighted"
              ],
              [
                "team_opponent_strength",
                strength.length,
                "Strength of opponents"
              ],
              [
                "team_h2h_statistics",
                h2h.length,
                "H2H pairs"
              ],
              [
                "league_statistics",
                leagueStats.length,
                "League context"
              ],
              [
                "team_aliases",
                aliases.length,
                "Display / mapping aliases"
              ],
              [
                "sofa_teams",
                sofaTeams.length,
                "Sofa team registry"
              ]
            ].map(([table, count, description]) => (
              <div className="s2-db-card" key={table}>
                <div className="s2-db-name">{table}</div>
                <div className="s2-db-count">
                  {formatInt(count)}
                </div>
                <div className="s2-db-description">
                  {description}
                </div>
              </div>
            ))}
          </div>

          <div className="s2-database-detail">
            <h3>Data coverage</h3>

            <div className="s2-coverage-row">
              <span>Timovi sa osnovnom statistikom</span>
              <b>
                {formatInt(
                  teamRows.filter((x) => x.stats).length
                )}{" "}
                / {formatInt(teamRows.length)}
              </b>
            </div>

            <div className="s2-coverage-row">
              <span>Timovi sa formom</span>
              <b>
                {formatInt(
                  teamRows.filter((x) => x.form).length
                )}{" "}
                / {formatInt(teamRows.length)}
              </b>
            </div>

            <div className="s2-coverage-row">
              <span>Timovi sa goal statistikom</span>
              <b>
                {formatInt(
                  teamRows.filter((x) => x.goals).length
                )}{" "}
                / {formatInt(teamRows.length)}
              </b>
            </div>

            <div className="s2-coverage-row">
              <span>Timovi sa recency statistikom</span>
              <b>
                {formatInt(
                  teamRows.filter((x) => x.rec).length
                )}{" "}
                / {formatInt(teamRows.length)}
              </b>
            </div>

            <div className="s2-coverage-row">
              <span>Timovi sa opponent strength</span>
              <b>
                {formatInt(
                  teamRows.filter((x) => x.opp).length
                )}{" "}
                / {formatInt(teamRows.length)}
              </b>
            </div>

            <div className="s2-coverage-row">
              <span>H2H parovi</span>
              <b>{formatInt(h2h.length)}</b>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
