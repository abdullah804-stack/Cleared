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

/** A date in the PHONE'S timezone as YYYY-MM-DD.
 *  This used to use toISOString() (UTC). In Pakistan (UTC+5) that made "today" roll over at 5 AM
 *  instead of midnight, and could break a streak even though you brushed every day. */
export function localDateString(d = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Date n days before today, as a local YYYY-MM-DD. (Uses noon so daylight-saving shifts can't skip a day.) */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

// type can be 'morning' or 'night'
export async function logRoutine(type: "morning" | "night") {
  const db = await getDb();
  const today = localDateString();

  // Prevent double logging for the same type on the same day
  const existing = await db.getFirstAsync(`SELECT id FROM routine_logs WHERE date = ? AND type = ?`, today, type);

  if (!existing) {
    await db.runAsync(
      `INSERT INTO routine_logs (id, date, type) VALUES (?, ?, ?)`,
      `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      today,
      type
    );
  }
}

export async function getTodayStatus() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ type: string }>(`SELECT type FROM routine_logs WHERE date = ?`, localDateString());
  return {
    morning: rows.some((r) => r.type === "morning"),
    night: rows.some((r) => r.type === "night"),
  };
}

/** Consecutive days (ending today, or yesterday if today isn't done yet) with at least one task logged. */
export async function getStreakCount() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(`SELECT DISTINCT date FROM routine_logs`);
  if (rows.length === 0) return 0;

  const days = new Set(rows.map((r) => r.date));

  // Today not done yet? The streak is still alive if yesterday was.
  let offset = days.has(daysAgo(0)) ? 0 : days.has(daysAgo(1)) ? 1 : -1;
  if (offset === -1) return 0;

  let streak = 0;
  while (days.has(daysAgo(offset))) {
    streak++;
    offset++;
  }
  return streak;
}

/** The last n days (oldest first) with which tasks were done. Used for the week strip and dashboard. */
export async function getRecentDays(n = 7): Promise<{ date: string; morning: boolean; night: boolean; isToday: boolean }[]> {
  const db = await getDb();
  const from = daysAgo(n - 1);
  const rows = await db.getAllAsync<{ date: string; type: string }>(`SELECT date, type FROM routine_logs WHERE date >= ?`, from);

  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = daysAgo(i);
    out.push({
      date,
      morning: rows.some((r) => r.date === date && r.type === "morning"),
      night: rows.some((r) => r.date === date && r.type === "night"),
      isToday: i === 0,
    });
  }
  return out;
}

/** Erases the whole routine history on this device ("Delete My Data"). */
export async function clearRoutine() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM routine_logs`);
}