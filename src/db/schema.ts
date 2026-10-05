export const SCHEMA = `
CREATE TABLE IF NOT EXISTS clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  config_json TEXT NOT NULL,
  escalation_target TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','escalated','closed')),
  consecutive_no_understand INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  reactivated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON conversations(clinic_id, contact_phone, status);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  nome TEXT,
  procedimento TEXT,
  ja_paciente INTEGER,
  preferencia_horario TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contatado','agendado')),
  appointment_at TEXT,
  reminder_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_conversation ON leads(conversation_id);

CREATE TABLE IF NOT EXISTS escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  motivo TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_escalations_clinic_period ON escalations(clinic_id, created_at);
`;
