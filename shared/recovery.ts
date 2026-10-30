// shared/recovery.ts
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise === null) dbPromise = SQLite.openDatabaseAsync("cleared.db");
  return dbPromise;
}

export async function initRecoveryDb() {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recovery_progress (
      day INTEGER PRIMARY KEY NOT NULL,
      completed INTEGER DEFAULT 0
    );
  `);
}

export async function toggleRecoveryDay(day: number, completed: boolean) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recovery_progress (day, completed) VALUES (?, ?) 
     ON CONFLICT(day) DO UPDATE SET completed = ?`,
    day, completed ? 1 : 0, completed ? 1 : 0
  );
}

export async function getRecoveryProgress(): Promise<Record<number, boolean>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: number; completed: number }>(
    `SELECT day, completed FROM recovery_progress`
  );
  
  const progress: Record<number, boolean> = {};
  rows.forEach(row => {
    progress[row.day] = row.completed === 1;
  });
  return progress;
}