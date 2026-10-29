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

/** Today's date in the PHONE'S timezone as YYYY-MM-DD.
 *  (toISOString() is UTC, which put entries logged after midnight in UTC+5 on the wrong day.) */
function localDateString(d = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export async function logPain(level: number) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO pain_journal (id, date, pain_level) VALUES (?, ?, ?)`,
    `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    localDateString(),
    level
  );
}

export async function getPainHistory() {
  const db = await getDb();
  // Latest 7 days that have logs (highest level per day)
  const rows = await db.getAllAsync<{ date: string; pain_level: number }>(
    `SELECT date, MAX(pain_level) as pain_level FROM pain_journal GROUP BY date ORDER BY date DESC LIMIT 7`
  );
  return rows;
}

/** Erases every journal entry on this device. */
export async function clearPainJournal() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM pain_journal`);
}