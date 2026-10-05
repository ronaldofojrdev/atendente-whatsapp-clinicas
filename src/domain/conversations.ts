import { db } from "../db";
import type { Conversation, ConversationStatus } from "../types";

export function findOpenConversation(clinicId: number, contactPhone: string): Conversation | null {
  const row = db
    .prepare<[number, string], Conversation>(
      `SELECT * FROM conversations
       WHERE clinic_id = ? AND contact_phone = ? AND status IN ('active','escalated')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(clinicId, contactPhone);
  return row || null;
}

export function createConversation(
  clinicId: number,
  contactPhone: string,
  contactName: string | null,
): Conversation {
  const result = db
    .prepare(
      `INSERT INTO conversations (clinic_id, contact_phone, contact_name, status)
       VALUES (?, ?, ?, 'active')`,
    )
    .run(clinicId, contactPhone, contactName);
  return db
    .prepare<[number], Conversation>("SELECT * FROM conversations WHERE id = ?")
    .get(Number(result.lastInsertRowid))!;
}

export function findOrCreateConversation(
  clinicId: number,
  contactPhone: string,
  contactName: string | null,
): Conversation {
  const existing = findOpenConversation(clinicId, contactPhone);
  if (existing) {
    if (contactName && !existing.contact_name) {
      db.prepare("UPDATE conversations SET contact_name = ? WHERE id = ?").run(contactName, existing.id);
      existing.contact_name = contactName;
    }
    return existing;
  }
  return createConversation(clinicId, contactPhone, contactName);
}

export function touchConversation(id: number) {
  db.prepare("UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?").run(id);
}

export function setConversationStatus(id: number, status: ConversationStatus) {
  db.prepare("UPDATE conversations SET status = ? WHERE id = ?").run(status, id);
}

export function setNoUnderstandCount(id: number, count: number) {
  db.prepare("UPDATE conversations SET consecutive_no_understand = ? WHERE id = ?").run(count, id);
}

export function getConversation(id: number): Conversation {
  return db.prepare<[number], Conversation>("SELECT * FROM conversations WHERE id = ?").get(id)!;
}

export function markReactivated(conversationId: number) {
  db.prepare("UPDATE conversations SET reactivated_at = datetime('now') WHERE id = ?").run(conversationId);
}

export interface ReactivationCandidate {
  conversationId: number;
  clinicId: number;
  clinicNome: string;
  phoneNumberId: string;
  accessToken: string;
  contactPhone: string;
  contactName: string | null;
  lastMessageAt: string;
  procedimento: string | null;
}

// So considera a conversa mais recente de cada paciente na clinica (subquery), parada ha
// mais de 60 dias e ainda nao reativada. Exclui quem esta 'escalated' (aguardando humano
// agora). Nao filtra por status = 'closed' porque, com 60 dias de silencio, o status
// 'active' so significa que ninguem fechou a conversa manualmente, nao que o paciente
// esteja conversando agora.
export function getConversationsDueForReactivation(): ReactivationCandidate[] {
  return db
    .prepare(
      `SELECT
         c.id AS conversationId,
         c.clinic_id AS clinicId,
         clinics.nome AS clinicNome,
         clinics.phone_number_id AS phoneNumberId,
         clinics.access_token AS accessToken,
         c.contact_phone AS contactPhone,
         c.contact_name AS contactName,
         c.last_message_at AS lastMessageAt,
         leads.procedimento AS procedimento
       FROM conversations c
       JOIN clinics ON clinics.id = c.clinic_id
       LEFT JOIN leads ON leads.conversation_id = c.id
       WHERE clinics.active = 1
         AND c.reactivated_at IS NULL
         AND c.status != 'escalated'
         AND c.last_message_at < datetime('now', '-60 days')
         AND c.id = (
           SELECT c2.id FROM conversations c2
           WHERE c2.clinic_id = c.clinic_id AND c2.contact_phone = c.contact_phone
           ORDER BY c2.last_message_at DESC, c2.id DESC
           LIMIT 1
         )`,
    )
    .all() as ReactivationCandidate[];
}
