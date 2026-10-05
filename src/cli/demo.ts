import { listActiveClinics } from "../domain/clinics";
import { handleIncomingMessage } from "../core/handleMessage";
import { getLeadsForConversation } from "../domain/leads";
import { createPrompter } from "./prompt-utils";

const DEMO_CONTACT_PHONE = "5511999990000";

const prompter = createPrompter();

async function chooseClinic() {
  const clinics = listActiveClinics();
  if (clinics.length === 0) {
    throw new Error('Nenhuma clinica cadastrada. Rode "npm run add-clinic" primeiro.');
  }
  if (clinics.length === 1) return clinics[0];

  console.log("Clinicas disponiveis:");
  clinics.forEach((c, i) => console.log(`  ${i + 1}. ${c.nome}`));
  const choice = await prompter.ask(`Escolha uma clinica [1-${clinics.length}] (padrao 1): `);
  const index = Number(choice.trim()) - 1;
  return clinics[Number.isInteger(index) && index >= 0 && index < clinics.length ? index : 0];
}

async function main() {
  const clinic = await chooseClinic();
  const contactName = (await prompter.ask("Seu nome (paciente de teste) [Paciente Demo]: ")).trim() || "Paciente Demo";

  console.log(`\n=== Modo demo: ${clinic.nome} ===`);
  console.log('Digite como se fosse o paciente. Digite "sair" para encerrar.\n');

  let lastConversationId: number | null = null;

  for (;;) {
    const input = await prompter.ask("Você: ");
    const text = input.trim();
    if (!text) continue;
    if (text.toLowerCase() === "sair") break;

    const result = await handleIncomingMessage(clinic, DEMO_CONTACT_PHONE, contactName, text);
    lastConversationId = result.conversationId;

    if (result.reply) {
      console.log(`Bot: ${result.reply}`);
    } else {
      console.log("Bot: [conversa em atendimento humano, sem resposta automatica]");
    }

    if (result.escalated && result.escalationReason) {
      console.log(`  [ESCALADO] motivo: ${result.escalationReason}. Avisando ${clinic.escalation_target}.`);
    }

    if (result.leadCaptured) {
      const leads = getLeadsForConversation(result.conversationId);
      const lead = leads[leads.length - 1];
      console.log(
        `  [LEAD REGISTRADO] procedimento: ${lead.procedimento}, ja e paciente: ${lead.ja_paciente ? "sim" : "nao"}, preferencia: ${lead.preferencia_horario}`,
      );
    }
  }

  if (lastConversationId) {
    const leads = getLeadsForConversation(lastConversationId);
    console.log(`\n${leads.length} lead(s) registrado(s) nesta conversa.`);
  }

  prompter.close();
}

main().catch((err) => {
  console.error("Erro no modo demo:", err);
  prompter.close();
  process.exit(1);
});
