import { Client } from "pg";

export default {
  async fetch(request, env) {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString
    });

    try {
      await client.connect();

      const url = new URL(request.url);

      // GET /
      // Provera veze i prikaz prvih igrača
      if (request.method === "GET" && url.pathname === "/") {
        const result = await client.query(`
          SELECT player_id, name
          FROM players
          ORDER BY name
          LIMIT 10
        `);

        return Response.json({
          ok: true,
          data: result.rows
        });
      }

      // POST /players
      // Upis / izmena osnovnih podataka igrača
      if (request.method === "POST" && url.pathname === "/players") {
        const body = await request.json();

        if (!body.player_id || !body.name) {
          return Response.json(
            {
              ok: false,
              error: "player_id and name are required"
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

          ON CONFLICT (player_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            position = EXCLUDED.position,
            nationality = EXCLUDED.nationality,
            date_of_birth = EXCLUDED.date_of_birth,
            height_cm = EXCLUDED.height_cm,
            preferred_foot = EXCLUDED.preferred_foot,
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
            body.player_id,
            body.name,
            body.slug ?? null,
            body.position ?? null,
            body.nationality ?? null,
            body.date_of_birth ?? null,
            body.height_cm ?? null,
            body.preferred_foot ?? null
          ]
        );

        return Response.json({
          ok: true,
          player: result.rows[0]
        });
      }

      // POST /sync/player
      // Glavni endpoint za sinhronizaciju jednog igrača
      if (request.method === "POST" && url.pathname === "/sync/player") {
        const body = await request.json();

        if (!body.player_id) {
          return Response.json(
            {
              ok: false,
              error: "player_id is required"
            },
            { status: 400 }
          );
        }

        const playerId = String(body.player_id);

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
          return Response.json(
            {
              ok: false,
              error: "Player not found",
              player_id: playerId
            },
            { status: 404 }
          );
        }

        return Response.json({
          ok: true,
          player: playerResult.rows[0],
          season_stats: [],
          match_stats: [],
          injuries: [],
          transfers: []
        });
      }

      return Response.json(
        {
          ok: false,
          error: "Not found"
        },
        { status: 404 }
      );

    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error
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
