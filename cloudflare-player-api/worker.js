import { Client } from "pg";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

const PROFILE_BATCH_MAX = 1000;
const ID_BATCH_MAX = 2000;

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

export default {
  async fetch(request, env) {
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

      const url = new URL(request.url);

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
      //
      // PAGINIRANO
      //
      // /players/ids?limit=1000&offset=0
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
      // POST /players/ids/batch
      //
      // UBACUJE SAMO PLAYER_ID
      //
      // Jedan SQL upit za ceo batch.
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

        if (ids.length === 0) {
          return jsonResponse(
            {
              ok: false,
              error: "No valid player_ids",
              invalid
            },
            { status: 400 }
          );
        }

        /*
         * PostgreSQL jednom upitu ubacuje ceo batch.
         *
         * name ostaje NULL dok ne dobijemo SofaScore profil.
         */

        const values = [];
        const placeholders = [];

        for (let i = 0; i < ids.length; i++) {
          const param = i + 1;

          placeholders.push(
            `($${param}, NULL)`
          );

          values.push(ids[i]);
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
          existing: ids.length - result.rowCount,
          total: ids.length,
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

        /*
         * Za pojedinačni profil:
         *
         * Ako je name NULL, ne menjamo postojeći name.
         */

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
          player: result.rows[0]
        });
      }

      // =========================================================
      // POST /players/batch
      //
      // OPTIMIZOVAN:
      // JEDAN SQL QUERY ZA CEO BATCH
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

        const players = [];
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

          players.push(player);
        }

        if (players.length === 0) {
          return jsonResponse(
            {
              ok: false,
              inserted: 0,
              updated: 0,
              total: body.players.length,
              errors
            },
            { status: 400 }
          );
        }

        /*
         * 8 parametara po igraču.
         *
         * 1000 igrača = 8000 parametara,
         * što je bezbedno ispod PostgreSQL limita.
         */

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
