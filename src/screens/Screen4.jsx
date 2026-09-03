import React, { useContext, useEffect, useMemo, useState } from "react";
import { MatchesContext } from "../MatchesContext";
import { supabase } from "../supabase";
import { fetchAllSupabase } from "../utils/fetchAllSupabase";
import "./Screen4.css";

/*
  SCREEN 4 - PREDICTION ENGINE

  Izvori:
  1. futureMatches iz Screen3 = budući mečevi + Mozzart nazivi + kvote
  2. screen1_matches = istorijski rezultati
  3. team_aliases = Mozzart naziv -> team_id
  4. sofa_teams = fallback naziv -> team_id

  Model koristi:
  - ukupnu formu
  - home formu domaćina
  - away formu gosta
  - GF / GA
  - GG / NG
  - Over 1.5 / 2.5 / 3.5
  - poslednjih 5
  - H2H ako postoji
  - ligu
  - value u odnosu na Mozzart kvotu
*/

const num = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const pct = (a, b, fallback = 50) => {
  if (!b || !Number.isFinite(a) || !Number.isFinite(b)) return fallback;
  return (a / b) * 100;
};

const clamp = (v, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));

const round = (v) => Math.round(v * 10) / 10;

const first = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const parseScore = (ft) => {
  if (!ft) return null;

  const m = String(ft).match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return null;

  const home = Number(m[1]);
  const away = Number(m[2]);

  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;

  return { home, away };
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const getDateValue = (m) =>
  first(
    m.match_date,
    m.datum,
    m.date,
    m.matchDate,
    m.start_date
  );

const getTimeValue = (m) =>
  first(
    m.match_time,
    m.vreme,
    m.time,
    m.matchTime,
    ""
  );

const getHomeName = (m) =>
  first(
    m.home,
    m.home_team,
    m.homeTeam,
    m.home_name,
    m.homeTeamName
  );

const getAwayName = (m) =>
  first(
    m.away,
    m.away_team,
    m.awayTeam,
    m.away_name,
    m.awayTeamName
  );

const getLeagueName = (m) =>
  first(
    m.league,
    m.liga,
    m.league_name,
    m.leagueName,
    ""
  );

const getOdds = (m) => ({
  home: num(
    first(
      m.home_odds,
      m.homeOdd,
      m.odd1,
      m.odds1,
      m.kvota1,
      m["1"]
    )
  ),

  draw: num(
    first(
      m.draw_odds,
      m.drawOdd,
      m.oddX,
      m.oddsX,
      m.kvotaX,
      m["X"]
    )
  ),

  away: num(
    first(
      m.away_odds,
      m.awayOdd,
      m.odd2,
      m.odds2,
      m.kvota2,
      m.kvota_2,
      m["2"]
    )
  ),

  gg: num(
    first(
      m.gg_odds,
      m.ggOdd,
      m.oddGG,
      m.oddsGG,
      m.kvotaGG,
      m.gg
    )
  ),

  ng: num(
    first(
      m.ng_odds,
      m.ngOdd,
      m.oddNG,
      m.oddsNG,
      m.kvotaNG,
      m.ng
    )
  ),

  over15: num(
    first(
      m.over15_odds,
      m.over_15_odds,
      m.oddOver15,
      m.oddsOver15,
      m.kvotaOver15,
      m["over1.5"]
    )
  ),

  over25: num(
    first(
      m.over25_odds,
      m.over_25_odds,
      m.oddOver25,
      m.oddsOver25,
      m.kvotaOver25,
      m["over2.5"]
    )
  ),

  over35: num(
    first(
      m.over35_odds,
      m.over_35_odds,
      m.oddOver35,
      m.oddsOver35,
      m.kvotaOver35,
      m["over3.5"]
    )
  ),

  under25: num(
    first(
      m.under25_odds,
      m.under_25_odds,
      m.oddUnder25,
      m.oddsUnder25,
      m.kvotaUnder25,
      m["under2.5"]
    )
  ),
});

const makeStats = () => ({
  games: 0,

  wins: 0,
  draws: 0,
  losses: 0,

  gf: 0,
  ga: 0,

  gg: 0,
  ng: 0,

  over15: 0,
  over25: 0,
  over35: 0,

  cleanSheet: 0,
  failedToScore: 0,

  homeGames: 0,
  homeWins: 0,
  homeDraws: 0,
  homeLosses: 0,
  homeGF: 0,
  homeGA: 0,

  awayGames: 0,
  awayWins: 0,
  awayDraws: 0,
  awayLosses: 0,
  awayGF: 0,
  awayGA: 0,

  last5: [],

  leagues: {},
});

const addResult = (s, gf, ga, isHome, leagueId) => {
  s.games++;

  s.gf += gf;
  s.ga += ga;

  if (gf > ga) s.wins++;
  else if (gf === ga) s.draws++;
  else s.losses++;

  if (gf > 0 && ga > 0) s.gg++;
  else s.ng++;

  if (gf + ga >= 2) s.over15++;
  if (gf + ga >= 3) s.over25++;
  if (gf + ga >= 4) s.over35++;

  if (ga === 0) s.cleanSheet++;
  if (gf === 0) s.failedToScore++;

  s.last5.push(
    gf > ga ? "W" :
    gf === ga ? "D" :
    "L"
  );

  if (s.last5.length > 5) {
    s.last5.shift();
  }

  if (isHome) {
    s.homeGames++;
    s.homeGF += gf;
    s.homeGA += ga;

    if (gf > ga) s.homeWins++;
    else if (gf === ga) s.homeDraws++;
    else s.homeLosses++;
  } else {
    s.awayGames++;
    s.awayGF += gf;
    s.awayGA += ga;

    if (gf > ga) s.awayWins++;
    else if (gf === ga) s.awayDraws++;
    else s.awayLosses++;
  }

  const lid = leagueId != null ? String(leagueId) : "unknown";

  if (!s.leagues[lid]) {
    s.leagues[lid] = {
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gg: 0,
      over15: 0,
      over25: 0,
    };
  }

  const l = s.leagues[lid];

  l.games++;
  l.gf += gf;
  l.ga += ga;

  if (gf > ga) l.wins++;
  else if (gf === ga) l.draws++;
  else l.losses++;

  if (gf > 0 && ga > 0) l.gg++;
  if (gf + ga >= 2) l.over15++;
  if (gf + ga >= 3) l.over25++;
};

export default function Screen4() {
  const { futureMatches = [] } = useContext(MatchesContext);

  const [history, setHistory] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [sofaTeams, setSofaTeams] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [market, setMarket] = useState("best");
  const [minGames, setMinGames] = useState(5);
  const [selected, setSelected] = useState(null);
  const [activeView, setActiveView] = useState("ticket");

  // ============================================================
  // UČITAVANJE ISTORIJE
  // ============================================================

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("[SCREEN4] Ucitavam istoriju...");

const matches = await fetchAllSupabase(
  supabase,
  "screen1_matches",
  "*",
  {
    orderBy: "match_date",
    ascending: false,
  }
);

        if (!alive) return;

        console.log(
          "[SCREEN4] Istorijskih meceva:",
          matches.length
        );

        const ids = new Set();

        matches.forEach((m) => {
          if (m.home_team_id != null) ids.add(String(m.home_team_id));
          if (m.away_team_id != null) ids.add(String(m.away_team_id));
        });

        const idArray = [...ids];

        let aliasRows = [];
        let sofaRows = [];

        for (let i = 0; i < idArray.length; i += 500) {
          const chunk = idArray.slice(i, i + 500);

const [a, s] = await Promise.all([
  fetchAllSupabase(
    supabase,
    "team_aliases",
    "*",
    {
      filters: [
        {
          type: "in",
          column: "team_id",
          values: chunk,
        },
      ],
    }
  ),

  fetchAllSupabase(
    supabase,
    "sofa_teams",
    "*",
    {
      filters: [
        {
          type: "in",
          column: "id",
          values: chunk,
        },
      ],
    }
  ),
]);

          aliasRows.push(...a);
          sofaRows.push(...s);
        }

        if (!alive) return;

        console.log(
          "[SCREEN4] Alias redova:",
          aliasRows.length
        );

        setHistory(matches);
        setAliases(aliasRows);
        setSofaTeams(sofaRows);
      } catch (e) {
        console.error("[SCREEN4]", e);
        if (alive) setError(e.message || "Greška pri učitavanju podataka.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

  // ============================================================
  // MAPA MOZART ALIAS -> TEAM ID
  // ============================================================

  const aliasMap = useMemo(() => {
    const map = {};

    aliases.forEach((a) => {
      const key = normalize(a.alias);
      if (!key) return;

      if (!map[key]) map[key] = [];

      map[key].push({
        teamId: a.team_id,
        leagueId: a.league_id,
        countryId: a.country_id,
        alias: a.alias,
      });
    });

    sofaTeams.forEach((t) => {
      const key = normalize(t.name);
      if (!key) return;

      if (!map[key]) map[key] = [];

      map[key].push({
        teamId: t.id,
        leagueId: t.league_id,
        countryId: t.country_id,
        alias: t.name,
      });
    });

    return map;
  }, [aliases, sofaTeams]);

  // ============================================================
  // STATISTIKA PO TEAM ID
  // ============================================================

  const teamStats = useMemo(() => {
    const stats = {};

    const sorted = [...history]
      .filter((m) => parseScore(m.ft))
      .sort((a, b) => {
        const da = `${a.match_date || ""} ${a.match_time || ""}`;
        const db = `${b.match_date || ""} ${b.match_time || ""}`;
        return da.localeCompare(db);
      });

    sorted.forEach((m) => {
      const score = parseScore(m.ft);

      if (!score) return;
      if (m.home_team_id == null || m.away_team_id == null) return;

      const homeId = String(m.home_team_id);
      const awayId = String(m.away_team_id);

      if (!stats[homeId]) stats[homeId] = makeStats();
      if (!stats[awayId]) stats[awayId] = makeStats();

      addResult(
        stats[homeId],
        score.home,
        score.away,
        true,
        m.league_id
      );

      addResult(
        stats[awayId],
        score.away,
        score.home,
        false,
        m.league_id
      );
    });

    return stats;
  }, [history]);

  // ============================================================
  // H2H PO TEAM ID
  // ============================================================

  const h2hMap = useMemo(() => {
    const map = {};

    history.forEach((m) => {
      const score = parseScore(m.ft);

      if (!score) return;
      if (m.home_team_id == null || m.away_team_id == null) return;

      const h = String(m.home_team_id);
      const a = String(m.away_team_id);

      if (!map[h]) map[h] = {};
      if (!map[h][a]) map[h][a] = [];

      map[h][a].push({
        gf: score.home,
        ga: score.away,
      });
    });

    return map;
  }, [history]);

  // ============================================================
  // PRONALAŽENJE TEAM ID ZA SCREEN3 MEČ
  // ============================================================

  const resolveTeam = (name, explicitId) => {
    if (explicitId != null) {
      return {
        teamId: String(explicitId),
        confidence: 100,
      };
    }

    const key = normalize(name);
    const found = aliasMap[key];

    if (!found || !found.length) {
      return {
        teamId: null,
        confidence: 0,
      };
    }

    return {
      teamId: String(found[0].teamId),
      confidence: 90,
      matches: found,
    };
  };

  // ============================================================
  // MODEL
  // ============================================================

  const predict = (match) => {
    const homeName = getHomeName(match);
    const awayName = getAwayName(match);
    const leagueName = getLeagueName(match);

    const homeResolved = resolveTeam(
      homeName,
      first(
        match.home_team_id,
        match.homeTeamId,
        match.home_id
      )
    );

    const awayResolved = resolveTeam(
      awayName,
      first(
        match.away_team_id,
        match.awayTeamId,
        match.away_id
      )
    );

    const home = homeResolved.teamId
      ? teamStats[homeResolved.teamId]
      : null;

    const away = awayResolved.teamId
      ? teamStats[awayResolved.teamId]
      : null;

    const homeGames = home?.games || 0;
    const awayGames = away?.games || 0;

    // ----------------------------------------------------------
    // OSNOVNE VEROVATNOĆE
    // ----------------------------------------------------------

    const homeGG = pct(home?.gg || 0, homeGames, 50);
    const awayGG = pct(away?.gg || 0, awayGames, 50);

    const ggForm = (homeGG + awayGG) / 2;

    const homeOver15 = pct(
      home?.over15 || 0,
      homeGames,
      65
    );

    const awayOver15 = pct(
      away?.over15 || 0,
      awayGames,
      65
    );

    const over15 = (homeOver15 + awayOver15) / 2;

    const homeOver25 = pct(
      home?.over25 || 0,
      homeGames,
      55
    );

    const awayOver25 = pct(
      away?.over25 || 0,
      awayGames,
      55
    );

    const over25 = (homeOver25 + awayOver25) / 2;

    const homeOver35 = pct(
      home?.over35 || 0,
      homeGames,
      35
    );

    const awayOver35 = pct(
      away?.over35 || 0,
      awayGames,
      35
    );

    const over35 = (homeOver35 + awayOver35) / 2;

    // ----------------------------------------------------------
    // HOME / AWAY
    // ----------------------------------------------------------

    const homeWin = pct(
      home?.homeWins || 0,
      home?.homeGames || 0,
      50
    );

    const awayWin = pct(
      away?.awayWins || 0,
      away?.awayGames || 0,
      30
    );

    const homeDraw = pct(
      home?.homeDraws || 0,
      home?.homeGames || 0,
      25
    );

    const awayDraw = pct(
      away?.awayDraws || 0,
      away?.awayGames || 0,
      25
    );

    // ----------------------------------------------------------
    // GOALS
    // ----------------------------------------------------------

    const homeGF = homeGames
      ? home.gf / homeGames
      : 1.3;

    const homeGA = homeGames
      ? home.ga / homeGames
      : 1.3;

    const awayGF = awayGames
      ? away.gf / awayGames
      : 1.1;

    const awayGA = awayGames
      ? away.ga / awayGames
      : 1.3;

    const expectedHomeGoals =
      homeGF * 0.55 +
      awayGA * 0.45;

    const expectedAwayGoals =
      awayGF * 0.55 +
      homeGA * 0.45;

    const expectedGoals =
      expectedHomeGoals + expectedAwayGoals;

    // ----------------------------------------------------------
    // FORMA
    // ----------------------------------------------------------

    const formScore = (s) => {
      if (!s?.last5?.length) return 50;

      const points = s.last5.reduce(
        (sum, x) =>
          sum + (x === "W" ? 3 : x === "D" ? 1 : 0),
        0
      );

      return (points / (s.last5.length * 3)) * 100;
    };

    const homeForm = formScore(home);
    const awayForm = formScore(away);

    // ----------------------------------------------------------
    // H2H
    // ----------------------------------------------------------

    let h2hGG = 50;
    let h2hHomeWin = 50;

    if (
      homeResolved.teamId &&
      awayResolved.teamId
    ) {
      const h2h =
        h2hMap[homeResolved.teamId]?.[
          awayResolved.teamId
        ];

      if (h2h?.length) {
        const recent = h2h.slice(-10);

        h2hGG = pct(
          recent.filter(
            x => x.gf > 0 && x.ga > 0
          ).length,
          recent.length,
          50
        );

        h2hHomeWin = pct(
          recent.filter(
            x => x.gf > x.ga
          ).length,
          recent.length,
          50
        );
      }
    }

    // ----------------------------------------------------------
    // GG / NG MODEL
    //
    // Više izvora, bez duplog "dodavanja procenata".
    // ----------------------------------------------------------

    const gg =
      ggForm * 0.55 +
      h2hGG * 0.10 +
      clamp(
        (expectedHomeGoals > 0.85 ? 50 : 35) +
        (expectedAwayGoals > 0.75 ? 15 : 0),
        0,
        100
      ) * 0.35;

    const ng = 100 - gg;

    // ----------------------------------------------------------
    // OVER MODEL
    // ----------------------------------------------------------

    const modelOver15 =
      over15 * 0.55 +
      clamp(
        expectedGoals >= 2 ? 80 : 55,
        0,
        100
      ) * 0.45;

    const modelOver25 =
      over25 * 0.60 +
      clamp(
        expectedGoals >= 2.7 ? 72 :
        expectedGoals >= 2.3 ? 60 :
        expectedGoals >= 1.9 ? 48 :
        35,
        0,
        100
      ) * 0.40;

    const modelOver35 =
      over35 * 0.65 +
      clamp(
        expectedGoals >= 3.6 ? 65 :
        expectedGoals >= 3.2 ? 52 :
        expectedGoals >= 2.8 ? 40 :
        25,
        0,
        100
      ) * 0.35;

    // ----------------------------------------------------------
    // 1X2
    //
    // Ovo nije Poisson model; za prvu verziju koristimo
    // kombinaciju home/away forme + golova + H2H.
    // ----------------------------------------------------------

    let p1 =
      homeWin * 0.40 +
      homeForm * 0.15 +
      clamp(
        50 +
        (expectedHomeGoals - expectedAwayGoals) * 25,
        0,
        100
      ) * 0.30 +
      h2hHomeWin * 0.15;

    let p2 =
      awayWin * 0.40 +
      awayForm * 0.15 +
      clamp(
        50 +
        (expectedAwayGoals - expectedHomeGoals) * 25,
        0,
        100
      ) * 0.30 +
      (100 - h2hHomeWin) * 0.15;

    let px =
      ((homeDraw + awayDraw) / 2) * 0.65 +
      clamp(
        50 -
        Math.abs(
          expectedHomeGoals - expectedAwayGoals
        ) * 30,
        20,
        80
      ) * 0.35;

    const total1x2 = p1 + px + p2 || 1;

    p1 = (p1 / total1x2) * 100;
    px = (px / total1x2) * 100;
    p2 = (p2 / total1x2) * 100;

    // ----------------------------------------------------------
    // CONFIDENCE
    // ----------------------------------------------------------

    const dataQuality = clamp(
      (
        Math.min(homeGames / 15, 1) +
        Math.min(awayGames / 15, 1)
      ) / 2 * 100
    );

    const agreement = 100 -
      Math.abs(homeForm - awayForm) * 0.20;

    const confidence = clamp(
      dataQuality * 0.45 +
      agreement * 0.30 +
      Math.max(p1, px, p2) * 0.25
    );

    // ----------------------------------------------------------
    // KVOTE
    // ----------------------------------------------------------

    const odds = getOdds(match);

    const implied = (odd) =>
      odd && odd > 1 ? 100 / odd : null;

    const value = (probability, odd) => {
      if (!odd || odd <= 1) return null;

      const impliedProbability = implied(odd);

      return probability - impliedProbability;
    };

    const markets = [
      {
        key: "1",
        label: "1",
        probability: p1,
        odd: odds.home,
      },
      {
        key: "X",
        label: "X",
        probability: px,
        odd: odds.draw,
      },
      {
        key: "2",
        label: "2",
        probability: p2,
        odd: odds.away,
      },
      {
        key: "GG",
        label: "GG",
        probability: gg,
        odd: odds.gg,
      },
      {
        key: "NG",
        label: "NG",
        probability: ng,
        odd: odds.ng,
      },
      {
        key: "O1.5",
        label: "O1.5",
        probability: modelOver15,
        odd: odds.over15,
      },
      {
        key: "O2.5",
        label: "O2.5",
        probability: modelOver25,
        odd: odds.over25,
      },
      {
        key: "O3.5",
        label: "O3.5",
        probability: modelOver35,
        odd: odds.over35,
      },
      {
        key: "U2.5",
        label: "U2.5",
        probability: 100 - modelOver25,
        odd: odds.under25,
      },
    ].map(x => ({
      ...x,
      probability: round(clamp(x.probability)),
      implied: x.odd ? round(implied(x.odd)) : null,
      value: x.odd
        ? round(value(x.probability, x.odd))
        : null,
    }));

    // ----------------------------------------------------------
    // BEST PICK
    // ----------------------------------------------------------

    const available = markets.filter(
      x =>
        x.odd &&
        x.odd > 1 &&
        x.probability >= 55
    );

    let best = null;

    if (available.length) {
      best = [...available].sort((a, b) => {
        const av = a.value ?? -999;
        const bv = b.value ?? -999;

        if (bv !== av) return bv - av;

        return b.probability - a.probability;
      })[0];
    }

    // ----------------------------------------------------------
    // SAFE PICK
    // ----------------------------------------------------------

    const safe = [...available]
      .filter(x => x.probability >= 65)
      .sort((a, b) =>
        b.probability - a.probability
      )[0] || null;

return {
  ...match,

  homeName,
  awayName,
  leagueName,

  resolution: {
    homeResolved: !!homeResolved.teamId,
    awayResolved: !!awayResolved.teamId,
    homeGames,
    awayGames,
  },

  homeTeamId: homeResolved.teamId,
  awayTeamId: awayResolved.teamId,

      homeTeamId: homeResolved.teamId,
      awayTeamId: awayResolved.teamId,

      homeGames,
      awayGames,

      expectedHomeGoals: round(expectedHomeGoals),
      expectedAwayGoals: round(expectedAwayGoals),
      expectedGoals: round(expectedGoals),

      homeForm: round(homeForm),
      awayForm: round(awayForm),

      gg: round(gg),
      ng: round(ng),

      over15: round(modelOver15),
      over25: round(modelOver25),
      over35: round(modelOver35),

      p1: round(p1),
      px: round(px),
      p2: round(p2),

      h2hGG: round(h2hGG),

      confidence: round(confidence),
      dataQuality: round(dataQuality),

      odds,

      markets,
      best,
      safe,
    };
  };

  // ============================================================
  // SVE PREDIKCIJE
  // ============================================================

const predictions = useMemo(() => {
  if (!futureMatches?.length) return [];

  const result = futureMatches
    .map(predict)
    .filter(
      p =>
        p.homeName &&
        p.awayName
    );

  const diagnostics = {
    total: result.length,
    homeResolved: result.filter(
      p => p.resolution?.homeResolved
    ).length,
    awayResolved: result.filter(
      p => p.resolution?.awayResolved
    ).length,
    bothResolved: result.filter(
      p =>
        p.resolution?.homeResolved &&
        p.resolution?.awayResolved
    ).length,
    bothHave5Games: result.filter(
      p =>
        p.homeGames >= 5 &&
        p.awayGames >= 5
    ).length,
    hasBest: result.filter(
      p => !!p.best
    ).length,
    confidence65: result.filter(
      p => p.confidence >= 65
    ).length,
    probability62: result.filter(
      p => p.best?.probability >= 62
    ).length,
    value3: result.filter(
      p =>
        p.best?.value == null ||
        p.best.value >= 3
    ).length,
  };

  console.log(
    "[SCREEN4] DIJAGNOSTIKA",
    diagnostics
  );

  console.log(
    "[SCREEN4] PRVIH 20 MEČEVA",
    result.slice(0, 20).map(p => ({
      home: p.homeName,
      away: p.awayName,
      homeId: p.homeTeamId,
      awayId: p.awayTeamId,
      homeGames: p.homeGames,
      awayGames: p.awayGames,
      best: p.best?.label || null,
      probability: p.best?.probability || null,
      odd: p.best?.odd || null,
      value: p.best?.value || null,
      confidence: p.confidence,
    }))
  );

  return result;
}, [
  futureMatches,
  teamStats,
  aliasMap,
  h2hMap,
]);

  // ============================================================
  // FILTER / SORT
  // ============================================================

  const filteredPredictions = useMemo(() => {
    let arr = predictions.filter(
      p =>
        p.homeGames >= minGames &&
        p.awayGames >= minGames
    );

    if (market === "value") {
      arr = arr
        .filter(p => p.best?.value != null)
        .sort(
          (a, b) =>
            (b.best?.value || -999) -
            (a.best?.value || -999)
        );
    } else if (market === "confidence") {
      arr.sort(
        (a, b) =>
          b.confidence - a.confidence
      );
    } else if (market === "goals") {
      arr.sort(
        (a, b) =>
          b.expectedGoals -
          a.expectedGoals
      );
    } else {
      arr.sort(
        (a, b) =>
          (b.best?.probability || 0) -
          (a.best?.probability || 0)
      );
    }

    return arr;
  }, [
    predictions,
    market,
    minGames,
  ]);

const allPredictions = useMemo(() => {
  let arr = [...predictions];

  if (market === "value") {
    arr.sort(
      (a, b) =>
        (b.best?.value || -999) -
        (a.best?.value || -999)
    );
  } else if (market === "confidence") {
    arr.sort(
      (a, b) =>
        b.confidence - a.confidence
    );
  } else if (market === "goals") {
    arr.sort(
      (a, b) =>
        b.expectedGoals -
        a.expectedGoals
    );
  } else {
    arr.sort(
      (a, b) =>
        (b.best?.probability || 0) -
        (a.best?.probability || 0)
    );
  }

  return arr;
}, [predictions, market]);

  // ============================================================
  // TICKET BUILDER
  // ============================================================

  const ticket = useMemo(() => {
    const candidates = predictions
      .filter(p => p.best)
      .filter(p =>
        p.confidence >= 65
      )
      .filter(p =>
        p.best.probability >= 62
      )
      .filter(p =>
        p.best.value == null ||
        p.best.value >= 3
      )
      .sort((a, b) => {
        const scoreA =
          a.best.probability * 0.65 +
          a.confidence * 0.25 +
          Math.max(a.best.value || 0, 0) * 0.10;

        const scoreB =
          b.best.probability * 0.65 +
          b.confidence * 0.25 +
          Math.max(b.best.value || 0, 0) * 0.10;

        return scoreB - scoreA;
      });

    // Maksimalno 5 različitih utakmica.
    // Namerno ne pravimo ogroman tiket.
    const selected = [];

    const used = new Set();

    for (const p of candidates) {
      const key =
        `${p.homeTeamId || p.homeName}|${p.awayTeamId || p.awayName}`;

      if (used.has(key)) continue;

      used.add(key);
      selected.push(p);

      if (selected.length >= 5) break;
    }

    const totalOdd = selected.reduce(
      (sum, p) =>
        sum * (p.best?.odd || 1),
      1
    );

    const averageProbability =
      selected.length
        ? selected.reduce(
            (sum, p) =>
              sum + (p.best?.probability || 0),
            0
          ) / selected.length
        : 0;

    return {
      selected,
      totalOdd,
      averageProbability,
    };
  }, [predictions]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="screen4">
        <h2>SCREEN 4 — PREDIKCIJA</h2>
        <div className="prediction-loading">
          Učitavam istorijsku statistiku...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen4">
        <h2>SCREEN 4 — PREDIKCIJA</h2>

        <div className="prediction-error">
          {error}
        </div>
      </div>
    );
  }

return (
  <div className="screen4">

    <div className="screen4-header">
      <div>
        <h2>SCREEN 4 — PREDIKCIJA</h2>

        <div className="screen4-subtitle">
          Istorijska statistika + Screen 3 + Mozzart kvote
        </div>
      </div>

      <div className="screen4-stats">
        <span>
          Istorija: <b>{history.length}</b>
        </span>

        <span>
          Budući mečevi: <b>{predictions.length}</b>
        </span>

        <span>
          Kandidati za tiket: <b>{ticket.selected.length}</b>
        </span>
      </div>
    </div>

    {/* ======================================================
        TABS
    ====================================================== */}

    <div className="screen4-tabs">

      <button
        className={
          activeView === "ticket"
            ? "active"
            : ""
        }
        onClick={() =>
          setActiveView("ticket")
        }
      >
        🔥 PREDLOG TIKETA
      </button>

      <button
        className={
          activeView === "predictions"
            ? "active"
            : ""
        }
        onClick={() =>
          setActiveView("predictions")
        }
      >
        📊 SVE PREDIKCIJE
      </button>

    </div>


    {/* ======================================================
        TICKET VIEW
    ====================================================== */}

    {activeView === "ticket" && (
      <>

        <div className="prediction-ticket">

          <div className="ticket-title">
            🔥 PREDLOG TIKETA
          </div>

          {ticket.selected.length === 0 ? (

            <div className="ticket-empty">
              Trenutno nema dovoljno jakih kandidata.
              Model neće forsirati tiket.
            </div>

          ) : (

            <>
              <div className="ticket-list">

                {ticket.selected.map((p, i) => (

                  <div
                    className="ticket-row"
                    key={i}
                  >

                    <span className="ticket-number">
                      {i + 1}.
                    </span>

                    <span className="ticket-match">
                      {p.homeName} — {p.awayName}
                    </span>

                    <b className="ticket-pick">
                      {p.best.label}
                    </b>

                    {p.best.odd && (
                      <span>
                        @ {p.best.odd.toFixed(2)}
                      </span>
                    )}

                    <span>
                      {p.best.probability}%
                    </span>

                  </div>

                ))}

              </div>


              <div className="ticket-summary">

                <b>
                  Ukupna kvota:{" "}
                  {ticket.totalOdd.toFixed(2)}
                </b>

                <span>
                  Prosečna verovatnoća:{" "}
                  {ticket.averageProbability.toFixed(1)}%
                </span>

              </div>

            </>

          )}

        </div>


        {/* ======================================================
            FILTERS — TICKET
        ====================================================== */}

        <div className="prediction-controls">

          <label>
            Sortiranje:

            <select
              value={market}
              onChange={e =>
                setMarket(e.target.value)
              }
            >

              <option value="best">
                Najbolji izbor
              </option>

              <option value="value">
                Najveći VALUE
              </option>

              <option value="confidence">
                Najveći confidence
              </option>

              <option value="goals">
                Najviše golova
              </option>

            </select>

          </label>


          <label>
            Minimum utakmica:

            <select
              value={minGames}
              onChange={e =>
                setMinGames(
                  Number(e.target.value)
                )
              }
            >

              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>

            </select>

          </label>

        </div>


        {/* ======================================================
            TICKET TABLE
        ====================================================== */}

        <div className="prediction-table-wrap">

          <table className="prediction-table">

            <thead>
              <tr>

                <th>#</th>
                <th>Datum</th>
                <th>Liga</th>
                <th>Home</th>
                <th>Away</th>

                <th>1</th>
                <th>X</th>
                <th>2</th>

                <th>GG</th>
                <th>O2.5</th>

                <th>xG</th>
                <th>Best</th>
                <th>Odds</th>
                <th>Value</th>

                <th>Home G.</th>
                <th>Away G.</th>
                <th>DQ</th>
                <th>Conf.</th>

              </tr>
            </thead>


            <tbody>

              {filteredPredictions.map((p, i) => (

                <tr
                  key={`${p.homeName}-${p.awayName}-${i}`}
                  onClick={() =>
                    setSelected(p)
                  }
                >

                  <td>
                    {i + 1}
                  </td>


                  <td>
                    {getDateValue(p) || "-"}
                    <br />

                    <small>
                      {getTimeValue(p)}
                    </small>
                  </td>


                  <td>
                    {p.leagueName || "-"}
                  </td>


                  <td>
                    <b>
                      {p.homeName}
                    </b>

                    <small>
                      ID: {p.homeTeamId || "?"}
                    </small>
                  </td>


                  <td>
                    <b>
                      {p.awayName}
                    </b>

                    <small>
                      ID: {p.awayTeamId || "?"}
                    </small>
                  </td>


                  <td>
                    {p.p1}%
                  </td>

                  <td>
                    {p.px}%
                  </td>

                  <td>
                    {p.p2}%
                  </td>


                  <td>
                    {p.gg}%
                  </td>

                  <td>
                    {p.over25}%
                  </td>


                  <td>
                    {p.expectedGoals}
                  </td>


                  <td>
                    {p.best ? (
                      <b>
                        {p.best.label}
                      </b>
                    ) : (
                      "-"
                    )}
                  </td>


                  <td>
                    {p.best?.odd
                      ? p.best.odd.toFixed(2)
                      : "-"
                    }
                  </td>


                  <td
                    className={
                      p.best?.value >= 5
                        ? "value-positive"
                        : ""
                    }
                  >
                    {p.best?.value != null
                      ? `${p.best.value}%`
                      : "-"
                    }
                  </td>


                  <td>
                    {p.homeGames}
                  </td>

                  <td>
                    {p.awayGames}
                  </td>

                  <td>
                    {p.dataQuality}%
                  </td>

                  <td>
                    <b>
                      {p.confidence}
                    </b>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </>
    )}


    {/* ======================================================
        ALL PREDICTIONS VIEW
    ====================================================== */}

    {activeView === "predictions" && (
      <>

        <div className="prediction-section-title">
          <h3>
            📊 SVE PREDIKCIJE
          </h3>

          <span>
            Prikazano: <b>{allPredictions.length}</b>{" "}
            / {predictions.length}
          </span>
        </div>


        {/* ======================================================
            SORT — ALL PREDICTIONS
        ====================================================== */}

        <div className="prediction-controls">

          <label>
            Sortiranje:

            <select
              value={market}
              onChange={e =>
                setMarket(e.target.value)
              }
            >

              <option value="best">
                Najbolji izbor
              </option>

              <option value="value">
                Najveći VALUE
              </option>

              <option value="confidence">
                Najveći confidence
              </option>

              <option value="goals">
                Najviše golova
              </option>

            </select>

          </label>

        </div>


        {/* ======================================================
            ALL PREDICTIONS TABLE
        ====================================================== */}

        <div className="prediction-table-wrap">

          <table className="prediction-table">

            <thead>
              <tr>

                <th>#</th>
                <th>Datum</th>
                <th>Liga</th>
                <th>Home</th>
                <th>Away</th>

                <th>1</th>
                <th>X</th>
                <th>2</th>

                <th>GG</th>
                <th>O2.5</th>

                <th>xG</th>
                <th>Best</th>
                <th>Odds</th>
                <th>Value</th>

                <th>Home G.</th>
                <th>Away G.</th>
                <th>DQ</th>
                <th>Conf.</th>

              </tr>
            </thead>


            <tbody>

              {allPredictions.map((p, i) => (

                <tr
                  key={`${p.homeName}-${p.awayName}-all-${i}`}
                  onClick={() =>
                    setSelected(p)
                  }
                >

                  <td>
                    {i + 1}
                  </td>


                  <td>
                    {getDateValue(p) || "-"}
                    <br />

                    <small>
                      {getTimeValue(p)}
                    </small>
                  </td>


                  <td>
                    {p.leagueName || "-"}
                  </td>


                  <td>
                    <b>
                      {p.homeName}
                    </b>

                    <small>
                      ID: {p.homeTeamId || "?"}
                    </small>
                  </td>


                  <td>
                    <b>
                      {p.awayName}
                    </b>

                    <small>
                      ID: {p.awayTeamId || "?"}
                    </small>
                  </td>


                  <td>
                    {p.p1}%
                  </td>

                  <td>
                    {p.px}%
                  </td>

                  <td>
                    {p.p2}%
                  </td>


                  <td>
                    {p.gg}%
                  </td>

                  <td>
                    {p.over25}%
                  </td>


                  <td>
                    {p.expectedGoals}
                  </td>


                  <td>
                    {p.best ? (
                      <b>
                        {p.best.label}
                      </b>
                    ) : (
                      "-"
                    )}
                  </td>


                  <td>
                    {p.best?.odd
                      ? p.best.odd.toFixed(2)
                      : "-"
                    }
                  </td>


                  <td
                    className={
                      p.best?.value >= 5
                        ? "value-positive"
                        : ""
                    }
                  >
                    {p.best?.value != null
                      ? `${p.best.value}%`
                      : "-"
                    }
                  </td>


                  <td>
                    {p.homeGames}
                  </td>

                  <td>
                    {p.awayGames}
                  </td>

                  <td>
                    {p.dataQuality}%
                  </td>

                  <td>
                    <b>
                      {p.confidence}
                    </b>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </>
    )}


    {/* ======================================================
        DETAIL POPUP
    ====================================================== */}

    {selected && (
      <div
        className="prediction-overlay"
        onClick={() =>
          setSelected(null)
        }
      >

        <div
          className="prediction-modal"
          onClick={e =>
            e.stopPropagation()
          }
        >

          <button
            className="prediction-close"
            onClick={() =>
              setSelected(null)
            }
          >
            ✕
          </button>


          <h2>
            {selected.homeName}
            {" "}
            —
            {" "}
            {selected.awayName}
          </h2>


          <p>
            {selected.leagueName}
          </p>


          <div className="prediction-detail-grid">

            <div>
              <span>1</span>
              <b>{selected.p1}%</b>
            </div>

            <div>
              <span>X</span>
              <b>{selected.px}%</b>
            </div>

            <div>
              <span>2</span>
              <b>{selected.p2}%</b>
            </div>

            <div>
              <span>GG</span>
              <b>{selected.gg}%</b>
            </div>

            <div>
              <span>NG</span>
              <b>{selected.ng}%</b>
            </div>

            <div>
              <span>O1.5</span>
              <b>{selected.over15}%</b>
            </div>

            <div>
              <span>O2.5</span>
              <b>{selected.over25}%</b>
            </div>

            <div>
              <span>O3.5</span>
              <b>{selected.over35}%</b>
            </div>

            <div>
              <span>xG</span>
              <b>{selected.expectedGoals}</b>
            </div>

            <div>
              <span>Home xG</span>
              <b>
                {selected.expectedHomeGoals}
              </b>
            </div>

            <div>
              <span>Away xG</span>
              <b>
                {selected.expectedAwayGoals}
              </b>
            </div>

            <div>
              <span>H2H GG</span>
              <b>
                {selected.h2hGG}%
              </b>
            </div>

          </div>


          <hr />


          <h3>
            Najbolji izbor
          </h3>


          {selected.best ? (

            <div className="best-pick">

              <strong>
                {selected.best.label}
              </strong>

              <span>
                Model:{" "}
                {selected.best.probability}%
              </span>

              {selected.best.odd && (
                <span>
                  Mozzart:{" "}
                  @{" "}
                  {selected.best.odd.toFixed(2)}
                </span>
              )}

              {selected.best.value != null && (
                <span>
                  Value:{" "}
                  {selected.best.value}%
                </span>
              )}

            </div>

          ) : (

            <p>
              Nema dovoljno jakog izbora.
            </p>

          )}


          <hr />


          <h3>
            Kvalitet podataka
          </h3>


          <p>
            Home utakmice:{" "}
            <b>
              {selected.homeGames}
            </b>
          </p>


          <p>
            Away utakmice:{" "}
            <b>
              {selected.awayGames}
            </b>
          </p>


          <p>
            Data quality:{" "}
            <b>
              {selected.dataQuality}%
            </b>
          </p>


          <p>
            Confidence:{" "}
            <b>
              {selected.confidence}/100
            </b>
          </p>

        </div>

      </div>
    )}

  </div>
);


}
