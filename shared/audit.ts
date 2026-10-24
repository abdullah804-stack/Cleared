// shared/audit.ts
import * as SQLite from "expo-sqlite";
import type { AuditEntry, AuditEventType } from "./types";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise === null) {
    dbPromise = SQLite.openDatabaseAsync("cleared.db");
  }
  return dbPromise;
}

export async function initAuditDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY NOT NULL,
      timestamp INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      detail TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
  `);
}

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function writeAudit(
  userId: string,
  type: AuditEventType,
  description: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  const entry: AuditEntry = {
    id: generateId(),
    timestamp: Date.now(),
    userId,
    type,
    description,
    detail,
  };
  await db.runAsync(
    `INSERT INTO audit_log (id, timestamp, user_id, type, description, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.timestamp,
    entry.userId,
    entry.type,
    entry.description,
    entry.detail ? JSON.stringify(entry.detail) : null,
  );
}

interface AuditRow {
  id: string;
  timestamp: number;
  user_id: string;
  type: string;
  description: string;
  detail: string | null;
}

export async function readAuditLog(userId: string): Promise<AuditEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AuditRow>(
    `SELECT id, timestamp, user_id, type, description, detail
     FROM audit_log
     WHERE user_id = ?
     ORDER BY timestamp DESC`,
    userId,
  );
  return rows.map((row: AuditRow): AuditEntry => ({
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    type: row.type as AuditEventType,
    description: row.description,
    detail: row.detail ? JSON.parse(row.detail) : undefined,
  }));
}

export async function clearAuditLog(userId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM audit_log WHERE user_id = ?`, userId);
}