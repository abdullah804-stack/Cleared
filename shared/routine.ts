// shared/routine.ts
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise === null) dbPromise = SQLite.openDatabaseAsync("cleared.db");
  return dbPromise;
}

export async function initRoutineDb() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routine_logs (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL
    );
  `);
}

// type can be 'morning' or 'night'
export async function logRoutine(type: "morning" | "night") {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  // Prevent double logging for the same type on the same day
  const existing = await db.getFirstAsync(
    `SELECT id FROM routine_logs WHERE date = ? AND type = ?`, today, type
  );
  
  if (!existing) {
    await db.runAsync(
      `INSERT INTO routine_logs (id, date, type) VALUES (?, ?, ?)`,
      `log-${Date.now()}`,
      today,
      type
    );
  }
}

export async function getTodayStatus() {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];
  const rows = await db.getAllAsync<{ type: string }>(
    `SELECT type FROM routine_logs WHERE date = ?`, today
  );
  return {
    morning: rows.some(r => r.type === "morning"),
    night: rows.some(r => r.type === "night"),
  };
}

export async function getStreakCount() {
  const db = await getDb();
  // Get unique dates ordered by newest first
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM routine_logs ORDER BY date DESC`
  );
  
  if (rows.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

  // Check if there is a log for today or yesterday to start the streak
  const latestLogDate = new Date(rows[0].date);
  const diffTime = Math.abs(currentDate.getTime() - latestLogDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If the last log was more than 1 day ago, streak is broken
  if (diffDays > 1) return 0;

  let expectedDate = latestLogDate;

  for (const row of rows) {
    const rowDate = new Date(row.date);
    if (rowDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1); // Move back one day
    } else {
      break; // Gap found, stop counting
    }
  }

  return streak;
}