import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config";
import { SCHEMA } from "./schema";
import { SORRISO_ALCANTARA_SEED } from "./seed";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA);

// CREATE TABLE IF NOT EXISTS nao adiciona colunas novas a um banco ja existente,
// entao migracoes simples de coluna precisam rodar a parte.
function ensureColumn(table: string, column: string, ddl: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

ensureColumn("leads", "appointment_at", "appointment_at TEXT");
ensureColumn("leads", "reminder_sent", "reminder_sent INTEGER NOT NULL DEFAULT 0");
ensureColumn("conversations", "reactivated_at", "reactivated_at TEXT");

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leads_reminder ON leads(appointment_at, reminder_sent);
  CREATE INDEX IF NOT EXISTS idx_conversations_reactivation ON conversations(clinic_id, contact_phone, last_message_at);
`);

function ensureSeedClinic() {
  const existing = db
    .prepare("SELECT id FROM clinics WHERE phone_number_id = ?")
    .get(SORRISO_ALCANTARA_SEED.phone_number_id);
  if (existing) return;

  db.prepare(
    `INSERT INTO clinics (nome, phone_number_id, access_token, timezone, config_json, escalation_target, active)
     VALUES (@nome, @phone_number_id, @access_token, @timezone, @config_json, @escalation_target, 1)`,
  ).run(SORRISO_ALCANTARA_SEED);
}

ensureSeedClinic();
