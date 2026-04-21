import { Capacitor } from "@capacitor/core";
import { SQLiteConnection, CapacitorSQLite } from "@capacitor-community/sqlite";

let db;

export async function initDB() {
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  db = await sqlite.createConnection(
    "sofa_db",
    false,
    "no-encryption",
    1,
    false
  );

  await db.open();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      datum TEXT,
      vreme TEXT,
      liga TEXT,
      home TEXT,
      away TEXT,
      ht TEXT,
      sh TEXT,
      ft TEXT,
      extraTime TEXT,
      penalties TEXT,
      country TEXT
    );
  `);

  console.log("✅ SQLite ready");
}

export async function getAllRows() {
  const res = await db.query("SELECT * FROM matches");
  return res.values || [];
}

export async function saveAllRows(rows) {
  await db.execute("DELETE FROM matches");

  for (const r of rows) {
    await db.run(
      `INSERT INTO matches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.datum,
        r.vreme,
        r.liga,
        r.home,
        r.away,
        r.ht,
        r.sh,
        r.ft,
        r.extraTime,
        r.penalties,
        r.country,
      ]
    );
  }

  console.log("💾 SQLite saved:", rows.length);
}
