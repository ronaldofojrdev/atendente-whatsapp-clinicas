import { getLeadsDueForReminder, markReminderSent, type LeadReminderCandidate } from "../domain/leads";
import { sendWhatsappMessage } from "../whatsapp/client";

// Roda uma unica passada e sai: pensado pra ser chamado de hora em hora pelo agendador
// do sistema operacional (cron, Task Scheduler), nao pra ficar em loop.

export function buildReminderMessage(candidate: LeadReminderCandidate): string {
  const appointment = new Date(candidate.appointmentAt.replace(" ", "T") + "Z");
  const data = appointment.toLocaleDateString("pt-BR", { timeZone: candidate.timezone });
  const hora = appointment.toLocaleTimeString("pt-BR", {
    timeZone: candidate.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    `Oi${candidate.contactName ? `, ${candidate.contactName}` : ""}! Passando para confirmar sua consulta ` +
    `na ${candidate.clinicNome} amanhã, dia ${data}, às ${hora}. Se precisar remarcar, é só responder por aqui.`
  );
}

async function main() {
  const candidates = getLeadsDueForReminder();
  console.log(`[send-reminders] ${candidates.length} lembrete(s) elegivel(is) nesta passada.`);

  let enviados = 0;
  let falhas = 0;

  for (const candidate of candidates) {
    const message = buildReminderMessage(candidate);
    try {
      await sendWhatsappMessage(candidate.phoneNumberId, candidate.accessToken, candidate.contactPhone, message);
      markReminderSent(candidate.leadId);
      enviados++;
      console.log(
        `[OK] lead ${candidate.leadId} (${candidate.clinicNome}, paciente ${candidate.contactPhone}): lembrete enviado para ${candidate.appointmentAt}.`,
      );
    } catch (err) {
      falhas++;
      console.error(
        `[FALHA] lead ${candidate.leadId} (${candidate.clinicNome}, paciente ${candidate.contactPhone}): ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  console.log(`[send-reminders] concluido: ${enviados} enviado(s), ${falhas} falha(s).`);
}

main().catch((err) => {
  console.error("Erro ao rodar send-reminders:", err);
  process.exit(1);
});
