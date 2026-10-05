import { db } from "../db";
import type { Message, MessageDirection } from "../types";

export function addMessage(conversationId: number, direction: MessageDirection, body: string): Message {
  const result = db
    .prepare("INSERT INTO messages (conversation_id, direction, body) VALUES (?, ?, ?)")
    .run(conversationId, direction, body);
  return db
    .prepare<[number], Message>("SELECT * FROM messages WHERE id = ?")
    .get(Number(result.lastInsertRowid))!;
}

export function getHistory(conversationId: number, limit = 30): Message[] {
  const rows = db
    .prepare<[number, number], Message>(
      `SELECT * FROM (
         SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?
       ) ORDER BY id ASC`,
    )
    .all(conversationId, limit);
  return rows;
}
