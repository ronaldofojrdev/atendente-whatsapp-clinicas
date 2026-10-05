import { db } from "../db";
import type { Escalation } from "../types";

export function recordEscalation(clinicId: number, conversationId: number, motivo: string): Escalation {
  const result = db
    .prepare("INSERT INTO escalations (clinic_id, conversation_id, motivo) VALUES (?, ?, ?)")
    .run(clinicId, conversationId, motivo);
  return db
    .prepare<[number], Escalation>("SELECT * FROM escalations WHERE id = ?")
    .get(Number(result.lastInsertRowid))!;
}
