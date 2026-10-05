import { getLeadsForConversation, setLeadAppointment } from "../domain/leads";
import { createPrompter } from "./prompt-utils";

// Uso manual, pela recepcao ou pelo dono da clinica, depois que a consulta e marcada de
// verdade por telefone. Ainda nao existe UI de agenda, entao isso roda como script.

const prompter = createPrompter();

async function main() {
  console.log("=== Marcar data confirmada de consulta ===\n");

  const leadIdRaw = (await prompter.ask("ID do lead: ")).trim();
  const leadId = Number(leadIdRaw);
  if (!Number.isInteger(leadId) || leadId <= 0) {
    throw new Error(`ID de lead invalido: "${leadIdRaw}"`);
  }

  const dataHora = (await prompter.ask("Data e hora da consulta (AAAA-MM-DD HH:MM, horario local do Brasil): ")).trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dataHora)) {
    throw new Error('Formato invalido. Use "AAAA-MM-DD HH:MM", por exemplo "2026-09-24 10:00".');
  }

  // sqlite guarda tudo em UTC (datetime('now') tambem e UTC); aqui tratamos o horario
  // informado como horario do Brasil (UTC-3) para converter antes de gravar.
  const [dataParte, horaParte] = dataHora.split(" ");
  const appointmentUtc = `${dataParte} ${horaParte}:00-03:00`;

  const lead = setLeadAppointment(leadId, appointmentUtc);
  console.log(`\nConsulta do lead ${lead.id} marcada para ${lead.appointment_at} (UTC).`);

  const leads = getLeadsForConversation(lead.conversation_id);
  console.log(`Lead pertence a conversa ${lead.conversation_id}, com ${leads.length} lead(s) registrado(s) nela.`);

  prompter.close();
}

main().catch((err) => {
  console.error("Erro ao marcar consulta:", err);
  prompter.close();
  process.exit(1);
});
