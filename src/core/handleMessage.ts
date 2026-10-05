import { decideResponse } from "../ai/client";
import { checkEscalationKeywords } from "../ai/escalation";
import {
  findOrCreateConversation,
  setConversationStatus,
  setNoUnderstandCount,
  touchConversation,
} from "../domain/conversations";
import { addMessage, getHistory } from "../domain/messages";
import { createLead, leadExistsForConversation } from "../domain/leads";
import { recordEscalation } from "../domain/escalations";
import type { ClinicWithConfig, HandleMessageResult } from "../types";

const TRANSFER_MESSAGE = "Vou chamar alguém da equipe pra te responder certinho, só um instante.";
const MAX_CONSECUTIVE_NO_UNDERSTAND = 2;

export async function handleIncomingMessage(
  clinic: ClinicWithConfig,
  contactPhone: string,
  contactName: string | null,
  text: string,
): Promise<HandleMessageResult> {
  const conversation = findOrCreateConversation(clinic.id, contactPhone, contactName);
  addMessage(conversation.id, "inbound", text);
  touchConversation(conversation.id);

  if (conversation.status === "escalated") {
    // Conversa ja esta com humano: so registra a mensagem, nao responde automaticamente.
    return {
      reply: null,
      escalated: true,
      escalationReason: null,
      leadCaptured: false,
      conversationId: conversation.id,
    };
  }

  const keywordHit = checkEscalationKeywords(text);
  if (keywordHit.hit) {
    addMessage(conversation.id, "outbound", TRANSFER_MESSAGE);
    setConversationStatus(conversation.id, "escalated");
    recordEscalation(clinic.id, conversation.id, keywordHit.motivo!);
    return {
      reply: TRANSFER_MESSAGE,
      escalated: true,
      escalationReason: keywordHit.motivo,
      leadCaptured: false,
      conversationId: conversation.id,
    };
  }

  const history = getHistory(conversation.id);
  const decision = await decideResponse(clinic.nome, clinic.config, history);

  const noUnderstandCount = decision.entendeu ? 0 : conversation.consecutive_no_understand + 1;
  setNoUnderstandCount(conversation.id, noUnderstandCount);
  const understandingEscalation = noUnderstandCount >= MAX_CONSECUTIVE_NO_UNDERSTAND;

  if (decision.escalar || understandingEscalation) {
    const motivo = decision.escalar
      ? decision.motivo_escalar || "sinalizado pela IA"
      : "nao entendeu a mensagem duas vezes seguidas";
    addMessage(conversation.id, "outbound", TRANSFER_MESSAGE);
    setConversationStatus(conversation.id, "escalated");
    recordEscalation(clinic.id, conversation.id, motivo);
    return {
      reply: TRANSFER_MESSAGE,
      escalated: true,
      escalationReason: motivo,
      leadCaptured: false,
      conversationId: conversation.id,
    };
  }

  addMessage(conversation.id, "outbound", decision.resposta);

  let leadCaptured = false;
  if (decision.dados_completos && !leadExistsForConversation(conversation.id)) {
    createLead({
      clinicId: clinic.id,
      conversationId: conversation.id,
      nome: contactName,
      procedimento: decision.procedimento,
      jaPaciente: decision.ja_paciente,
      preferenciaHorario: decision.preferencia_horario,
    });
    leadCaptured = true;
  }

  return {
    reply: decision.resposta,
    escalated: false,
    escalationReason: null,
    leadCaptured,
    conversationId: conversation.id,
  };
}
