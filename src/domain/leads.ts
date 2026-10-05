import { db } from "../db";
import type { Lead } from "../types";

export function leadExistsForConversation(conversationId: number): boolean {
  const row = db
    .prepare<[number], { id: number }>("SELECT id FROM leads WHERE conversation_id = ? LIMIT 1")
    .get(conversationId);
  return !!row;
}

export interface NewLeadInput {
  clinicId: number;
  conversationId: number;
  nome: string | null;
  procedimento: string | null;
  jaPaciente: boolean | null;
  preferenciaHorario: string | null;
}

export function createLead(input: NewLeadInput): Lead {
  const result = db
    .prepare(
      `INSERT INTO leads (clinic_id, conversation_id, nome, procedimento, ja_paciente, preferencia_horario, status)
       VALUES (?, ?, ?, ?, ?, ?, 'novo')`,
    )
    .run(
      input.clinicId,
      input.conversationId,
      input.nome,
      input.procedimento,
      input.jaPaciente === null ? null : input.jaPaciente ? 1 : 0,
      input.preferenciaHorario,
    );
  return db
    .prepare<[number], Lead>("SELECT * FROM leads WHERE id = ?")
    .get(Number(result.lastInsertRowid))!;
}

export function getLeadsForConversation(conversationId: number): Lead[] {
  return db
    .prepare<[number], Lead>("SELECT * FROM leads WHERE conversation_id = ? ORDER BY id")
    .all(conversationId);
}

export function setLeadAppointment(leadId: number, appointmentAt: string): Lead {
  db.prepare("UPDATE leads SET appointment_at = datetime(?), reminder_sent = 0 WHERE id = ?").run(
    appointmentAt,
    leadId,
  );
  return db.prepare<[number], Lead>("SELECT * FROM leads WHERE id = ?").get(leadId)!;
}

export function markReminderSent(leadId: number) {
  db.prepare("UPDATE leads SET reminder_sent = 1 WHERE id = ?").run(leadId);
}

export interface LeadReminderCandidate {
  leadId: number;
  clinicId: number;
  clinicNome: string;
  phoneNumberId: string;
  accessToken: string;
  timezone: string;
  contactPhone: string;
  contactName: string | null;
  appointmentAt: string;
}

// Janela de 23h a 25h no futuro: o script roda a cada hora e essa margem garante
// que toda consulta marcada para "amanha" recebe exatamente um lembrete.
export function getLeadsDueForReminder(): LeadReminderCandidate[] {
  return db
    .prepare(
      `SELECT
         leads.id AS leadId,
         leads.clinic_id AS clinicId,
         clinics.nome AS clinicNome,
         clinics.phone_number_id AS phoneNumberId,
         clinics.access_token AS accessToken,
         clinics.timezone AS timezone,
         conversations.contact_phone AS contactPhone,
         conversations.contact_name AS contactName,
         leads.appointment_at AS appointmentAt
       FROM leads
       JOIN conversations ON conversations.id = leads.conversation_id
       JOIN clinics ON clinics.id = leads.clinic_id
       WHERE leads.reminder_sent = 0
         AND leads.appointment_at IS NOT NULL
         AND clinics.active = 1
         AND datetime(leads.appointment_at) BETWEEN datetime('now', '+23 hours') AND datetime('now', '+25 hours')`,
    )
    .all() as LeadReminderCandidate[];
}
