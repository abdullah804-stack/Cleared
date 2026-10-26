// shared/journal.ts
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise === null) dbPromise = SQLite.openDatabaseAsync("cleared.db");
  return dbPromise;
}

export async function initJournalDb() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pain_journal (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      pain_level INTEGER NOT NULL
    );
  `);
}

export async function logPain(level: number) {
  const db = await getDb();
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  await db.runAsync(
    `INSERT INTO pain_journal (id, date, pain_level) VALUES (?, ?, ?)`,
    `log-${Date.now()}`,
    date,
    level
  );
}

export async function getPainHistory() {
  const db = await getDb();
  return await db.getAllAsync<{ date: string; pain_level: number }>(
    `SELECT date, AVG(pain_level) as pain_level FROM pain_journal GROUP BY date ORDER BY date DESC LIMIT 7`
  );
}