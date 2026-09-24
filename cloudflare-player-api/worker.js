import { neon } from "@neondatabase/serverless";

export default {
  async fetch(request, env) {
    try {
      const sql = neon(env.NEON_DATABASE_URL);

      const result = await sql`
        SELECT player_id, name
        FROM players
        LIMIT 1
      `;

      return Response.json({
        ok: true,
        data: result
      });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error.message
        },
        { status: 500 }
      );
    }
  }
};
