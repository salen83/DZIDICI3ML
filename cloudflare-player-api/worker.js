import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

const PROFILE_BATCH_MAX = 10000;
const ID_BATCH_MAX = 10000;

function jsonResponse(data, options = {}) {
  const response = Response.json(data, options);

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function normalizePlayerId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const id = String(value).trim();

  if (!/^\d+$/.test(id)) {
    return null;
  }

  return id;
}

function normalizeProfile(player) {
  const playerId = normalizePlayerId(player?.player_id);

  if (!playerId) {
    return null;
  }

  return {
    player_id: playerId,

    name:
      player.name === undefined ||
      player.name === null ||
      player.name === ""
        ? null
        : String(player.name),

    slug:
      player.slug === undefined ||
      player.slug === null ||
      player.slug === ""
        ? null
        : String(player.slug),

    position:
      player.position === undefined ||
      player.position === null ||
      player.position === ""
        ? null
        : String(player.position),

    nationality:
      player.nationality === undefined ||
      player.nationality === null ||
      player.nationality === ""
        ? null
        : String(player.nationality),

    date_of_birth:
      player.date_of_birth === undefined ||
      player.date_of_birth === null ||
      player.date_of_birth === ""
        ? null
        : player.date_of_birth,

    height_cm:
      player.height_cm === undefined ||
      player.height_cm === null ||
      player.height_cm === ""
        ? null
        : Number(player.height_cm),

    preferred_foot:
      player.preferred_foot === undefined ||
      player.preferred_foot === null ||
      player.preferred_foot === ""
        ? null
        : String(player.preferred_foot)
  };
}

function isCompleteProfile(player) {
  if (!player) {
    return false;
  }

  return (
    player.name !== null &&
    player.name !== "" &&

    player.slug !== null &&
    player.slug !== "" &&

    player.position !== null &&
    player.position !== "" &&

    player.nationality !== null &&
    player.nationality !== "" &&

    player.date_of_birth !== null &&
    player.date_of_birth !== "" &&

    player.height_cm !== null &&
    player.height_cm !== undefined &&

    player.preferred_foot !== null &&
    player.preferred_foot !== ""
  );
}

function profileScore(player) {
  if (!player) {
    return 0;
  }

  let score = 0;

  if (player.name !== null && player.name !== "") {
    score++;
  }

  if (player.slug !== null && player.slug !== "") {
    score++;
  }

  if (player.position !== null && player.position !== "") {
    score++;
  }

  if (player.nationality !== null && player.nationality !== "") {
    score++;
  }

  if (
    player.date_of_birth !== null &&
    player.date_of_birth !== ""
  ) {
    score++;
  }

  if (
    player.height_cm !== null &&
    player.height_cm !== undefined
  ) {
    score++;
  }

  if (
    player.preferred_foot !== null &&
    player.preferred_foot !== ""
  ) {
    score++;
  }

  return score;
}

function dedupeProfiles(players) {
  const map = new Map();

  for (const player of players) {
    if (!player || player.player_id == null) {
      continue;
    }

    const id = String(player.player_id);

    const previous = map.get(id);

    if (!previous) {
      map.set(id, player);
      continue;
    }

    if (profileScore(player) >= profileScore(previous)) {
      map.set(id, player);
    }
  }

  return Array.from(map.values());
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);


// =========================================================
// GET /teams/:team_id/players
// Trenutni igraci tima iz Neon-a
// =========================================================

if (
  request.method === "GET" &&
  url.pathname.startsWith("/teams/") &&
  url.pathname.endsWith("/players")
) {
  const parts = url.pathname.split("/");
  const teamId = parts[2];

  if (!/^\d+$/.test(teamId || "")) {
    return jsonResponse(
      {
        ok: false,
        error: "Valid team_id is required"
      },
      { status: 400 }
    );
  }

  const result = await client.query(
    `
      SELECT
        p.player_id,
        p.name,
        p.slug,
        p.position,
        p.nationality,
        p.date_of_birth,
        p.height_cm,
        p.preferred_foot,
        p.created_at,
        p.updated_at
      FROM player_team_history h
      INNER JOIN players p
        ON p.player_id = h.player_id
      WHERE h.team_id = $1
        AND h.is_current = true
      ORDER BY
        CASE
          WHEN p.name IS NULL OR p.name = '' THEN 1
          ELSE 0
        END,
        p.name ASC,
        p.player_id ASC
    `,
    [teamId]
  );

  return jsonResponse({
    ok: true,
    team_id: teamId,
    count: result.rows.length,
    players: result.rows
  });
}

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString
    });

    try {
      await client.connect();


      // =========================================================
      // GET /
      // =========================================================

      if (
        request.method === "GET" &&
        url.pathname === "/"
      ) {
        const result = await client.query(`
          SELECT
            player_id,
            name
          FROM players
          ORDER BY player_id
          LIMIT 10
        `);

        return jsonResponse({
          ok: true,
          data: result.rows
        });
      }

      // =========================================================
      // GET /players/count
      // =========================================================

      if (
        request.method === "GET" &&
        url.pathname === "/players/count"
      ) {
        const result = await client.query(`
          SELECT COUNT(*)::bigint AS total
          FROM players
        `);

        return jsonResponse({
          ok: true,
          total: Number(result.rows[0].total)
        });
      }

      // =========================================================
      // GET /players/ids
      // =========================================================

      if (
        request.method === "GET" &&
        url.pathname === "/players/ids"
      ) {
        const requestedLimit = Number(
          url.searchParams.get("limit") || "1000"
        );

        const requestedOffset = Number(
          url.searchParams.get("offset") || "0"
        );

        const limit = Math.min(
          Math.max(requestedLimit, 1),
          5000
        );

        const offset = Math.max(
          requestedOffset,
          0
        );

        const result = await client.query(
          `
          SELECT player_id
          FROM players
          ORDER BY player_id
          LIMIT $1
          OFFSET $2
          `,
          [limit, offset]
        );

        return jsonResponse({
          ok: true,
          limit,
          offset,
          count: result.rows.length,
          player_ids: result.rows.map(row =>
            String(row.player_id)
          )
        });
      }

      // =========================================================
      // POST /players/profile-status
      //
      // Proverava stvarno stanje profila u Neon-u.
      //
      // BODY:
      // {
      //   "player_ids": ["123", "456"]
      // }
      // =========================================================

      if (
        request.method === "POST" &&
        url.pathname === "/players/profile-status"
      ) {
        const body = await request.json();

        if (!Array.isArray(body.player_ids)) {
          return jsonResponse(
            {
              ok: false,
              error: "player_ids must be an array"
            },
            { status: 400 }
          );
        }

        if (body.player_ids.length === 0) {
          return jsonResponse({
            ok: true,
            players: []
          });
        }

        if (body.player_ids.length > ID_BATCH_MAX) {
          return jsonResponse(
            {
              ok: false,
              error:
                `Maximum ${ID_BATCH_MAX} player_ids per batch`
            },
            { status: 400 }
          );
        }

        const ids = [];
        const invalid = [];

        for (const rawId of body.player_ids) {
          const id = normalizePlayerId(rawId);

          if (!id) {
            invalid.push(rawId);
            continue;
          }

          ids.push(id);
        }

        const uniqueIds = [
          ...new Set(ids)
        ];

        if (uniqueIds.length === 0) {
          return jsonResponse(
            {
              ok: false,
              error: "No valid player_ids",
              invalid
            },
            { status: 400 }
          );
        }

        const result = await client.query(
          `
          SELECT
            player_id,
            name,
            slug,
            position,
            nationality,
            date_of_birth,
            height_cm,
            preferred_foot
          FROM players
          WHERE player_id = ANY($1::bigint[])
          `,
          [uniqueIds]
        );

        const existing = new Map();

        for (const row of result.rows) {
          existing.set(
            String(row.player_id),
            row
          );
        }

        const players = uniqueIds.map(id => {
          const row = existing.get(id);

          if (!row) {
            return {
              player_id: id,
              exists: false,
              complete: false,
              score: 0
            };
          }

          return {
            player_id: id,
            exists: true,
            complete: isCompleteProfile(row),
            score: profileScore(row)
          };
        });

        return jsonResponse({
          ok: true,
          players,
          invalid
        });
      }

      // =========================================================
      // POST /players/ids/batch
      // =========================================================

      if (
        request.method === "POST" &&
        url.pathname === "/players/ids/batch"
      ) {
        const body = await request.json();

        if (!Array.isArray(body.player_ids)) {
          return jsonResponse(
            {
              ok: false,
              error: "player_ids must be an array"
            },
            { status: 400 }
          );
        }

        if (body.player_ids.length === 0) {
          return jsonResponse({
            ok: true,
            inserted: 0,
            existing: 0,
            total: 0
          });
        }

        if (body.player_ids.length > ID_BATCH_MAX) {
          return jsonResponse(
            {
              ok: false,
              error:
                `Maximum ${ID_BATCH_MAX} player_ids per batch`
            },
            { status: 400 }
          );
        }

        const ids = [];
        const invalid = [];

        for (const rawId of body.player_ids) {
          const playerId = normalizePlayerId(rawId);

          if (!playerId) {
            invalid.push(rawId);
            continue;
          }

          ids.push(playerId);
        }

        const uniqueIds = [
          ...new Set(ids)
        ];

        if (uniqueIds.length === 0) {
          return jsonResponse(
            {
              ok: false,
              error: "No valid player_ids",
              invalid
            },
            { status: 400 }
          );
        }

        const values = [];
        const placeholders = [];

        for (let i = 0; i < uniqueIds.length; i++) {
          const param = i + 1;

          placeholders.push(
            `($${param}, NULL)`
          );

          values.push(uniqueIds[i]);
        }

        const result = await client.query(
          `
          INSERT INTO players (
            player_id,
            name
          )
          VALUES
            ${placeholders.join(",")}
          ON CONFLICT (player_id)
          DO NOTHING
          RETURNING player_id
          `,
          values
        );

        return jsonResponse({
          ok: true,
          inserted: result.rowCount,
          existing:
            uniqueIds.length - result.rowCount,
          total: uniqueIds.length,
          received: ids.length,
          duplicatesRemoved:
            ids.length - uniqueIds.length,
          invalid
        });
      }

      // =========================================================
      // POST /players
      // =========================================================

      if (
        request.method === "POST" &&
        url.pathname === "/players"
      ) {
        const body = await request.json();

        const player = normalizeProfile(body);

        if (!player) {
          return jsonResponse(
            {
              ok: false,
              error: "Valid player_id is required"
            },
            { status: 400 }
          );
        }

        const result = await client.query(
          `
          INSERT INTO players (
            player_id,
            name,
            slug,
            position,
            nationality,
            date_of_birth,
            height_cm,
            preferred_foot
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )

          ON CONFLICT (player_id)
          DO UPDATE SET

            name =
              COALESCE(
                EXCLUDED.name,
                players.name
              ),

            slug =
              COALESCE(
                EXCLUDED.slug,
                players.slug
              ),

            position =
              COALESCE(
                EXCLUDED.position,
                players.position
              ),

            nationality =
              COALESCE(
                EXCLUDED.nationality,
                players.nationality
              ),

            date_of_birth =
              COALESCE(
                EXCLUDED.date_of_birth,
                players.date_of_birth
              ),

            height_cm =
              COALESCE(
                EXCLUDED.height_cm,
                players.height_cm
              ),

            preferred_foot =
              COALESCE(
                EXCLUDED.preferred_foot,
                players.preferred_foot
              ),

            updated_at = NOW()

          RETURNING
            player_id,
            name,
            slug,
            position,
            nationality,
            date_of_birth,
            height_cm,
            preferred_foot,
            created_at,
            updated_at
          `,
          [
            player.player_id,
            player.name,
            player.slug,
            player.position,
            player.nationality,
            player.date_of_birth,
            player.height_cm,
            player.preferred_foot
          ]
        );

        return jsonResponse({
          ok: true,
          player: result.rows[0],
          complete:
            isCompleteProfile(result.rows[0]),
          score:
            profileScore(result.rows[0])
        });
      }

      // =========================================================
      // POST /players/batch
      //
      // DEDUP + UPSERT
      // =========================================================

      if (
        request.method === "POST" &&
        url.pathname === "/players/batch"
      ) {
        const body = await request.json();

        if (!Array.isArray(body.players)) {
          return jsonResponse(
            {
              ok: false,
              error: "players must be an array"
            },
            { status: 400 }
          );
        }

        if (body.players.length === 0) {
          return jsonResponse({
            ok: true,
            inserted: 0,
            updated: 0,
            total: 0,
            processed: 0,
            duplicatesRemoved: 0,
            errors: []
          });
        }

        if (body.players.length > PROFILE_BATCH_MAX) {
          return jsonResponse(
            {
              ok: false,
              error:
                `Maximum ${PROFILE_BATCH_MAX} players per batch`
            },
            { status: 400 }
          );
        }

        const normalized = [];
        const errors = [];

        for (const rawPlayer of body.players) {
          const player = normalizeProfile(rawPlayer);

          if (!player) {
            errors.push({
              player_id:
                rawPlayer?.player_id ?? null,
              error: "Invalid player_id"
            });

            continue;
          }

          normalized.push(player);
        }

        const players = dedupeProfiles(normalized);

        const duplicatesRemoved =
          normalized.length - players.length;

        if (players.length === 0) {
          return jsonResponse(
            {
              ok: false,
              inserted: 0,
              updated: 0,
              total: body.players.length,
              processed: 0,
              duplicatesRemoved,
              errors
            },
            { status: 400 }
          );
        }

        const values = [];
        const placeholders = [];

        for (let i = 0; i < players.length; i++) {
          const player = players[i];

          const base = i * 8;

          placeholders.push(
            `(
              $${base + 1},
              $${base + 2},
              $${base + 3},
              $${base + 4},
              $${base + 5},
              $${base + 6},
              $${base + 7},
              $${base + 8}
            )`
          );

          values.push(
            player.player_id,
            player.name,
            player.slug,
            player.position,
            player.nationality,
            player.date_of_birth,
            player.height_cm,
            player.preferred_foot
          );
        }

        const result = await client.query(
          `
          INSERT INTO players (
            player_id,
            name,
            slug,
            position,
            nationality,
            date_of_birth,
            height_cm,
            preferred_foot
          )
          VALUES
            ${placeholders.join(",")}

          ON CONFLICT (player_id)
          DO UPDATE SET

            name =
              COALESCE(
                EXCLUDED.name,
                players.name
              ),

            slug =
              COALESCE(
                EXCLUDED.slug,
                players.slug
              ),

            position =
              COALESCE(
                EXCLUDED.position,
                players.position
              ),

            nationality =
              COALESCE(
                EXCLUDED.nationality,
                players.nationality
              ),

            date_of_birth =
              COALESCE(
                EXCLUDED.date_of_birth,
                players.date_of_birth
              ),

            height_cm =
              COALESCE(
                EXCLUDED.height_cm,
                players.height_cm
              ),

            preferred_foot =
              COALESCE(
                EXCLUDED.preferred_foot,
                players.preferred_foot
              ),

            updated_at = NOW()

          RETURNING
            player_id,
            (xmax = 0) AS was_inserted
          `,
          values
        );

        let inserted = 0;
        let updated = 0;

        for (const row of result.rows) {
          if (row.was_inserted) {
            inserted++;
          } else {
            updated++;
          }
        }

        return jsonResponse({
          ok: errors.length === 0,
          inserted,
          updated,
          total: body.players.length,
          processed: players.length,
          duplicatesRemoved,
          errors
        });
      }

      // =========================================================
      // POST /sync/player
      // =========================================================

      if (
        request.method === "POST" &&
        url.pathname === "/sync/player"
      ) {
        const body = await request.json();

        const playerId = normalizePlayerId(
          body.player_id
        );

        if (!playerId) {
          return jsonResponse(
            {
              ok: false,
              error: "player_id is required"
            },
            { status: 400 }
          );
        }

        const playerResult = await client.query(
          `
          SELECT *
          FROM players
          WHERE player_id = $1
          LIMIT 1
          `,
          [playerId]
        );

        if (playerResult.rows.length === 0) {
          return jsonResponse(
            {
              ok: false,
              error: "Player not found",
              player_id: playerId
            },
            { status: 404 }
          );
        }

        return jsonResponse({
          ok: true,
          player: playerResult.rows[0],
          season_stats: [],
          match_stats: [],
          injuries: [],
          transfers: []
        });
      }

      // =========================================================
      // 404
      // =========================================================

      return jsonResponse(
        {
          ok: false,
          error: "Not found"
        },
        { status: 404 }
      );

    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : String(error)
        },
        { status: 500 }
      );

    } finally {
      await client.end().catch(() => {});
    }
  }
};
