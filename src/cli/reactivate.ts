import {
  getConversationsDueForReactivation,
  markReactivated,
  type ReactivationCandidate,
} from "../domain/conversations";
import { sendWhatsappMessage } from "../whatsapp/client";

// Roda uma unica passada e sai: pensado pra ser chamado 1x por dia pelo agendador do
// sistema operacional, nao pra ficar em loop.

export function buildReactivationMessage(candidate: ReactivationCandidate): string {
  const interesse = candidate.procedimento ? `em ${candidate.procedimento}` : "em algum procedimento com a gente";
  return (
    `Oi${candidate.contactName ? `, ${candidate.contactName}` : ""}! Faz um tempo que você não aparece por aqui. ` +
    `Ainda tem interesse ${interesse}? Responde aqui que a gente vê um horário pra você.`
  );
}

async function main() {
  const candidates = getConversationsDueForReactivation();
  console.log(`[reactivate] ${candidates.length} paciente(s) elegivel(is) para reativacao.`);

  let enviados = 0;
  let falhas = 0;

  for (const candidate of candidates) {
    const message = buildReactivationMessage(candidate);
    try {
      await sendWhatsappMessage(candidate.phoneNumberId, candidate.accessToken, candidate.contactPhone, message);
      markReactivated(candidate.conversationId);
      enviados++;
      console.log(
        `[OK] conversa ${candidate.conversationId} (${candidate.clinicNome}, paciente ${candidate.contactPhone}): inativo desde ${candidate.lastMessageAt}, reativacao enviada.`,
      );
    } catch (err) {
      falhas++;
      console.error(
        `[FALHA] conversa ${candidate.conversationId} (${candidate.clinicNome}, paciente ${candidate.contactPhone}): ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  console.log(`[reactivate] concluido: ${enviados} enviado(s), ${falhas} falha(s).`);
}

main().catch((err) => {
  console.error("Erro ao rodar reactivate:", err);
  process.exit(1);
});
