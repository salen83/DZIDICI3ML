import { Client } from "pg";

export default {
  async fetch(request, env) {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString
    });

    try {
      await client.connect();

      const result = await client.query(`
        SELECT player_id, name
        FROM players
        LIMIT 1
      `);

      return Response.json({
        ok: true,
        data: result.rows
      });
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
