import { db } from "../db";

export interface MotivoCount {
  motivo: string;
  total: number;
}

export interface ProcedimentoCount {
  procedimento: string;
  total: number;
}

export interface MonthlyReportData {
  totalConversas: number;
  totalLeads: number;
  totalEscalacoes: number;
  conversasEscaladas: number;
  escalacoesPorMotivo: MotivoCount[];
  procedimentosMaisPedidos: ProcedimentoCount[];
}

function countQuery(sql: string, clinicId: number, start: string, endExclusive: string): number {
  const row = db.prepare(sql).get(clinicId, start, endExclusive) as { n: number };
  return row.n;
}

export function getMonthlyReportData(clinicId: number, start: string, endExclusive: string): MonthlyReportData {
  const totalConversas = countQuery(
    "SELECT COUNT(*) AS n FROM conversations WHERE clinic_id = ? AND created_at >= ? AND created_at < ?",
    clinicId,
    start,
    endExclusive,
  );

  const totalLeads = countQuery(
    "SELECT COUNT(*) AS n FROM leads WHERE clinic_id = ? AND created_at >= ? AND created_at < ?",
    clinicId,
    start,
    endExclusive,
  );

  const totalEscalacoes = countQuery(
    "SELECT COUNT(*) AS n FROM escalations WHERE clinic_id = ? AND created_at >= ? AND created_at < ?",
    clinicId,
    start,
    endExclusive,
  );

  const conversasEscaladas = countQuery(
    `SELECT COUNT(DISTINCT conversation_id) AS n FROM escalations
     WHERE clinic_id = ? AND created_at >= ? AND created_at < ?`,
    clinicId,
    start,
    endExclusive,
  );

  const escalacoesPorMotivo = db
    .prepare(
      `SELECT motivo, COUNT(*) AS total FROM escalations
       WHERE clinic_id = ? AND created_at >= ? AND created_at < ?
       GROUP BY motivo ORDER BY total DESC`,
    )
    .all(clinicId, start, endExclusive) as MotivoCount[];

  const procedimentosMaisPedidos = db
    .prepare(
      `SELECT procedimento, COUNT(*) AS total FROM leads
       WHERE clinic_id = ? AND created_at >= ? AND created_at < ? AND procedimento IS NOT NULL
       GROUP BY procedimento ORDER BY total DESC LIMIT 5`,
    )
    .all(clinicId, start, endExclusive) as ProcedimentoCount[];

  return {
    totalConversas,
    totalLeads,
    totalEscalacoes,
    conversasEscaladas,
    escalacoesPorMotivo,
    procedimentosMaisPedidos,
  };
}
