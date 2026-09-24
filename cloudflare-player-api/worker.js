import { Client } from "pg";

export default {
  async fetch(request, env) {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString
    });

    try {
      await client.connect();

      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        const result = await client.query(`
          SELECT player_id, name
          FROM players
          LIMIT 10
        `);

        return Response.json({
          ok: true,
          data: result.rows
        });
      }

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
          INSERT INTO players (player_id, name)
          VALUES ($1, $2)
          ON CONFLICT (player_id)
          DO UPDATE SET name = EXCLUDED.name
          RETURNING player_id, name
          `,
          [body.player_id, body.name]
        );

        return Response.json({
          ok: true,
          player: result.rows[0]
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
          error: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    } finally {
      await client.end().catch(() => {});
    }
  }
};
