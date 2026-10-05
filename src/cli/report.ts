import fs from "node:fs";
import path from "node:path";
import { findClinicByIdOrName } from "../domain/clinics";
import { getMonthlyReportData, type MonthlyReportData } from "../domain/reports";

function parseArgs(argv: string[]): { clinicRef: string | undefined; month: string | null } {
  const positional: string[] = [];
  let month: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith("--month=")) month = arg.slice("--month=".length);
    else positional.push(arg);
  }
  return { clinicRef: positional[0], month };
}

function monthRange(monthStr: string | null): { start: string; endExclusive: string; label: string } {
  const now = new Date();
  const [year, month] = monthStr ? monthStr.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const start = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01 00:00:00`;
  const label = `${String(month).padStart(2, "0")}/${year}`;
  return { start, endExclusive, label };
}

function formatReport(clinicNome: string, label: string, data: MonthlyReportData): string {
  const taxaResposta =
    data.totalConversas > 0
      ? Math.round(((data.totalConversas - data.conversasEscaladas) / data.totalConversas) * 100)
      : 0;

  const linhasMotivos = data.escalacoesPorMotivo.length
    ? data.escalacoesPorMotivo.map((m) => `  - ${m.motivo}: ${m.total}`).join("\n")
    : "  Nenhuma transferência para a equipe neste período.";

  const linhasProcedimentos = data.procedimentosMaisPedidos.length
    ? data.procedimentosMaisPedidos.map((p, i) => `  ${i + 1}. ${p.procedimento} (${p.total} pedido(s))`).join("\n")
    : "  Nenhum procedimento identificado neste período.";

  return `Relatório mensal, ${clinicNome}
Período: ${label}

Resumo do atendimento automático

Conversas atendidas: ${data.totalConversas}
Leads capturados (pacientes prontos para agendar): ${data.totalLeads}
Conversas transferidas para a equipe: ${data.conversasEscaladas}
Taxa de resolução automática (o bot resolveu sozinho, sem chamar a equipe): ${taxaResposta}%

Motivos das transferências para a equipe
${linhasMotivos}

Procedimentos mais pedidos no período
${linhasProcedimentos}

Este relatório mostra o quanto o atendente automático está ajudando a clínica a responder
pacientes rápido e sem perder contato, inclusive fora do horário de expediente.
`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const { clinicRef, month } = parseArgs(process.argv.slice(2));
  if (!clinicRef) {
    console.error("Uso: npm run report -- <clinic-id-ou-nome> [--month=2026-09]");
    process.exit(1);
    return;
  }

  const clinic = findClinicByIdOrName(clinicRef);
  if (!clinic) {
    console.error(`Clínica não encontrada para "${clinicRef}".`);
    process.exit(1);
    return;
  }

  const { start, endExclusive, label } = monthRange(month);
  const data = getMonthlyReportData(clinic.id, start, endExclusive);
  const text = formatReport(clinic.nome, label, data);

  console.log(text);

  const dir = path.resolve(process.cwd(), "data/relatorios");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${slugify(clinic.nome)}-${label.replace("/", "-")}.txt`);
  fs.writeFileSync(filePath, text, "utf8");
  console.log(`Relatório salvo em ${filePath}`);
}

main().catch((err) => {
  console.error("Erro ao gerar relatorio:", err);
  process.exit(1);
});
