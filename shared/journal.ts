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
  // Get the latest 7 days of logs
  const rows = await db.getAllAsync<{ date: string; pain_level: number }>(
    `SELECT date, MAX(pain_level) as pain_level FROM pain_journal GROUP BY date ORDER BY date DESC LIMIT 7`
  );
  return rows;
}

// NEW: Check for 3 consecutive days of high pain
export async function checkHighPainStreak(): Promise<boolean> {
  const history = await getPainHistory();
  if (history.length < 3) return false;

  // Since history is ordered by date DESC, we check the first 3 entries
  const latest3 = history.slice(0, 3);
  
  // Check if all 3 are >= 7
  const allHighPain = latest3.every(log => log.pain_level >= 7);
  
  if (!allHighPain) return false;

  // Verify the dates are actually consecutive (e.g., today, yesterday, day before)
  const d1 = new Date(latest3[0].date).getTime();
  const d2 = new Date(latest3[1].date).getTime();
  const d3 = new Date(latest3[2].date).getTime();

  const oneDay = 24 * 60 * 60 * 1000;
  
  return (d1 - d2 === oneDay) && (d2 - d3 === oneDay);
}