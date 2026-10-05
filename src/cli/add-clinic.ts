import { createClinic } from "../domain/clinics";
import { createPrompter } from "./prompt-utils";
import type { ClinicConfig, FaqEntry } from "../types";

const prompter = createPrompter();

async function ask(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await prompter.ask(`${question}${suffix}: `)).trim();
  return answer || defaultValue || "";
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function askFaq(): Promise<FaqEntry[]> {
  console.log("\nPerguntas extras (opcional). Deixe a pergunta em branco para terminar.");
  const faq: FaqEntry[] = [];
  for (;;) {
    const pergunta = await ask(`Pergunta extra ${faq.length + 1}`);
    if (!pergunta) break;
    const resposta = await ask("Resposta");
    faq.push({ pergunta, resposta });
  }
  return faq;
}

async function main() {
  console.log("=== Cadastro de nova clinica ===\n");

  const nome = await ask("Nome da clinica");
  const phoneNumberId = await ask("Phone Number ID (Meta Cloud API)");
  const accessToken = await ask("Access Token (Meta Cloud API)");
  const cidade = await ask("Cidade");
  const endereco = await ask("Endereco completo");
  const bairro = await ask("Bairro");
  const horarioFuncionamento = await ask("Horario de funcionamento", "Segunda a sexta, das 9h as 18h");
  const convenios = splitList(await ask("Convenios aceitos (separados por virgula, vazio se so particular)"));
  const formasPagamento = splitList(await ask("Formas de pagamento (separadas por virgula)", "Cartao, Pix, Dinheiro"));
  const procedimentos = splitList(await ask("Procedimentos oferecidos (separados por virgula)"));
  const escalationTarget = await ask("Numero de WhatsApp para receber avisos de transferencia (com DDI e DDD)");
  const faq = await askFaq();

  const clinicConfig: ClinicConfig = {
    cidade,
    endereco,
    bairro,
    horarioFuncionamento,
    convenios,
    formasPagamento,
    procedimentos,
    faq,
  };

  const clinic = createClinic({
    nome,
    phoneNumberId,
    accessToken,
    escalationTarget,
    config: clinicConfig,
  });

  console.log(`\nClinica "${clinic.nome}" cadastrada com sucesso (id ${clinic.id}).`);
  console.log("Configure o webhook da Meta apontando para /webhook desta instalacao.");
  console.log('Teste o roteiro agora mesmo com "npm run demo" antes de liberar o numero real.');

  prompter.close();
}

main().catch((err) => {
  console.error("Erro ao cadastrar clinica:", err);
  prompter.close();
  process.exit(1);
});
